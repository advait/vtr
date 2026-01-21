import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { CoordinatorInfo, SessionInfo } from "./CoordinatorTree";
import { Badge } from "./ui/Badge";
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
  if (coordinators.length === 0) {
    return <div className="px-4 py-6 text-sm text-tn-muted">No coordinators available.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {coordinators.map((coord) => (
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
      ))}
    </div>
  );
}
