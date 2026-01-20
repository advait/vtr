import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "tn-bg": "var(--tn-bg)",
        "tn-bg-alt": "var(--tn-bg-alt)",
        "tn-panel": "var(--tn-panel)",
        "tn-panel-2": "var(--tn-panel-2)",
        "tn-border": "var(--tn-border)",
        "tn-text": "var(--tn-text)",
        "tn-text-dim": "var(--tn-text-dim)",
        "tn-muted": "var(--tn-muted)",
        "tn-accent": "var(--tn-accent)",
        "tn-cyan": "var(--tn-cyan)",
        "tn-green": "var(--tn-green)",
        "tn-orange": "var(--tn-orange)",
        "tn-red": "var(--tn-red)",
        "tn-purple": "var(--tn-purple)",
        "tn-yellow": "var(--tn-yellow)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px var(--tn-border) inset",
      },
    },
  },
  plugins: [],
} satisfies Config;
