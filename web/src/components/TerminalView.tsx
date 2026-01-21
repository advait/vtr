import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Cell, ScreenState, Selection } from "../lib/terminal";
import { cellWidth, emptyCell } from "../lib/terminal";
import { cn } from "../lib/utils";
import { TerminalGrid } from "./TerminalGrid";

export type TerminalViewProps = {
  screen: ScreenState | null;
  status: string;
  autoFocus?: boolean;
  focusKey?: string | null;
  renderer?: "dom" | "canvas";
  themeKey?: string;
  onResize: (cols: number, rows: number) => void;
  onSendText: (text: string) => void;
  onSendKey: (key: string) => void;
  onPaste: (text: string) => void;
};

type CellSize = { width: number; height: number };

const ATTR_BOLD = 1 << 0;
const ATTR_ITALIC = 1 << 1;
const ATTR_UNDERLINE = 1 << 2;
const ATTR_FAINT = 1 << 3;
const ATTR_INVERSE = 1 << 5;
const ATTR_INVISIBLE = 1 << 6;
const ATTR_STRIKE = 1 << 7;
const ATTR_OVERLINE = 1 << 8;

const FONT_STACK = "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace";

type ThemeColors = {
  fg: string;
  bg: string;
};

function measureCell(span: HTMLSpanElement | null): CellSize {
  if (!span) {
    return { width: 8, height: 18 };
  }
  const rect = span.getBoundingClientRect();
  return { width: rect.width || 8, height: rect.height || 18 };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function colorFromInt(value: number) {
  const unsigned = value >>> 0;
  const hex = unsigned.toString(16).padStart(6, "0");
  return `#${hex}`;
}

function resolveThemeColors(node: HTMLElement | null): ThemeColors {
  if (typeof window === "undefined") {
    return { fg: "#e5e5e5", bg: "#0f0f0f" };
  }
  const styles = window.getComputedStyle(node ?? document.documentElement);
  const fg = styles.getPropertyValue("--tn-text").trim() || "#e5e5e5";
  const bg = styles.getPropertyValue("--tn-bg-alt").trim() || "#0f0f0f";
  return { fg, bg };
}

function fontForCell(size: number, bold: boolean, italic: boolean) {
  const weight = bold ? "600 " : "";
  const slant = italic ? "italic " : "";
  return `${slant}${weight}${size}px ${FONT_STACK}`;
}

function sameCellStyle(a: Cell, b: Cell) {
  return a.fg === b.fg && a.bg === b.bg && a.attrs === b.attrs;
}

function selectionText(screen: ScreenState, selection: Selection) {
  const normalized = normalizeSelection(selection);
  const lines: string[] = [];
  for (let row = normalized.start.row; row <= normalized.end.row; row += 1) {
    const rowCells = screen.rowsData[row] || [];
    const startCol = row === normalized.start.row ? normalized.start.col : 0;
    const endCol = row === normalized.end.row ? normalized.end.col : rowCells.length - 1;
    let line = "";
    for (let col = startCol; col <= endCol && col < rowCells.length; col += 1) {
      line += rowCells[col]?.char ?? " ";
    }
    lines.push(line.replace(/\s+$/u, ""));
  }
  return lines.join("\n").trimEnd();
}

function normalizeSelection(selection: Selection) {
  const start = selection.start;
  const end = selection.end;
  if (start.row > end.row || (start.row === end.row && start.col > end.col)) {
    return { start: end, end: start };
  }
  return selection;
}

export function TerminalView({
  screen,
  status,
  autoFocus,
  focusKey,
  renderer = "dom",
  themeKey,
  onResize,
  onSendKey,
  onSendText,
  onPaste,
}: TerminalViewProps) {
  const baseFontSize = 14;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseMeasureRef = useRef<HTMLSpanElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [cellSize, setCellSize] = useState<CellSize>({ width: 8, height: 18 });
  const [baseCellSize, setBaseCellSize] = useState<CellSize>({ width: 8, height: 18 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [fontSize, setFontSize] = useState(baseFontSize);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const selectingRef = useRef(false);
  const selectionStartRef = useRef<Selection | null>(null);

  useLayoutEffect(() => {
    setBaseCellSize(measureCell(baseMeasureRef.current));
  }, []);

  useLayoutEffect(() => {
    if (fontSize <= 0) {
      return;
    }
    setCellSize(measureCell(measureRef.current));
  }, [fontSize]);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setCellSize(measureCell(measureRef.current));
        setBaseCellSize(measureCell(baseMeasureRef.current));
      });
    }
  }, []);

  useEffect(() => {
    if (!autoFocus || status === "idle" || status === "exited") {
      return;
    }
    if (focusKey === undefined) {
      return;
    }
    terminalRef.current?.focus({ preventScroll: true });
  }, [autoFocus, focusKey, status]);

  const padding = 12;
  const rendererIsCanvas = renderer === "canvas";

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      setContainerSize((prev) => {
        if (
          prev &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
      const innerWidth = Math.max(0, rect.width - padding * 2);
      const innerHeight = Math.max(0, rect.height - padding * 2);
      const baseWidth = baseCellSize.width || cellSize.width;
      const baseHeight = baseCellSize.height || cellSize.height;
      if (!baseWidth || !baseHeight || innerWidth < baseWidth || innerHeight < baseHeight) {
        return;
      }
      const cols = Math.max(1, Math.floor(innerWidth / baseWidth));
      const rows = Math.max(1, Math.floor(innerHeight / baseHeight));
      onResize(cols, rows);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [
    baseCellSize.height,
    baseCellSize.width,
    cellSize.height,
    cellSize.width,
    onResize,
    screen?.cols,
    screen?.rows,
  ]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const node = containerRef.current;
    const baseWidth = baseCellSize.width || cellSize.width;
    const baseHeight = baseCellSize.height || cellSize.height;
    const compute = () => {
      const rect = node.getBoundingClientRect();
      const innerWidth = Math.max(0, rect.width - padding * 2);
      const innerHeight = Math.max(0, rect.height - padding * 2);
      if (!baseWidth || !baseHeight || innerWidth < baseWidth || innerHeight < baseHeight) {
        return;
      }
      onResize(Math.max(1, Math.floor(innerWidth / baseWidth)), Math.max(1, Math.floor(innerHeight / baseHeight)));
    };
    const frame = window.requestAnimationFrame(compute);
    const timer = window.setTimeout(compute, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [baseCellSize.height, baseCellSize.width, cellSize.height, cellSize.width, onResize]);

  useEffect(() => {
    if (
      !screen ||
      !containerSize ||
      !screen.cols ||
      !screen.rows ||
      !baseCellSize.width ||
      !baseCellSize.height
    ) {
      return;
    }
    const innerWidth = Math.max(0, containerSize.width - padding * 2);
    const innerHeight = Math.max(0, containerSize.height - padding * 2);
    if (!innerWidth || !innerHeight) {
      return;
    }
    const scaleX = innerWidth / (screen.cols * baseCellSize.width);
    const scaleY = innerHeight / (screen.rows * baseCellSize.height);
    const nextFontSize = baseFontSize * Math.min(scaleX, scaleY);
    if (!Number.isFinite(nextFontSize) || nextFontSize <= 0) {
      return;
    }
    const rounded = Math.round(nextFontSize * 10) / 10;
    if (Math.abs(rounded - fontSize) > 0.05) {
      setFontSize(rounded);
    }
  }, [
    baseCellSize.height,
    baseCellSize.width,
    baseFontSize,
    containerSize,
    fontSize,
    screen,
  ]);

  useEffect(() => {
    if (!rendererIsCanvas) {
      return;
    }
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }
    if (!screen || !screen.cols || !screen.rows || !cellSize.width || !cellSize.height) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const gridWidth = Math.max(0, Math.round(screen.cols * cellSize.width));
    const gridHeight = Math.max(0, Math.round(screen.rows * cellSize.height));
    if (!gridWidth || !gridHeight) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(gridWidth * dpr));
    canvas.height = Math.max(1, Math.floor(gridHeight * dpr));
    canvas.style.width = `${gridWidth}px`;
    canvas.style.height = `${gridHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { fg: defaultFg, bg: defaultBg } = resolveThemeColors(container);
    ctx.clearRect(0, 0, gridWidth, gridHeight);
    ctx.fillStyle = defaultBg;
    ctx.fillRect(0, 0, gridWidth, gridHeight);
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const fontSizePx = Math.max(1, Math.round(fontSize * 100) / 100);
    let lastFont = "";
    let lastFill = "";

    for (let row = 0; row < screen.rows; row += 1) {
      const rowCells = screen.rowsData[row] ?? [];
      let col = 0;
      while (col < screen.cols) {
        const cell = rowCells[col] ?? emptyCell();
        const char = cell.char || " ";
        const attrs = cell.attrs ?? 0;
        const isInverse = (attrs & ATTR_INVERSE) !== 0;
        const isInvisible = (attrs & ATTR_INVISIBLE) !== 0;
        const isFaint = (attrs & ATTR_FAINT) !== 0;
        const isBold = (attrs & ATTR_BOLD) !== 0;
        const isItalic = (attrs & ATTR_ITALIC) !== 0;
        const isUnderline = (attrs & ATTR_UNDERLINE) !== 0;
        const isStrike = (attrs & ATTR_STRIKE) !== 0;
        const isOverline = (attrs & ATTR_OVERLINE) !== 0;

        let fg = cell.fg;
        let bg = cell.bg;
        if (isInverse) {
          const swap = fg;
          fg = bg;
          bg = swap;
        }
        if (isInvisible) {
          fg = bg;
        }

        const fgColor = fg === 0 ? defaultFg : colorFromInt(fg);
        const bgColor = bg === 0 ? defaultBg : colorFromInt(bg);

        const charWidth = cellWidth(char);
        let drawCols = 1;
        if (charWidth === 2 && col + 1 < screen.cols) {
          const nextCell = rowCells[col + 1] ?? emptyCell();
          if (nextCell.char === " " && sameCellStyle(cell, nextCell)) {
            drawCols = 2;
          }
        }

        const x = col * cellSize.width;
        const y = row * cellSize.height;
        if (bgColor !== defaultBg) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, cellSize.width * drawCols, cellSize.height);
          lastFill = bgColor;
        }

        if (!isInvisible && char !== " ") {
          const font = fontForCell(fontSizePx, isBold, isItalic);
          if (font !== lastFont) {
            ctx.font = font;
            lastFont = font;
          }
          const nextFill = fgColor;
          if (nextFill !== lastFill) {
            ctx.fillStyle = nextFill;
            lastFill = nextFill;
          }
          ctx.globalAlpha = isFaint ? 0.6 : 1;
          ctx.fillText(char, x, y);
        }

        if (isUnderline || isStrike || isOverline) {
          const nextFill = fgColor;
          if (nextFill !== lastFill) {
            ctx.fillStyle = nextFill;
            lastFill = nextFill;
          }
          ctx.globalAlpha = isFaint ? 0.6 : 1;
          const lineHeight = Math.max(1, Math.round(cellSize.height * 0.08));
          if (isUnderline) {
            ctx.fillRect(x, y + cellSize.height - lineHeight, cellSize.width * drawCols, lineHeight);
          }
          if (isStrike) {
            ctx.fillRect(
              x,
              y + Math.round(cellSize.height * 0.5),
              cellSize.width * drawCols,
              lineHeight,
            );
          }
          if (isOverline) {
            ctx.fillRect(x, y, cellSize.width * drawCols, lineHeight);
          }
        }

        ctx.globalAlpha = 1;
        col += drawCols;
      }
    }
  }, [
    cellSize.height,
    cellSize.width,
    fontSize,
    rendererIsCanvas,
    screen,
    themeKey,
  ]);

  const cursorStyle = useMemo(() => {
    if (!screen) {
      return null;
    }
    const baseX = padding + screen.cursorX * cellSize.width;
    const baseY = padding + screen.cursorY * cellSize.height;
    const underlineHeight = Math.max(2, Math.round(cellSize.height * 0.15));
    const barWidth = Math.max(2, Math.round(cellSize.width * 0.15));
    switch (screen.cursorStyle) {
      case "underline":
        return {
          width: `${cellSize.width}px`,
          height: `${underlineHeight}px`,
          transform: `translate(${baseX}px, ${baseY + cellSize.height - underlineHeight}px)`,
        };
      case "bar":
        return {
          width: `${barWidth}px`,
          height: `${cellSize.height}px`,
          transform: `translate(${baseX}px, ${baseY}px)`,
        };
      default:
        return {
          width: `${cellSize.width}px`,
          height: `${cellSize.height}px`,
          transform: `translate(${baseX}px, ${baseY}px)`,
        };
    }
  }, [cellSize.height, cellSize.width, screen]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!screen || !containerRef.current) {
      return;
    }
    terminalRef.current?.focus({ preventScroll: true });
    event.preventDefault();
    selectingRef.current = false;
    selectionStartRef.current = null;
    if (selection) {
      setSelection(null);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!screen || !selectingRef.current || !containerRef.current || !selectionStartRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const col = clamp(
      Math.floor((event.clientX - rect.left - padding) / cellSize.width),
      0,
      screen.cols - 1,
    );
    const row = clamp(
      Math.floor((event.clientY - rect.top - padding) / cellSize.height),
      0,
      screen.rows - 1,
    );
    setSelection({ start: selectionStartRef.current.start, end: { row, col } });
  };

  const handleMouseUp = () => {
    if (!screen || !selection) {
      selectingRef.current = false;
      return;
    }
    selectingRef.current = false;
    const text = selectionText(screen, selection);
    if (text) {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    selectingRef.current = false;
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text");
    if (text) {
      onPaste(text);
      event.preventDefault();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!screen) {
      return;
    }
    if (event.key === "Escape") {
      setSelection(null);
      onSendKey("escape");
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      onSendKey("enter");
      event.preventDefault();
      return;
    }
    if (event.key === "Backspace") {
      onSendKey("backspace");
      event.preventDefault();
      return;
    }
    if (event.key === "Tab") {
      onSendKey("tab");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowUp") {
      onSendKey("up");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown") {
      onSendKey("down");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowLeft") {
      onSendKey("left");
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight") {
      onSendKey("right");
      event.preventDefault();
      return;
    }
    if (event.key === "PageUp") {
      onSendKey("pageup");
      event.preventDefault();
      return;
    }
    if (event.key === "PageDown") {
      onSendKey("pagedown");
      event.preventDefault();
      return;
    }
    if (event.key === "Home") {
      onSendKey("home");
      event.preventDefault();
      return;
    }
    if (event.key === "End") {
      onSendKey("end");
      event.preventDefault();
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      if (event.key.length === 1) {
        const modifier = event.ctrlKey ? "ctrl" : event.altKey ? "alt" : "meta";
        onSendKey(`${modifier}+${event.key.toLowerCase()}`);
        event.preventDefault();
      }
      return;
    }

    if (event.key.length === 1) {
      onSendText(event.key);
      event.preventDefault();
    }
  };

  return (
    <div className="relative h-full min-h-[360px] md:min-h-[420px] w-full">
      <span
        ref={baseMeasureRef}
        className="absolute -left-[9999px] -top-[9999px] font-mono"
        style={{ fontSize: `${baseFontSize}px` }}
      >
        M
      </span>
      <span
        ref={measureRef}
        className="absolute -left-[9999px] -top-[9999px] font-mono"
        style={{ fontSize: `${fontSize}px` }}
      >
        M
      </span>
      <div
        ref={containerRef}
        className={cn(
          "relative h-full min-h-[360px] md:min-h-[420px] w-full rounded-lg border border-tn-border bg-tn-bg-alt focus-within:border-tn-accent",
          "shadow-panel",
        )}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            padding: `${padding}px`,
            lineHeight: `${cellSize.height}px`,
            fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: `${fontSize}px`,
          }}
        >
          <div
            className="relative h-full w-full terminal-surface focus:outline-none focus-visible:outline-none"
            tabIndex={0}
            role="textbox"
            aria-label="terminal"
            ref={terminalRef}
            onMouseDown={handleMouseDown}
            onSelectStart={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
          >
            {!screen && (
              <div className="flex h-full items-center justify-center text-sm text-tn-muted">
                {status === "exited"
                  ? "Session exited. Select another session."
                  : status === "idle"
                    ? "Select a session to connect."
                    : status === "reconnecting"
                      ? "Reconnecting..."
                      : "Connecting..."}
              </div>
            )}
            {screen && rendererIsCanvas && (
              <canvas
                ref={canvasRef}
                className="absolute left-0 top-0 pointer-events-none"
                aria-hidden="true"
              />
            )}
            {screen && !rendererIsCanvas && (
              <TerminalGrid rows={screen.rowsData} selection={selection} />
            )}
            {screen?.cursorVisible && cursorStyle && (
              <div
                className="terminal-cursor"
                style={{
                  ...cursorStyle,
                  background: "var(--tn-text)",
                  mixBlendMode: "difference",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
