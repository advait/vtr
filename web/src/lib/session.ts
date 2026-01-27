import type { SessionInfo } from "../components/CoordinatorTree";

export type SessionRef = {
  id: string;
  coordinator: string;
};

export function displaySessionName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }
  const splitIndex = trimmed.indexOf(":");
  if (splitIndex <= 0) {
    return trimmed;
  }
  return trimmed.slice(splitIndex + 1);
}

export function sessionKey(_coordinator: string, session: SessionInfo): string {
  return session.id?.trim() ?? "";
}

export function sessionRefFromSession(coordinator: string, session: SessionInfo): SessionRef {
  return {
    id: session.id?.trim() ?? "",
    coordinator: coordinator.trim(),
  };
}

export function sessionRefEquals(a: SessionRef | null, b: SessionRef | null): boolean {
  if (!a || !b) {
    return false;
  }
  return a.id === b.id && a.coordinator === b.coordinator;
}
