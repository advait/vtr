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
