import type { SessionInfo } from "../components/CoordinatorTree";

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
    id: string;
    name: string;
    status: string;
    cols: number;
    rows: number;
    idle?: boolean;
    exit_code?: number;
    order?: number;
  };
};

export type SessionActionRequest = {
  id: string;
  name?: string;
  action: "send_key" | "signal" | "close" | "remove" | "rename";
  key?: string;
  signal?: string;
  newName?: string;
};

export type WebInfoResponse = {
  version?: string;
  web?: {
    addr?: string;
    dev?: boolean;
  };
  hub?: {
    name?: string;
    path?: string;
  };
  errors?: {
    hub?: string;
  };
};

function normalizeSession(session: SessionCreateResponse["session"]): SessionInfo {
  return {
    id: session.id,
    name: session.name,
    status:
      session.status === "running" || session.status === "closing" || session.status === "exited"
        ? session.status
        : "unknown",
    cols: session.cols ?? 0,
    rows: session.rows ?? 0,
    idle: session.idle ?? false,
    order: session.order ?? 0,
    exitCode: session.exit_code,
  };
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
      id: req.id,
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

export async function fetchWebInfo() {
  const resp = await fetch("/api/info");
  if (!resp.ok) {
    const message = (await resp.text()) || `hub info failed: ${resp.status}`;
    throw new Error(message);
  }
  return (await resp.json()) as WebInfoResponse;
}
