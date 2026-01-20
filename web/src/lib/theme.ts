export type ThemeColors = {
  bg: string;
  bgAlt: string;
  panel: string;
  panel2: string;
  border: string;
  text: string;
  textDim: string;
  muted: string;
  accent: string;
  cyan: string;
  green: string;
  orange: string;
  red: string;
  purple: string;
  yellow: string;
};

export type Theme = {
  id: string;
  label: string;
  scheme: "light" | "dark";
  colors: ThemeColors;
};

const cssVarMap: Record<keyof ThemeColors, string> = {
  bg: "--tn-bg",
  bgAlt: "--tn-bg-alt",
  panel: "--tn-panel",
  panel2: "--tn-panel-2",
  border: "--tn-border",
  text: "--tn-text",
  textDim: "--tn-text-dim",
  muted: "--tn-muted",
  accent: "--tn-accent",
  cyan: "--tn-cyan",
  green: "--tn-green",
  orange: "--tn-orange",
  red: "--tn-red",
  purple: "--tn-purple",
  yellow: "--tn-yellow",
};

export const themes: Theme[] = [
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    scheme: "dark",
    colors: {
      bg: "#1a1b26",
      bgAlt: "#16161e",
      panel: "#1f2335",
      panel2: "#24283b",
      border: "#414868",
      text: "#c0caf5",
      textDim: "#9aa5ce",
      muted: "#565f89",
      accent: "#7aa2f7",
      cyan: "#7dcfff",
      green: "#9ece6a",
      orange: "#ff9e64",
      red: "#f7768e",
      purple: "#bb9af7",
      yellow: "#e0af68",
    },
  },
  {
    id: "nord",
    label: "Nord",
    scheme: "dark",
    colors: {
      bg: "#2e3440",
      bgAlt: "#3b4252",
      panel: "#3b4252",
      panel2: "#434c5e",
      border: "#4c566a",
      text: "#eceff4",
      textDim: "#e5e9f0",
      muted: "#81a1c1",
      accent: "#88c0d0",
      cyan: "#8fbcbb",
      green: "#a3be8c",
      orange: "#d08770",
      red: "#bf616a",
      purple: "#b48ead",
      yellow: "#ebcb8b",
    },
  },
  {
    id: "solarized-light",
    label: "Solarized Light",
    scheme: "light",
    colors: {
      bg: "#fdf6e3",
      bgAlt: "#eee8d5",
      panel: "#eee8d5",
      panel2: "#e3ddc6",
      border: "#93a1a1",
      text: "#586e75",
      textDim: "#657b83",
      muted: "#93a1a1",
      accent: "#268bd2",
      cyan: "#2aa198",
      green: "#859900",
      orange: "#cb4b16",
      red: "#dc322f",
      purple: "#6c71c4",
      yellow: "#b58900",
    },
  },
];

const themeMap = new Map(themes.map((theme) => [theme.id, theme]));
export const defaultThemeId = "tokyo-night";
const storageKey = "vtr.theme";

export function getTheme(id?: string | null) {
  if (id) {
    const match = themeMap.get(id);
    if (match) {
      return match;
    }
  }
  return themeMap.get(defaultThemeId) ?? themes[0];
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  (Object.keys(cssVarMap) as Array<keyof ThemeColors>).forEach((key) => {
    root.style.setProperty(cssVarMap[key], theme.colors[key]);
  });
  root.style.colorScheme = theme.scheme;
  root.dataset.theme = theme.id;
}

export function loadThemeId() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function storeThemeId(id: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, id);
  } catch {
    // Ignore persistence errors (private mode or restricted storage).
  }
}
