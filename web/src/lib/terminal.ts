import type { Long } from "protobufjs";
import wcwidth from "wcwidth";
import type {
  GetScreenResponse,
  ScreenCell as ProtoCell,
  ScreenDelta,
  ScreenUpdate,
} from "./proto";

export type Cell = {
  char: string;
  fg: number;
  bg: number;
  attrs: number;
};

export type ScreenState = {
  cols: number;
  rows: number;
  cursorX: number;
  cursorY: number;
  cursorVisible: boolean;
  cursorStyle: CursorStyle;
  frameId: number;
  waitingForKeyframe: boolean;
  rowsData: Cell[][];
};

export type Selection = {
  start: { row: number; col: number };
  end: { row: number; col: number };
};

export type CursorStyle = "block" | "underline" | "bar";

export function emptyCell(): Cell {
  return { char: " ", fg: 0, bg: 0, attrs: 0 };
}

export function screenFromSnapshot(screen?: GetScreenResponse | null): ScreenState | null {
  if (!screen || !screen.cols || !screen.rows) {
    return null;
  }
  const cols = screen.cols;
  const rows = screen.rows;
  const cursorX = screen.cursor_x ?? 0;
  const cursorY = screen.cursor_y ?? 0;
  const cursorStyle = normalizeCursorStyle((screen as { cursor_style?: unknown }).cursor_style);
  const cursorVisible = resolveCursorVisible(
    (screen as { cursor_visible?: unknown }).cursor_visible,
    cursorX,
    cursorY,
    cols,
    rows,
  );
  const rowsData: Cell[][] = [];
  for (let r = 0; r < rows; r += 1) {
    const row = screen.screen_rows?.[r];
    const cells: Cell[] = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = row?.cells?.[c];
      cells.push(protoCellToCell(cell));
    }
    rowsData.push(cells);
  }
  return {
    cols,
    rows,
    cursorX,
    cursorY,
    cursorVisible,
    cursorStyle,
    frameId: 0,
    waitingForKeyframe: false,
    rowsData,
  };
}

export function applyScreenUpdate(
  prev: ScreenState | null,
  update: ScreenUpdate,
): ScreenState | null {
  const hasScreen = !!update.screen;
  if (hasScreen) {
    const next = screenFromSnapshot(update.screen);
    if (!next) {
      return prev;
    }
    next.frameId = toNumber(update.frame_id) ?? prev?.frameId ?? 0;
    next.waitingForKeyframe = false;
    return next;
  }

  if (!update.delta) {
    return prev;
  }

  const delta = update.delta as ScreenDelta;
  if (!prev) {
    return prev;
  }

  const baseFrame = toNumber(update.base_frame_id) ?? 0;
  if (baseFrame && baseFrame !== prev.frameId) {
    return { ...prev, waitingForKeyframe: true };
  }
  if (prev.waitingForKeyframe) {
    return prev;
  }

  const cols = delta.cols ?? prev.cols;
  const rows = delta.rows ?? prev.rows;
  const nextRows: Cell[][] = [];
  for (let r = 0; r < rows; r += 1) {
    if (r < prev.rows) {
      nextRows.push([...prev.rowsData[r]]);
    } else {
      nextRows.push(Array.from({ length: cols }, emptyCell));
    }
  }

  for (const rowDelta of delta.row_deltas ?? []) {
    const rowIndex = rowDelta.row ?? -1;
    if (rowIndex < 0 || rowIndex >= rows) {
      continue;
    }
    const rowData = rowDelta.row_data;
    const rowCells: Cell[] = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = rowData?.cells?.[c];
      rowCells.push(protoCellToCell(cell));
    }
    nextRows[rowIndex] = rowCells;
  }

  const cursorX = delta.cursor_x ?? prev.cursorX;
  const cursorY = delta.cursor_y ?? prev.cursorY;
  const cursorStyle = normalizeCursorStyle(
    (delta as { cursor_style?: unknown }).cursor_style ?? prev.cursorStyle,
  );
  const cursorVisible = resolveCursorVisible(
    (delta as { cursor_visible?: unknown }).cursor_visible,
    cursorX,
    cursorY,
    cols,
    rows,
  );

  return {
    cols,
    rows,
    cursorX,
    cursorY,
    cursorVisible,
    cursorStyle,
    frameId: toNumber(update.frame_id) ?? prev.frameId,
    waitingForKeyframe: false,
    rowsData: nextRows,
  };
}

export function cellWidth(char: string) {
  return Math.max(wcwidth(char), 1);
}

export function protoCellToCell(cell?: ProtoCell): Cell {
  return {
    char: cell?.char ?? " ",
    fg: cell?.fg_color ?? 0,
    bg: cell?.bg_color ?? 0,
    attrs: cell?.attributes ?? 0,
  };
}

function toNumber(value: number | Long | null | undefined) {
  if (value == null) {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  return Number(value);
}

function resolveCursorVisible(
  rawVisible: unknown,
  cursorX: number,
  cursorY: number,
  cols: number,
  rows: number,
) {
  if (typeof rawVisible === "boolean") {
    return rawVisible;
  }
  if (typeof rawVisible === "number") {
    return rawVisible !== 0;
  }
  if (cursorX < 0 || cursorY < 0) {
    return false;
  }
  return cursorX < cols && cursorY < rows;
}

function normalizeCursorStyle(rawStyle: unknown): CursorStyle {
  if (rawStyle === "underline" || rawStyle === "bar" || rawStyle === "block") {
    return rawStyle;
  }
  return "block";
}
