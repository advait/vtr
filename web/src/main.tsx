import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/jetbrains-mono/latin.css";
import "./styles.css";
import App from "./App";
import { loadPreferences } from "./lib/preferences";
import { applyTheme, getTheme } from "./lib/theme";

const nerdFontRegularUrl = new URL(
  "./assets/fonts/jetbrains-mono-nerd/JetBrainsMonoNerdFont-Regular.ttf",
  import.meta.url,
).href;

function preloadFont(href: string, type: string) {
  if (typeof document === "undefined") {
    return;
  }
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.type = type;
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

preloadFont(nerdFontRegularUrl, "font/ttf");

applyTheme(getTheme(loadPreferences().themeId));

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
