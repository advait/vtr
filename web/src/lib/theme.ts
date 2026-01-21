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
  {
    id: "dracula",
    label: "Dracula",
    scheme: "dark",
    colors: {
      bg: "#282a36",
      bgAlt: "#21222c",
      panel: "#2b2d3a",
      panel2: "#343746",
      border: "#44475a",
      text: "#f8f8f2",
      textDim: "#c1c2cf",
      muted: "#6272a4",
      accent: "#bd93f9",
      cyan: "#8be9fd",
      green: "#50fa7b",
      orange: "#ffb86c",
      red: "#ff5555",
      purple: "#bd93f9",
      yellow: "#f1fa8c",
    },
  },
  {
    id: "monokai",
    label: "Monokai",
    scheme: "dark",
    colors: {
      bg: "#272822",
      bgAlt: "#1f201b",
      panel: "#2d2e27",
      panel2: "#3a3b32",
      border: "#49483e",
      text: "#f8f8f2",
      textDim: "#cfcfc2",
      muted: "#75715e",
      accent: "#a6e22e",
      cyan: "#66d9ef",
      green: "#a6e22e",
      orange: "#fd971f",
      red: "#f92672",
      purple: "#ae81ff",
      yellow: "#e6db74",
    },
  },
  {
    id: "darcula",
    label: "Darcula",
    scheme: "dark",
    colors: {
      bg: "#2b2b2b",
      bgAlt: "#1f1f1f",
      panel: "#323232",
      panel2: "#3a3a3a",
      border: "#4e4e4e",
      text: "#a9b7c6",
      textDim: "#8a8a8a",
      muted: "#606366",
      accent: "#6897bb",
      cyan: "#4fb0c6",
      green: "#6a8759",
      orange: "#cc7832",
      red: "#bc3f3c",
      purple: "#9876aa",
      yellow: "#bbb529",
    },
  },
  {
    id: "one-dark",
    label: "One Dark",
    scheme: "dark",
    colors: {
      bg: "#282c34",
      bgAlt: "#21252b",
      panel: "#2c313c",
      panel2: "#3a3f4b",
      border: "#4b5263",
      text: "#abb2bf",
      textDim: "#8b93a7",
      muted: "#5c6370",
      accent: "#61afef",
      cyan: "#56b6c2",
      green: "#98c379",
      orange: "#d19a66",
      red: "#e06c75",
      purple: "#c678dd",
      yellow: "#e5c07b",
    },
  },
  {
    id: "gruvbox-dark",
    label: "Gruvbox Dark",
    scheme: "dark",
    colors: {
      bg: "#282828",
      bgAlt: "#1d2021",
      panel: "#32302f",
      panel2: "#3c3836",
      border: "#504945",
      text: "#ebdbb2",
      textDim: "#d5c4a1",
      muted: "#928374",
      accent: "#d79921",
      cyan: "#689d6a",
      green: "#98971a",
      orange: "#d65d0e",
      red: "#cc241d",
      purple: "#b16286",
      yellow: "#d79921",
    },
  },
  {
    id: "solarized-dark",
    label: "Solarized Dark",
    scheme: "dark",
    colors: {
      bg: "#002b36",
      bgAlt: "#073642",
      panel: "#073642",
      panel2: "#0b3a45",
      border: "#586e75",
      text: "#839496",
      textDim: "#93a1a1",
      muted: "#586e75",
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
