import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/jetbrains-mono/latin.css";
import "./styles.css";
import App from "./App";
import { loadPreferences } from "./lib/preferences";
import { applyTheme, getTheme } from "./lib/theme";

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
