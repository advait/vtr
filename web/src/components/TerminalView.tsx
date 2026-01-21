import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ScreenState, Selection } from "../lib/terminal";
import { cn } from "../lib/utils";
import { TerminalGrid } from "./TerminalGrid";

export type TerminalViewProps = {
  screen: ScreenState | null;
  status: string;
  autoFocus?: boolean;
  focusKey?: string | null;
  onResize: (cols: number, rows: number) => void;
  onSendText: (text: string) => void;
  onSendKey: (key: string) => void;
  onPaste: (text: string) => void;
};

type CellSize = { width: number; height: number };

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
  onResize,
  onSendKey,
  onSendText,
  onPaste,
}: TerminalViewProps) {
  const baseFontSize = 14;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
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
      if (!baseWidth || !baseHeight) {
        return;
      }
      const cols = screen?.cols ?? Math.max(1, Math.floor(innerWidth / baseWidth));
      const rows = screen?.rows ?? Math.max(1, Math.floor(innerHeight / baseHeight));
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
    <div className="relative h-full w-full">
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
          "relative h-full w-full rounded-lg border border-tn-border bg-tn-bg-alt",
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
            className="relative h-full w-full terminal-surface"
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
            {screen && <TerminalGrid rows={screen.rowsData} selection={selection} />}
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
