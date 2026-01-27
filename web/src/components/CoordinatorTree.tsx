import { useMemo } from "react";
import { cn } from "../lib/utils";
import { displaySessionName, sessionKey, sessionRefEquals, sessionRefFromSession, type SessionRef } from "../lib/session";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/Accordion";
import { Badge } from "./ui/Badge";

export type SessionInfo = {
  id: string;
  name: string;
  status: "running" | "closing" | "exited" | "unknown";
  cols: number;
  rows: number;
  idle: boolean;
  order: number;
  exitCode?: number;
};

export type CoordinatorInfo = {
  name: string;
  path: string;
  sessions: SessionInfo[];
};

export type CoordinatorTreeProps = {
  coordinators: CoordinatorInfo[];
  filter: string;
  activeSession: SessionRef | null;
  onSelect: (ref: SessionRef, session: SessionInfo) => void;
};

function statusBadge(session: SessionInfo) {
  if (session.status === "running") {
    return (
      <Badge variant={session.idle ? "yellow" : "green"}>{session.idle ? "idle" : "active"}</Badge>
    );
  }
  if (session.status === "closing") {
    return <Badge variant="yellow">closing</Badge>;
  }
  if (session.status === "exited") {
    return <Badge variant="red">exited</Badge>;
  }
  return <Badge>unknown</Badge>;
}

function orderSessions(sessions: SessionInfo[]) {
  return [...sessions].sort((a, b) => {
    const aName = displaySessionName(a.name);
    const bName = displaySessionName(b.name);
    if (a.order === b.order) {
      return aName.localeCompare(bName);
    }
    if (a.order === 0) {
      return 1;
    }
    if (b.order === 0) {
      return -1;
    }
    return a.order - b.order;
  });
}

export function CoordinatorTree({
  coordinators,
  filter,
  activeSession,
  onSelect,
}: CoordinatorTreeProps) {
  const normalizedFilter = filter.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedFilter) {
      return coordinators;
    }
    return coordinators
      .map((coord) => {
        const matchedSessions = coord.sessions.filter((session) => {
          const displayName = displaySessionName(session.name);
          const target = `${coord.name}:${displayName} ${session.name}`.toLowerCase();
          return target.includes(normalizedFilter);
        });
        if (coord.name.toLowerCase().includes(normalizedFilter)) {
          return { ...coord, sessions: orderSessions(coord.sessions) };
        }
        return { ...coord, sessions: orderSessions(matchedSessions) };
      })
      .filter((coord) => coord.sessions.length > 0);
  }, [coordinators, normalizedFilter]);

  if (filtered.length === 0) {
    return <div className="px-4 py-6 text-sm text-tn-muted">No sessions match this filter.</div>;
  }

  return (
    <Accordion type="multiple" defaultValue={filtered.map((coord) => coord.name)}>
      {filtered.map((coord) => (
        <AccordionItem key={coord.name} value={coord.name}>
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-semibold">{coord.name}</span>
              <Badge className="ml-2">{coord.sessions.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              {coord.sessions.map((session) => {
                const sessionKeyValue = sessionKey(coord.name, session);
                const sessionRef = sessionRefFromSession(coord.name, session);
                return (
                  <button
                    key={sessionKeyValue}
                    type="button"
                    onClick={() => onSelect(sessionRef, session)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-transparent",
                      "bg-tn-panel px-3 py-2 text-left text-sm",
                      "hover:border-tn-border",
                      sessionRefEquals(activeSession, sessionRef) && "border-tn-accent",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-tn-text">{displaySessionName(session.name)}</span>
                      <span className="text-xs text-tn-muted">
                        {session.cols}x{session.rows}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">{statusBadge(session)}</div>
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
