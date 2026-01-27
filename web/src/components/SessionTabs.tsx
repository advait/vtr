import { Plus } from "lucide-react";
import { type MouseEvent, type TouchEvent, useMemo, useRef } from "react";
import { cn } from "../lib/utils";
import { displaySessionName } from "../lib/session";
import type { CoordinatorInfo, SessionInfo } from "./CoordinatorTree";

export type SessionTab = {
  key: string;
  coordinator: string;
  session: SessionInfo;
};

type SessionTabsProps = {
  sessions: SessionTab[];
  coordinators?: CoordinatorInfo[];
  activeSession: string | null;
  onSelect: (sessionKey: string, session: SessionInfo) => void;
  onClose: (sessionKey: string, session: SessionInfo) => void;
  onContextMenu: (
    event: MouseEvent<HTMLDivElement>,
    sessionKey: string,
    session: SessionInfo,
  ) => void;
  onContextMenuAt?: (
    coords: { x: number; y: number },
    sessionKey: string,
    session: SessionInfo,
  ) => void;
  onCreate?: (coordinator?: string) => void;
  isFocused?: boolean;
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
  coordinators = [],
  activeSession,
  onSelect,
  onClose,
  onContextMenu,
  onContextMenuAt,
  onCreate,
  isFocused = false,
}: SessionTabsProps) {
  const availableCoordinators = useMemo(
    () => coordinators.filter((coord) => coord.name.trim().length > 0),
    [coordinators],
  );
  const grouped = useMemo(() => {
    const next: Array<{ coordinator: string; tabs: SessionTab[] }> = [];
    for (const tab of sessions) {
      const last = next[next.length - 1];
      if (last && last.coordinator === tab.coordinator) {
        last.tabs.push(tab);
      } else {
        next.push({ coordinator: tab.coordinator, tabs: [tab] });
      }
    }
    return next;
  }, [sessions]);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (
    event: TouchEvent<HTMLDivElement>,
    sessionKey: string,
    session: SessionInfo,
  ) => {
    if (!onContextMenuAt) {
      return;
    }
    if (event.touches.length !== 1) {
      return;
    }
    const { clientX, clientY } = event.touches[0];
    clearLongPress();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onContextMenuAt({ x: clientX, y: clientY }, sessionKey, session);
    }, 500);
  };

  const handleTouchEnd = () => {
    clearLongPress();
  };

  const handleTouchMove = () => {
    clearLongPress();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-t-lg border border-b-0 bg-tn-panel px-2 pt-2",
        isFocused ? "border-tn-accent" : "border-tn-border",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-2 py-1 text-xs text-tn-text-dim">
            <span className="px-1">No sessions yet.</span>
            {availableCoordinators.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {availableCoordinators.map((coord) => (
                  <div
                    key={coord.name}
                    className="flex items-center gap-1 rounded-full border border-tn-border bg-tn-panel px-2 py-1"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-tn-text-dim">
                      {coord.name}
                    </span>
                    {onCreate && (
                      <button
                        type="button"
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                          "bg-tn-panel text-tn-text",
                          "hover:bg-tn-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
                        )}
                        onClick={() => onCreate(coord.name)}
                        aria-label={`New session in ${coord.name}`}
                        title={`New session in ${coord.name}`}
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="px-1 text-[11px] text-tn-muted">No coordinators available.</span>
            )}
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.coordinator} className="flex shrink-0 items-center gap-2">
              <span className="rounded-full px-2 py-1 text-[10px] uppercase tracking-wide text-tn-text-dim">
                {group.coordinator}
              </span>
              {group.tabs.map(({ key, session }) => {
                const isActive = activeSession === key;
                const label = displaySessionName(session.name);
                const title = label;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    title={title}
                    className={cn(
                      "group flex shrink-0 items-center gap-2 rounded-t-md rounded-b-none border border-b-0 px-3 py-2 text-xs transition-colors",
                      "cursor-pointer border-tn-border bg-tn-panel text-tn-text",
                      "hover:border-tn-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
                      isActive && "border-tn-accent bg-tn-panel-2",
                      session.status === "exited" && "text-tn-muted",
                    )}
                    onClick={(event) => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        event.preventDefault();
                        return;
                      }
                      onSelect(key, session);
                    }}
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
                    onTouchStart={(event) => handleTouchStart(event, key, session)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onTouchCancel={handleTouchEnd}
                  >
                    <span className={cn("h-2 w-2 rounded-full", statusDot(session))} />
                    <span className="max-w-[8rem] truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {onCreate && sessions.length > 0 && (
          <button
            type="button"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm",
              "bg-tn-panel text-tn-text",
              "hover:bg-tn-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tn-accent",
            )}
            onClick={() => onCreate()}
            aria-label="New session"
            title="New session"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
