import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const v = (name: string) => `var(--${name})`;

export default {
  darkMode: ["selector", '[data-theme="midnight"]'], // dark: means Midnight
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
        purple: { DEFAULT: v("purple"), lip: v("purple-lip") },
        primary: { DEFAULT: v("primary"), lip: v("primary-lip"), fg: v("primary-fg") },
        correct: { DEFAULT: v("correct"), soft: v("correct-soft"), text: v("correct-text") },
        wrong: { DEFAULT: v("wrong"), soft: v("wrong-soft"), text: v("wrong-text") },
        node: { locked: v("node-locked"), "locked-lip": v("node-locked-lip"), "locked-icon": v("node-locked-icon") },
        boss: { DEFAULT: v("boss"), lip: v("boss-lip") },
        "border-deep": v("border-deep"),
        "muted-icon": v("muted-icon"),
        noise: { 1: v("noise-1"), 2: v("noise-2") },
        link: v("link"),
        "ink-bright": v("ink-bright"),
        "selected-fg": v("selected-fg"),
        white: v("white"),
        overlay: v("overlay"),
      },
      fontFamily: {
        sans: ["Nunito", "ui-rounded", "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"], // one accent word per headline
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"], // fine print + stats lines
        display: ['"Bebas Neue"', '"Archivo Black"', "Nunito", "sans-serif"], // landing jargon noise
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
        "blur-in": {
          from: { opacity: "0", filter: "blur(14px)", transform: "translateY(18px)" },
          to: { opacity: "1", filter: "blur(0)", transform: "translateY(0)" },
        },
        beam: { to: { transform: "rotate(360deg)" } },
        "knob-pulse": {
          "0%": { boxShadow: "0 0 0 0 var(--blue-glow)" },
          "100%": { boxShadow: "0 0 0 10px transparent" },
        },
        "heart-shake": {
          "0%, 100%": { transform: "rotate(0)" },
          "25%": { transform: "rotate(-14deg) scale(1.15)" },
          "75%": { transform: "rotate(14deg) scale(1.15)" },
        },
        marquee: { to: { transform: "translateX(-50%)" } },
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
        "blur-in": "blur-in 0.9s var(--ease-out) both",
        beam: "beam 3s linear infinite",
        "knob-pulse": "knob-pulse 0.6s var(--ease-out)",
        "heart-shake": "heart-shake 0.4s ease-in-out",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
