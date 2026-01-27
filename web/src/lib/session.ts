import type { SessionInfo } from "../components/CoordinatorTree";

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

export function sessionKey(coordinator: string, session: SessionInfo): string {
  const id = session.id?.trim();
  if (id) {
    return id;
  }
  const name = session.name?.trim();
  if (!name) {
    return "";
  }
  const coord = coordinator.trim();
  return coord ? `${coord}:${name}` : name;
}

export function matchesSessionKey(coordinator: string, session: SessionInfo, key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) {
    return false;
  }
  if (session.id && session.id === trimmed) {
    return true;
  }
  const name = session.name?.trim();
  const coord = coordinator.trim();
  if (session.id && coord && `${coord}:${session.id}` === trimmed) {
    return true;
  }
  if (name && coord && `${coord}:${name}` === trimmed) {
    return true;
  }
  return false;
}
