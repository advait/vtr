import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CoordinatorInfo, SessionInfo } from "./CoordinatorTree";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { cn } from "../lib/utils";
import type { SubscribeEvent } from "../lib/proto";
import { applyScreenUpdate, type ScreenState } from "../lib/terminal";
import { useVtrStream } from "../lib/ws";
import { TerminalGrid } from "./TerminalGrid";

export type MultiViewDashboardProps = {
  coordinators: CoordinatorInfo[];
  activeSession: string | null;
  onSelect: (sessionKey: string, session: SessionInfo) => void;
  onBroadcast: (mode: "text" | "key", value: string, targets: string[]) => boolean;
};

type ThumbnailSize = "small" | "medium" | "large";

type ThumbnailConfig = {
  minWidth: number;
  height: number;
  fontSize: number;
  cellHeight: number;
};

const statusVariants: Record<
  SessionInfo["status"],
  { label: string; variant: "default" | "green" | "red" | "yellow" }
> = {
  running: { label: "active", variant: "green" },
  exited: { label: "exited", variant: "red" },
  unknown: { label: "unknown", variant: "default" },
};

function sessionKey(coord: string, session: SessionInfo) {
  return `${coord}:${session.name}`;
}

function normalizeStatusFilter(value: string): SessionInfo["status"] | null {
  switch (value) {
    case "running":
    case "live":
    case "busy":
      return "running";
    case "exited":
    case "dead":
    case "stopped":
      return "exited";
    case "unknown":
    case "stale":
      return "unknown";
    default:
      return null;
  }
}

function SessionThumbnail({
  session,
  sessionKey,
  active,
  selected,
  config,
  onOpen,
  onToggleSelect,
}: {
  session: SessionInfo;
  sessionKey: string;
  active: boolean;
  selected: boolean;
  config: ThumbnailConfig;
  onOpen: (sessionKey: string, session: SessionInfo) => void;
  onToggleSelect: (sessionKey: string) => void;
}) {
  const streamName = session.status === "running" ? sessionKey : null;
  const { state, setEventHandler } = useVtrStream(streamName, { includeRawOutput: false });
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const pendingUpdates = useRef<SubscribeEvent[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setScreen(null);
  }, [streamName]);

  const applyPending = useCallback(() => {
    rafRef.current = null;
    const updates = pendingUpdates.current;
    if (updates.length === 0) {
      return;
    }
    pendingUpdates.current = [];
    setScreen((prev) => {
      let next = prev;
      for (const event of updates) {
        if (event.screen_update) {
          next = applyScreenUpdate(next, event.screen_update);
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setEventHandler((event) => {
      if (event.screen_update) {
        pendingUpdates.current.push(event);
        if (!rafRef.current) {
          rafRef.current = window.requestAnimationFrame(applyPending);
        }
      }
      if (event.session_exited) {
        setScreen(null);
      }
    });
  }, [applyPending, setEventHandler]);

  const status =
    session.status === "running" && session.idle
      ? { label: "idle", variant: "yellow" }
      : statusVariants[session.status] ?? statusVariants.unknown;

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg",
        "border border-tn-border bg-tn-panel text-left transition-colors",
        "hover:border-tn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
        active && "border-tn-accent ring-1 ring-tn-accent",
        selected && "bg-tn-panel-2",
      )}
      onClick={() => onOpen(sessionKey, session)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(sessionKey, session);
        }
      }}
    >
      <button
        type="button"
        className={cn(
          "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded",
          "border border-tn-border bg-tn-panel text-[10px] text-tn-text",
          selected && "border-tn-accent bg-tn-accent text-tn-bg",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelect(sessionKey);
        }}
        aria-pressed={selected}
        aria-label={selected ? "Deselect session" : "Select session"}
      >
        {selected ? "✓" : ""}
      </button>
      <div className="flex items-center justify-between border-b border-tn-border px-2 py-1">
        <span className="truncate text-xs font-semibold text-tn-text">{session.name}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div
        className="relative flex items-center justify-center bg-tn-bg-alt px-2 py-2"
        style={{ height: `${config.height}px` }}
      >
        {screen ? (
          <div
            className="h-full w-full overflow-hidden"
            style={{
              "--terminal-font-size": `${config.fontSize}px`,
              "--cell-h": config.cellHeight,
            } as CSSProperties}
          >
            <TerminalGrid rows={screen.rowsData} selection={null} />
          </div>
        ) : (
          <div className="text-xs text-tn-muted">
            {session.status === "running" && state.status === "connecting"
              ? "Connecting..."
              : session.status === "exited"
                ? "Exited"
                : "Waiting"}
          </div>
        )}
      </div>
    </div>
  );
}

export function MultiViewDashboard({
  coordinators,
  activeSession,
  onSelect,
  onBroadcast,
}: MultiViewDashboardProps) {
  const [filter, setFilter] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(() => new Set());
  const [broadcastMode, setBroadcastMode] = useState<"text" | "key">("text");
  const [broadcastValue, setBroadcastValue] = useState("");
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const thumbnailConfig = useMemo<ThumbnailConfig>(() => {
    switch (thumbnailSize) {
      case "small":
        return { minWidth: 220, height: 96, fontSize: 7, cellHeight: 1.1 };
      case "large":
        return { minWidth: 320, height: 160, fontSize: 9, cellHeight: 1.25 };
      default:
        return { minWidth: 260, height: 128, fontSize: 8, cellHeight: 1.2 };
    }
  }, [thumbnailSize]);

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return coordinators;
    }

    const statusFilters = new Set<SessionInfo["status"]>();
    const activityFilters = new Set<"idle" | "active">();
    const coordTerms: string[] = [];
    const textTerms: string[] = [];

    for (const term of query.split(/\s+/)) {
      if (!term) continue;
      const [key, rawValue] = term.split(":", 2);
      if (rawValue && (key === "status" || key === "state")) {
        if (rawValue === "idle" || rawValue === "inactive") {
          activityFilters.add("idle");
          continue;
        }
        if (rawValue === "active" || rawValue === "busy") {
          activityFilters.add("active");
          continue;
        }
        const normalized = normalizeStatusFilter(rawValue);
        if (normalized) {
          statusFilters.add(normalized);
          continue;
        }
      }
      if (rawValue && (key === "coord" || key === "coordinator")) {
        coordTerms.push(rawValue);
        continue;
      }
      textTerms.push(term);
    }

    return coordinators
      .map((coord) => {
        const coordName = coord.name.toLowerCase();
        if (coordTerms.length > 0 && !coordTerms.every((term) => coordName.includes(term))) {
          return { ...coord, sessions: [] };
        }

        const coordTextMatch =
          textTerms.length > 0 && textTerms.every((term) => coordName.includes(term));

        const sessions = coord.sessions.filter((session) => {
          if (statusFilters.size > 0 && !statusFilters.has(session.status)) {
            return false;
          }
          if (activityFilters.size > 0) {
            if (session.status !== "running") {
              return false;
            }
            const activity = session.idle ? "idle" : "active";
            if (!activityFilters.has(activity)) {
              return false;
            }
          }
          if (coordTextMatch) {
            return true;
          }
          if (textTerms.length === 0) {
            return true;
          }
          const target = `${coord.name}:${session.name}`.toLowerCase();
          return textTerms.every((term) => target.includes(term));
        });

        return { ...coord, sessions };
      })
      .filter((coord) => coord.sessions.length > 0);
  }, [coordinators, filter]);

  const visibleSessionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const coord of filtered) {
      for (const session of coord.sessions) {
        keys.add(sessionKey(coord.name, session));
      }
    }
    return keys;
  }, [filtered]);

  useEffect(() => {
    setSelectedSessions((prev) => {
      const next = new Set<string>();
      for (const key of prev) {
        if (visibleSessionKeys.has(key)) {
          next.add(key);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [visibleSessionKeys]);

  if (coordinators.length === 0) {
    return <div className="px-4 py-6 text-sm text-tn-muted">No coordinators available.</div>;
  }

  const selectedCount = selectedSessions.size;
  const toggleSelect = (key: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleBroadcast = () => {
    const value = broadcastValue.trim();
    if (!value || selectedCount === 0) {
      return;
    }
    const payload = broadcastMode === "key" ? value.toLowerCase() : value;
    const targets = Array.from(selectedSessions);
    const sent = onBroadcast(broadcastMode, payload, targets);
    if (sent) {
      setBroadcastValue("");
    }
  };

  const broadcastDisabled = selectedCount === 0 || !broadcastValue.trim();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-lg border border-tn-border bg-tn-panel p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
          Multi-view filter
        </div>
        <Input
          placeholder="Filter (e.g. status:exited coord:alpha api)"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-tn-text-dim">Thumbnail size</span>
          <div className="flex items-center gap-1 rounded-md border border-tn-border bg-tn-panel-2 p-1">
            <Button
              type="button"
              size="sm"
              variant={thumbnailSize === "small" ? "default" : "ghost"}
              className="h-7 px-3 text-[11px]"
              onClick={() => setThumbnailSize("small")}
            >
              Small
            </Button>
            <Button
              type="button"
              size="sm"
              variant={thumbnailSize === "medium" ? "default" : "ghost"}
              className="h-7 px-3 text-[11px]"
              onClick={() => setThumbnailSize("medium")}
            >
              Medium
            </Button>
            <Button
              type="button"
              size="sm"
              variant={thumbnailSize === "large" ? "default" : "ghost"}
              className="h-7 px-3 text-[11px]"
              onClick={() => setThumbnailSize("large")}
            >
              Large
            </Button>
          </div>
        </div>
        <div className="text-xs text-tn-text-dim">
          Use status:running, status:active, status:idle, status:exited or plain text for
          coordinator/session.
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-tn-border bg-tn-panel p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-tn-muted">
            Broadcast to selection
          </div>
          <div className="text-xs text-tn-text-dim">{selectedCount} selected</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-tn-border bg-tn-panel-2 p-1">
            <Button
              type="button"
              size="sm"
              variant={broadcastMode === "text" ? "default" : "ghost"}
              className="h-7 px-3 text-[11px]"
              onClick={() => setBroadcastMode("text")}
            >
              Text
            </Button>
            <Button
              type="button"
              size="sm"
              variant={broadcastMode === "key" ? "default" : "ghost"}
              className="h-7 px-3 text-[11px]"
              onClick={() => setBroadcastMode("key")}
            >
              Key
            </Button>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder={
                broadcastMode === "key" ? "ctrl+c, alt+f, escape" : "type command to send"
              }
              value={broadcastValue}
              onChange={(event) => setBroadcastValue(event.target.value)}
            />
            <Button type="button" size="sm" onClick={handleBroadcast} disabled={broadcastDisabled}>
              Send
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-tn-border px-4 py-6 text-sm text-tn-muted">
          No sessions match this filter.
        </div>
      ) : (
        filtered.map((coord) => (
        <div key={coord.name} className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-tn-text">{coord.name}</div>
            <div className="text-xs text-tn-text-dim">{coord.sessions.length} sessions</div>
          </div>
          {coord.sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-tn-border px-4 py-6 text-sm text-tn-muted">
              No sessions running.
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${thumbnailConfig.minWidth}px, 1fr))`,
              }}
            >
              {coord.sessions.map((session) => {
                const key = sessionKey(coord.name, session);
                return (
                  <SessionThumbnail
                    key={key}
                    session={session}
                    sessionKey={key}
                    active={activeSession === key}
                    selected={selectedSessions.has(key)}
                    config={thumbnailConfig}
                    onOpen={onSelect}
                    onToggleSelect={toggleSelect}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))
      )}
    </div>
  );
}
