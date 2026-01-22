import { z } from "zod";
import { defaultThemeId, getTheme } from "./theme";

export type TerminalRenderer = "dom" | "canvas";

export const preferencesKey = "vtr.preferences";
const legacyThemeKey = "vtr.theme";
const legacyShowClosedKey = "showClosedSessions";
const legacyRendererKey = "terminalRenderer";

const PreferencesSchema = z
  .object({
    version: z.literal(1).default(1),
    themeId: z.string().default(defaultThemeId),
    showClosedSessions: z.boolean().default(false),
    terminalRenderer: z.enum(["dom", "canvas"]).default("dom"),
    autoResize: z.boolean().default(false),
  })
  .passthrough();

export type Preferences = z.infer<typeof PreferencesSchema>;

const defaultPreferences: Preferences = PreferencesSchema.parse({});

function normalizeThemeId(value: string | undefined) {
  return getTheme(value ?? defaultThemeId).id;
}

function parsePreferences(value: unknown): Preferences {
  const result = PreferencesSchema.safeParse(value);
  if (!result.success) {
    return { ...defaultPreferences };
  }
  const parsed = result.data;
  return {
    ...defaultPreferences,
    ...parsed,
    themeId: normalizeThemeId(parsed.themeId),
  };
}

function readLegacyPreferences(): Partial<Preferences> {
  if (typeof window === "undefined") {
    return {};
  }
  const legacy: Partial<Preferences> = {};
  try {
    const themeId = window.localStorage.getItem(legacyThemeKey);
    if (themeId) {
      legacy.themeId = themeId;
    }
  } catch {}
  try {
    legacy.showClosedSessions = window.localStorage.getItem(legacyShowClosedKey) === "true";
  } catch {}
  try {
    const renderer = window.localStorage.getItem(legacyRendererKey);
    if (renderer) {
      legacy.terminalRenderer = renderer as TerminalRenderer;
    }
  } catch {}
  return legacy;
}

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }
  let raw: unknown;
  try {
    const stored = window.localStorage.getItem(preferencesKey);
    if (stored) {
      raw = JSON.parse(stored);
    }
  } catch {
    raw = undefined;
  }

  if (raw !== undefined) {
    return parsePreferences(raw);
  }

  const legacy = readLegacyPreferences();
  const next = parsePreferences(legacy);
  storePreferences(next);
  return next;
}

export function storePreferences(prefs: Preferences) {
  if (typeof window === "undefined") {
    return;
  }
  const normalized = parsePreferences(prefs);
  try {
    window.localStorage.setItem(preferencesKey, JSON.stringify(normalized));
  } catch {}
}

export function updatePreferences(update: Partial<Preferences>) {
  const current = loadPreferences();
  const next = parsePreferences({ ...current, ...update, version: 1 });
  storePreferences(next);
  return next;
}
