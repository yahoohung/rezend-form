import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        surface: "#0b1120",
        card: "rgba(255,255,255,0.08)",
        foreground: "#f8fafc",
        accent: "#34d399",
        accentSoft: "#22d3ee"
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glass: "0 24px 60px rgba(15, 23, 42, 0.45)"
      },
      backdropBlur: {
        xs: "2px"
      },
      borderRadius: {
        ios: "28px"
      }
    }
  }
};

export default config;
