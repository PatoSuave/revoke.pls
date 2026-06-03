import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: "rgb(var(--pulse-bg) / <alpha-value>)",
          panel: "rgb(var(--pulse-panel) / <alpha-value>)",
          panel2: "rgb(var(--pulse-panel-2) / <alpha-value>)",
          border: "rgb(var(--pulse-border) / <alpha-value>)",
          text: "rgb(var(--pulse-text) / <alpha-value>)",
          muted: "rgb(var(--pulse-muted) / <alpha-value>)",
          pink: "rgb(var(--pulse-pink) / <alpha-value>)",
          purple: "rgb(var(--pulse-purple) / <alpha-value>)",
          cyan: "rgb(var(--pulse-cyan) / <alpha-value>)",
          green: "rgb(var(--pulse-green) / <alpha-value>)",
          yellow: "rgb(var(--pulse-yellow) / <alpha-value>)",
          red: "rgb(var(--pulse-red) / <alpha-value>)",
          "on-gradient": "rgb(var(--pulse-on-gradient) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 24px 90px -42px rgb(var(--pulse-purple) / 0.55)",
      },
      backgroundImage: {
        "pulse-gradient":
          "linear-gradient(135deg, rgb(var(--pulse-purple)) 0%, rgb(var(--pulse-pink)) 55%, rgb(var(--pulse-cyan)) 100%)",
        "pulse-radial":
          "radial-gradient(1200px 620px at 50% -10%, rgb(var(--pulse-purple) / 0.24), transparent 62%), radial-gradient(760px 520px at 92% 8%, rgb(var(--pulse-pink) / 0.14), transparent 64%), radial-gradient(760px 520px at 8% 16%, rgb(var(--pulse-cyan) / 0.12), transparent 64%)",
      },
    },
  },
  plugins: [],
};

export default config;
