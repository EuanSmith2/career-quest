import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const v = (name: string) => `var(--${name})`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      sm: "550px", // below: single column + bottom tab bar
      md: "897px", // fixed left sidebar
      lg: "1024px", // right rail
    },
    extend: {
      colors: {
        background: v("background"),
        foreground: v("foreground"),
        "muted-foreground": v("muted-foreground"),
        muted: v("muted"),
        border: v("border"),
        "info-bg": v("info-bg"),
        green: { DEFAULT: v("green"), lip: v("green-lip"), soft: v("green-soft") },
        blue: { DEFAULT: v("blue"), lip: v("blue-lip"), soft: v("blue-soft"), border: v("blue-border"), text: v("blue-text") },
        red: { DEFAULT: v("red"), lip: v("red-lip"), soft: v("red-soft") },
        gold: { DEFAULT: v("gold"), lip: v("gold-lip") },
        silver: { DEFAULT: v("silver"), lip: v("silver-lip") },
        bronze: { DEFAULT: v("bronze"), lip: v("bronze-lip") },
        flame: v("flame"),
        disabled: { bg: v("disabled-bg"), fg: v("disabled-fg") },
        arena: {
          DEFAULT: v("arena"),
          deep: v("arena-deep"),
          card: v("arena-card"),
          ink: v("arena-ink"),
          glass: v("arena-glass"),
          line: v("arena-line"),
          muted: v("arena-muted"),
        },
        flash: { correct: v("flash-correct"), wrong: v("flash-wrong") },
        tile: {
          red: v("tile-red"),
          "red-lip": v("tile-red-lip"),
          blue: v("tile-blue"),
          "blue-lip": v("tile-blue-lip"),
          yellow: v("tile-yellow"),
          "yellow-lip": v("tile-yellow-lip"),
          green: v("tile-green"),
          "green-lip": v("tile-green-lip"),
        },
        white: v("white"),
        overlay: v("overlay"),
      },
      fontFamily: {
        sans: ["Nunito", "ui-rounded", "system-ui", "sans-serif"],
        arena: ["Montserrat", "Nunito", "system-ui", "sans-serif"],
      },
      fontSize: {
        title: ["32px", { lineHeight: "40px", fontWeight: "800" }],
        "title-sm": ["28px", { lineHeight: "36px", fontWeight: "800" }],
        section: ["24px", { lineHeight: "32px", fontWeight: "800" }],
        body: ["17px", { lineHeight: "24px" }],
        caption: ["15px", { lineHeight: "20px" }],
      },
      borderRadius: {
        btn: v("radius-btn"),
        card: v("radius-card"),
        tile: v("radius-tile"),
      },
      borderWidth: { lip: v("lip") },
      maxWidth: { app: "600px", landing: "1000px" },
      width: { sidebar: "256px", rail: "360px" },
      transitionTimingFunction: { out: v("ease-out") },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-8px)" },
          "40%, 80%": { transform: "translateX(8px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "33%": { transform: "translate(6px, -10px) rotate(4deg)" },
          "66%": { transform: "translate(-6px, 6px) rotate(-3deg)" },
        },
      },
      animation: {
        shake: "shake 300ms ease-in-out",
        "pulse-ring": "pulse-ring 1.4s var(--ease-out) infinite",
        float: "float 2s ease-in-out infinite",
        drift: "drift 9s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
