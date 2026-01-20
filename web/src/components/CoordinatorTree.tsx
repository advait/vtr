import React, { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/Accordion";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

export type SessionInfo = {
  name: string;
  status: "running" | "exited" | "unknown";
  cols: number;
  rows: number;
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
  activeSession: string | null;
  onSelect: (session: {
    name: string;
    status: SessionInfo["status"];
    exitCode?: number;
  }) => void;
};

function statusBadge(status: SessionInfo["status"]) {
  switch (status) {
    case "running":
      return <Badge variant="green">running</Badge>;
    case "exited":
      return <Badge variant="red">exited</Badge>;
    default:
      return <Badge>unknown</Badge>;
  }
}

export function CoordinatorTree({
  coordinators,
  filter,
  activeSession,
  onSelect
}: CoordinatorTreeProps) {
  const normalizedFilter = filter.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedFilter) {
      return coordinators;
    }
    return coordinators
      .map((coord) => {
        const matchedSessions = coord.sessions.filter((session) =>
          `${coord.name}:${session.name}`.toLowerCase().includes(normalizedFilter)
        );
        if (coord.name.toLowerCase().includes(normalizedFilter)) {
          return { ...coord, sessions: coord.sessions };
        }
        return { ...coord, sessions: matchedSessions };
      })
      .filter((coord) => coord.sessions.length > 0);
  }, [coordinators, normalizedFilter]);

  if (filtered.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-tn-muted">
        No sessions match this filter.
      </div>
    );
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
                const sessionKey = `${coord.name}:${session.name}`;
                return (
                  <button
                    key={sessionKey}
                    onClick={() =>
                      onSelect({
                        name: sessionKey,
                        status: session.status,
                        exitCode: session.exitCode
                      })
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg border border-transparent",
                      "bg-tn-panel px-3 py-2 text-left text-sm",
                      "hover:border-tn-border",
                      activeSession === sessionKey && "border-tn-accent"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-tn-text">{session.name}</span>
                      <span className="text-xs text-tn-muted">
                        {session.cols}x{session.rows}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(session.status)}
                    </div>
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
