import React, { useMemo } from "react";
import { Cell, Selection, cellWidth } from "../lib/terminal";

const ATTR_BOLD = 1 << 0;
const ATTR_ITALIC = 1 << 1;
const ATTR_UNDERLINE = 1 << 2;
const ATTR_FAINT = 1 << 3;
const ATTR_INVERSE = 1 << 5;
const ATTR_INVISIBLE = 1 << 6;
const ATTR_STRIKE = 1 << 7;
const ATTR_OVERLINE = 1 << 8;

export type TerminalGridProps = {
  rows: Cell[][];
  selection: Selection | null;
};

type Run = {
  text: string;
  style: React.CSSProperties;
  key: string;
};

function normalizeSelection(selection: Selection | null) {
  if (!selection) {
    return null;
  }
  const start = selection.start;
  const end = selection.end;
  if (start.row > end.row || (start.row === end.row && start.col > end.col)) {
    return { start: end, end: start };
  }
  return selection;
}

function selectionForRow(selection: Selection | null, row: number) {
  if (!selection) return null;
  const normalized = normalizeSelection(selection);
  if (!normalized) return null;
  const { start, end } = normalized;
  if (row < start.row || row > end.row) return null;
  if (start.row === end.row) {
    return { start: start.col, end: end.col };
  }
  if (row === start.row) {
    return { start: start.col, end: Number.POSITIVE_INFINITY };
  }
  if (row === end.row) {
    return { start: 0, end: end.col };
  }
  return { start: 0, end: Number.POSITIVE_INFINITY };
}

function colorFromInt(value: number) {
  const unsigned = value >>> 0;
  const hex = unsigned.toString(16).padStart(6, "0");
  return `#${hex}`;
}

function styleFromCell(cell: Cell, selected: boolean): React.CSSProperties {
  let fg = cell.fg;
  let bg = cell.bg;
  if (cell.attrs & ATTR_INVERSE) {
    const swap = fg;
    fg = bg;
    bg = swap;
  }
  if (cell.attrs & ATTR_INVISIBLE) {
    fg = bg;
  }
  const isInvisible = (cell.attrs & ATTR_INVISIBLE) !== 0;
  const style: React.CSSProperties = {
    color: fg === 0 ? "var(--tn-text)" : colorFromInt(fg),
    backgroundColor: bg === 0 ? "var(--tn-bg-alt)" : colorFromInt(bg)
  };
  if (isInvisible) {
    style.color = style.backgroundColor;
  }
  if (cell.attrs & ATTR_BOLD) {
    style.fontWeight = 600;
  }
  if (cell.attrs & ATTR_ITALIC) {
    style.fontStyle = "italic";
  }
  const decorations: string[] = [];
  if (cell.attrs & ATTR_UNDERLINE) {
    decorations.push("underline");
  }
  if (cell.attrs & ATTR_STRIKE) {
    decorations.push("line-through");
  }
  if (cell.attrs & ATTR_OVERLINE) {
    decorations.push("overline");
  }
  if (decorations.length > 0) {
    style.textDecoration = decorations.join(" ");
  }
  if (cell.attrs & ATTR_FAINT) {
    style.opacity = 0.6;
  }
  if (selected) {
    style.backgroundColor = "var(--tn-accent)";
    style.color = "var(--tn-bg)";
  }
  return style;
}

function buildRuns(cells: Cell[], selectionRange: { start: number; end: number } | null) {
  const runs: Run[] = [];
  const isSelected = (col: number) => {
    if (!selectionRange) return false;
    return col >= selectionRange.start && col <= selectionRange.end;
  };

  let col = 0;
  while (col < cells.length) {
    const cell = cells[col];
    const selected = isSelected(col);
    const style = styleFromCell(cell, selected);
    const styleKey = `${style.color}-${style.backgroundColor}-${style.fontWeight}-${style.fontStyle}-${style.textDecoration}-${style.opacity}-${selected}`;
    let text = cell.char || " ";

    const width = cellWidth(text);
    if (width === 2 && col + 1 < cells.length) {
      const next = cells[col + 1];
      const nextStyleKey = `${next.fg}-${next.bg}-${next.attrs}`;
      const thisStyleKey = `${cell.fg}-${cell.bg}-${cell.attrs}`;
      if (next.char === " " && nextStyleKey === thisStyleKey) {
        col += 1;
      }
    }

    const last = runs[runs.length - 1];
    if (last && last.key === styleKey) {
      last.text += text;
    } else {
      runs.push({ text, style, key: styleKey });
    }
    col += 1;
  }
  return runs;
}

function TerminalRow({
  row,
  rowIndex,
  selectionRange
}: {
  row: Cell[];
  rowIndex: number;
  selectionRange: { start: number; end: number } | null;
}) {
  const runs = useMemo(
    () => buildRuns(row, selectionRange),
    [row, selectionRange?.start, selectionRange?.end]
  );
  return (
    <div className="terminal-row">
      {runs.map((run, idx) => (
        <span key={`row-${rowIndex}-run-${idx}`} className="terminal-run" style={run.style}>
          {run.text}
        </span>
      ))}
    </div>
  );
}

export function TerminalGrid({ rows, selection }: TerminalGridProps) {
  return (
    <div className="terminal-grid">
      {rows.map((row, rowIndex) => {
        const selectionRange = selectionForRow(selection, rowIndex);
        return (
          <TerminalRow
            key={`row-${rowIndex}`}
            row={row}
            rowIndex={rowIndex}
            selectionRange={selectionRange}
          />
        );
      })}
    </div>
  );
}
