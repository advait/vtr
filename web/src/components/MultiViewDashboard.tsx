import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CoordinatorInfo, SessionInfo } from "./CoordinatorTree";
import { Badge } from "./ui/Badge";
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
};

const statusVariants: Record<
  SessionInfo["status"],
  { label: string; variant: "default" | "green" | "red" | "yellow" }
> = {
  running: { label: "live", variant: "green" },
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
    case "idle":
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
  onSelect,
}: {
  session: SessionInfo;
  sessionKey: string;
  active: boolean;
  onSelect: (sessionKey: string, session: SessionInfo) => void;
}) {
  const streamName = session.status === "running" ? sessionKey : null;
  const { state, setEventHandler } = useVtrStream(streamName, { includeRawOutput: false });
  const [screen, setScreen] = useState<ScreenState | null>(null);
  const latestUpdate = useRef<SubscribeEvent | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setScreen(null);
  }, [streamName]);

  const applyPending = useCallback(() => {
    const pending = latestUpdate.current;
    latestUpdate.current = null;
    rafRef.current = null;
    const screenUpdate = pending?.screen_update;
    if (!screenUpdate) {
      return;
    }
    setScreen((prev) => applyScreenUpdate(prev, screenUpdate));
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
        latestUpdate.current = event;
        if (!rafRef.current) {
          rafRef.current = window.requestAnimationFrame(applyPending);
        }
      }
      if (event.session_exited) {
        setScreen(null);
      }
    });
  }, [applyPending, setEventHandler]);

  const status = statusVariants[session.status] ?? statusVariants.unknown;

  return (
    <button
      type="button"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border border-tn-border bg-tn-panel",
        "text-left transition-colors hover:border-tn-accent",
        active && "border-tn-accent ring-1 ring-tn-accent",
      )}
      onClick={() => onSelect(sessionKey, session)}
    >
      <div className="flex items-center justify-between border-b border-tn-border px-2 py-1">
        <span className="truncate text-xs font-semibold text-tn-text">{session.name}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="relative flex h-32 items-center justify-center bg-tn-bg-alt px-2 py-2">
        {screen ? (
          <div
            className="h-full w-full overflow-hidden"
            style={{
              "--terminal-font-size": "8px",
              "--cell-h": 1.2,
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
    </button>
  );
}

export function MultiViewDashboard({
  coordinators,
  activeSession,
  onSelect,
}: MultiViewDashboardProps) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return coordinators;
    }

    const statusFilters = new Set<SessionInfo["status"]>();
    const coordTerms: string[] = [];
    const textTerms: string[] = [];

    for (const term of query.split(/\s+/)) {
      if (!term) continue;
      const [key, rawValue] = term.split(":", 2);
      if (rawValue && (key === "status" || key === "state")) {
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

  if (coordinators.length === 0) {
    return <div className="px-4 py-6 text-sm text-tn-muted">No coordinators available.</div>;
  }

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
        <div className="text-xs text-tn-text-dim">
          Use status:running, status:exited, status:idle or plain text for coordinator/session.
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coord.sessions.map((session) => {
                const key = sessionKey(coord.name, session);
                return (
                  <SessionThumbnail
                    key={key}
                    session={session}
                    sessionKey={key}
                    active={activeSession === key}
                    onSelect={onSelect}
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
