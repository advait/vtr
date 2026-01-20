import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScreenState, Selection } from "../lib/terminal";
import { TerminalGrid } from "./TerminalGrid";
import { cn } from "../lib/utils";

export type TerminalViewProps = {
  screen: ScreenState | null;
  status: string;
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
  onResize,
  onSendKey,
  onSendText,
  onPaste
}: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [cellSize, setCellSize] = useState<CellSize>({ width: 8, height: 18 });
  const [selection, setSelection] = useState<Selection | null>(null);
  const selectingRef = useRef(false);
  const selectionStartRef = useRef<Selection | null>(null);

  useLayoutEffect(() => {
    setCellSize(measureCell(measureRef.current));
  }, []);

  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => {
        setCellSize(measureCell(measureRef.current));
      });
    }
  }, []);

  const padding = 12;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || !cellSize.width || !cellSize.height) {
        return;
      }
      const innerWidth = Math.max(0, rect.width - padding * 2);
      const innerHeight = Math.max(0, rect.height - padding * 2);
      const cols = Math.max(1, Math.floor(innerWidth / cellSize.width));
      const rows = Math.max(1, Math.floor(innerHeight / cellSize.height));
      onResize(cols, rows);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [cellSize.height, cellSize.width, onResize, padding]);

  const cursorStyle = useMemo(() => {
    if (!screen) {
      return null;
    }
    return {
      width: `${cellSize.width}px`,
      height: `${cellSize.height}px`,
      transform: `translate(${padding + screen.cursorX * cellSize.width}px, ${padding + screen.cursorY * cellSize.height}px)`
    };
  }, [cellSize.height, cellSize.width, padding, screen]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!screen || !containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const col = clamp(
      Math.floor((event.clientX - rect.left - padding) / cellSize.width),
      0,
      screen.cols - 1
    );
    const row = clamp(
      Math.floor((event.clientY - rect.top - padding) / cellSize.height),
      0,
      screen.rows - 1
    );
    selectingRef.current = true;
    const next = { start: { row, col }, end: { row, col } };
    selectionStartRef.current = next;
    setSelection(next);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!screen || !selectingRef.current || !containerRef.current || !selectionStartRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const col = clamp(
      Math.floor((event.clientX - rect.left - padding) / cellSize.width),
      0,
      screen.cols - 1
    );
    const row = clamp(
      Math.floor((event.clientY - rect.top - padding) / cellSize.height),
      0,
      screen.rows - 1
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
        const modifier = event.ctrlKey
          ? "ctrl"
          : event.altKey
            ? "alt"
            : "meta";
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
        ref={measureRef}
        className="absolute -left-[9999px] -top-[9999px] font-mono text-sm"
      >
        M
      </span>
      <div
        ref={containerRef}
        className={cn(
          "relative h-full w-full rounded-lg border border-tn-border bg-tn-bg-alt",
          "shadow-panel"
        )}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            padding: `${padding}px`,
            lineHeight: `${cellSize.height}px`,
            fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
          }}
        >
          <div
            className="relative h-full w-full"
            tabIndex={0}
            role="textbox"
            aria-label="terminal"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
          >
            {!screen && (
              <div className="flex h-full items-center justify-center text-sm text-tn-muted">
                {status === "reconnecting" ? "Reconnecting..." : "Connecting..."}
              </div>
            )}
            {screen && (
              <TerminalGrid rows={screen.rowsData} selection={selection} />
            )}
            {screen && cursorStyle && (
              <div
                className="terminal-cursor"
                style={{
                  ...cursorStyle,
                  background: "var(--tn-text)",
                  mixBlendMode: "difference"
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
