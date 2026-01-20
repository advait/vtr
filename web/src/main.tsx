import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/jetbrains-mono/latin.css";
import "./styles.css";
import { applyTheme, getTheme, loadThemeId } from "./lib/theme";
import App from "./App";

applyTheme(getTheme(loadThemeId()));

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
