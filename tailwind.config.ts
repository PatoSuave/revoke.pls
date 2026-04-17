import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: "#07070b",
          panel: "#0f1020",
          panel2: "#161832",
          border: "#23264a",
          text: "#e8e9ff",
          muted: "#8a8db8",
          pink: "#ff2fb5",
          purple: "#7c3aed",
          cyan: "#22d3ee",
          green: "#00e5a0",
          red: "#ff4d6d",
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
        glow: "0 0 80px -20px rgba(124, 58, 237, 0.55)",
      },
      backgroundImage: {
        "pulse-gradient":
          "linear-gradient(135deg, #7c3aed 0%, #ff2fb5 55%, #22d3ee 100%)",
        "pulse-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(124,58,237,0.35), transparent 60%), radial-gradient(800px 500px at 90% 10%, rgba(255,47,181,0.18), transparent 60%), radial-gradient(800px 500px at 10% 20%, rgba(34,211,238,0.14), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
