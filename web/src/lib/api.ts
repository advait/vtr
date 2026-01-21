import type { CoordinatorInfo, SessionInfo } from "../components/CoordinatorTree";

export type SessionListResponse = {
  coordinators: Array<{
    name: string;
    path: string;
    sessions: Array<{
      name: string;
      status: string;
      cols: number;
      rows: number;
      idle?: boolean;
      exit_code?: number;
    }>;
  }>;
};

export type SessionCreateRequest = {
  name: string;
  coordinator?: string;
  command?: string;
  workingDir?: string;
  cols?: number;
  rows?: number;
};

export type SessionCreateResponse = {
  coordinator: string;
  session: {
    name: string;
    status: string;
    cols: number;
    rows: number;
    idle?: boolean;
    exit_code?: number;
  };
};

export type SessionActionRequest = {
  name: string;
  action: "send_key" | "signal" | "remove" | "rename";
  key?: string;
  signal?: string;
  newName?: string;
};

function normalizeSession(session: SessionCreateResponse["session"]): SessionInfo {
  return {
    name: session.name,
    status:
      session.status === "running" || session.status === "exited" ? session.status : "unknown",
    cols: session.cols ?? 0,
    rows: session.rows ?? 0,
    idle: session.idle ?? false,
    exitCode: session.exit_code,
  };
}

export async function fetchSessions(): Promise<CoordinatorInfo[]> {
  const resp = await fetch("/api/sessions");
  if (!resp.ok) {
    throw new Error(`sessions fetch failed: ${resp.status}`);
  }
  const data = (await resp.json()) as SessionListResponse;
  return (data.coordinators || []).map((coord) => {
    const sessions: SessionInfo[] = (coord.sessions || []).map((session) => ({
      name: session.name,
      status:
        session.status === "running" || session.status === "exited" ? session.status : "unknown",
      cols: session.cols ?? 0,
      rows: session.rows ?? 0,
      idle: session.idle ?? false,
      exitCode: session.exit_code,
    }));
    return { name: coord.name, path: coord.path, sessions };
  });
}

export async function createSession(req: SessionCreateRequest) {
  const resp = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: req.name,
      coordinator: req.coordinator,
      command: req.command,
      working_dir: req.workingDir,
      cols: req.cols,
      rows: req.rows,
    }),
  });
  if (!resp.ok) {
    const message = (await resp.text()) || `session create failed: ${resp.status}`;
    throw new Error(message);
  }
  const data = (await resp.json()) as SessionCreateResponse;
  return {
    coordinator: data.coordinator,
    session: normalizeSession(data.session),
  };
}

export async function sendSessionAction(req: SessionActionRequest) {
  const resp = await fetch("/api/sessions/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: req.name,
      action: req.action,
      key: req.key,
      signal: req.signal,
      new_name: req.newName,
    }),
  });
  if (!resp.ok) {
    const message = (await resp.text()) || `session action failed: ${resp.status}`;
    throw new Error(message);
  }
}
