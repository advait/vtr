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
