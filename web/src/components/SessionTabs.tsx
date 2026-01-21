import type { MouseEvent } from "react";
import type { SessionInfo } from "./CoordinatorTree";
import { cn } from "../lib/utils";

export type SessionTab = {
  key: string;
  coordinator: string;
  session: SessionInfo;
};

type SessionTabsProps = {
  sessions: SessionTab[];
  activeSession: string | null;
  onSelect: (sessionKey: string, session: SessionInfo) => void;
  onClose: (sessionKey: string, session: SessionInfo) => void;
  onContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    sessionKey: string,
    session: SessionInfo,
  ) => void;
  onMenuOpen: (
    event: MouseEvent<HTMLButtonElement>,
    sessionKey: string,
    session: SessionInfo,
  ) => void;
  onCreate?: () => void;
};

function statusDot(session: SessionInfo) {
  if (session.status === "exited") {
    return "bg-tn-red";
  }
  if (session.idle) {
    return "bg-tn-yellow";
  }
  return "bg-tn-green";
}

export function SessionTabs({
  sessions,
  activeSession,
  onSelect,
  onClose,
  onContextMenu,
  onMenuOpen,
  onCreate,
}: SessionTabsProps) {
  if (sessions.length === 0 && !onCreate) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-tn-border bg-tn-panel px-2 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {sessions.length === 0 ? (
          <span className="px-3 text-xs text-tn-text-dim">No sessions yet.</span>
        ) : (
          sessions.map(({ key, coordinator, session }) => {
            const isActive = activeSession === key;
            const label = session.name;
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                title={key}
                className={cn(
                  "group flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
                  "cursor-pointer border-tn-border/60 bg-tn-panel text-tn-text",
                  "hover:border-tn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
                  isActive && "border-tn-accent bg-tn-panel-2",
                  session.status === "exited" && "text-tn-muted",
                )}
                onClick={() => onSelect(key, session)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(key, session);
                  }
                }}
                onMouseDown={(event) => {
                  if (event.button === 1) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose(key, session);
                  }
                }}
                onContextMenu={(event) => onContextMenu(event, key, session)}
              >
                <span className={cn("h-2 w-2 rounded-full", statusDot(session))} />
                <span className="max-w-[8rem] truncate">{label}</span>
                <span className="text-[10px] text-tn-text-dim">{coordinator}</span>
                <button
                  type="button"
                  className={cn(
                    "ml-1 rounded px-1 text-tn-text-dim hover:text-tn-text",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(key, session);
                  }}
                  aria-label={`Close ${label}`}
                >
                  x
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded px-1 text-tn-text-dim hover:text-tn-text",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
                  )}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMenuOpen(event, key, session);
                  }}
                  aria-label={`Session actions for ${label}`}
                >
                  ...
                </button>
              </div>
            );
          })
        )}
      </div>
      {onCreate && (
        <button
          type="button"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border text-sm",
            "border-tn-border/60 bg-tn-panel text-tn-text",
            "hover:border-tn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
          )}
          onClick={() => onCreate()}
          aria-label="New session"
          title="New session"
        >
          +
        </button>
      )}
    </div>
  );
}
