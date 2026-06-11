import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// ─── Brand colour: Saffron Fire ───────────────────────────────────────────────
// Inspired by Lamborghini Arancio Midas, McLaren Papaya, BMW M Performance Orange,
// Brembo caliper amber and Porsche GT3 RS caliper orange.
// NOT generic "tech blue" — uniquely automotive, warm, energetic.
// Pairs with near-black (#09080A) for maximum premium contrast.
const P = {
  DEFAULT:  "#F97316",   // Saffron Fire — primary
  light:    "#FB923C",   // lighter, hover states
  dark:     "#C2410C",   // darker, active / pressed
  glow:     "rgba(249, 115, 22, 0.35)",
  subtle:   "rgba(249, 115, 22, 0.10)",
};

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ─────────────────────────────────────────────────────
        background: "#09080A",            // warm near-black (not cold #050508)
        surface: {
          DEFAULT: "#0E0C0E",
          elevated: "#141214",
          card:    "#191619",
        },
        accent: {
          DEFAULT: "#1E1A1E",
          light:   "#2A242A",
          dark:    "#120F12",
        },
        // ── Primary: Saffron Fire ────────────────────────────────────────────
        primary: P,
        // ── Gold stays for awards/stars ──────────────────────────────────────
        gold: {
          DEFAULT: "#ffd700",
          light:   "#ffe44d",
          dark:    "#b89900",
          glow:    "rgba(255, 215, 0, 0.4)",
          subtle:  "rgba(255, 215, 0, 0.1)",
        },
        // ── Semantic ─────────────────────────────────────────────────────────
        success:  "#22C55E",
        warning:  "#FBBF24",
        danger:   "#EF4444",
        // ── Borders ──────────────────────────────────────────────────────────
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          bright:  "rgba(255,255,255,0.14)",
          primary: "rgba(249,115,22,0.30)",
        },
        // ── Text ─────────────────────────────────────────────────────────────
        text: {
          primary:   "#F5F0EB",    // warm white (not cold blue-white)
          secondary: "#8C8480",    // warm mid-grey
          muted:     "#4A4340",    // warm dark grey
        },
      },
      fontFamily: {
        sans:    ["Inter",          "system-ui", "sans-serif"],
        display: ["Orbitron",       "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        // Saffron Fire gradient: amber → deep ember red (like glowing brake disc)
        "gradient-primary":  "linear-gradient(135deg, #F97316 0%, #DC2626 100%)",
        "gradient-gold":     "linear-gradient(135deg, #ffd700 0%, #F97316 100%)",
        "gradient-dark":     "linear-gradient(135deg, #09080A 0%, #0E0C0E 50%, #1E1A1E 100%)",
        "grid-lines":
          "linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)",
        "noise": "url('/noise.svg')",
      },
      backgroundSize: {
        "grid-sm": "20px 20px",
        "grid-md": "40px 40px",
        "grid-lg": "80px 80px",
      },
      boxShadow: {
        "glow-primary":  "0 0 20px rgba(249,115,22,0.45), 0 0 60px rgba(249,115,22,0.18)",
        "glow-gold":     "0 0 20px rgba(255,215,0,0.4),   0 0 60px rgba(255,215,0,0.15)",
        "glow-sm":       "0 0 10px rgba(249,115,22,0.35)",
        "glow-lg":       "0 0 40px rgba(249,115,22,0.55), 0 0 100px rgba(249,115,22,0.22)",
        "inner-glow":    "inset 0 0 20px rgba(249,115,22,0.10)",
        glass:           "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
        "card-hover":    "0 16px 48px rgba(0,0,0,0.65), 0 0 20px rgba(249,115,22,0.22)",
      },
      backdropBlur: {
        xs:   "2px",
        "4xl": "72px",
      },
      animation: {
        "pulse-glow":     "pulse-glow 2s cubic-bezier(0.4,0,0.6,1) infinite",
        float:            "float 6s ease-in-out infinite",
        "float-slow":     "float 10s ease-in-out infinite",
        "scan-line":      "scan-line 3s linear infinite",
        "spin-slow":      "spin 8s linear infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "slide-up":       "slide-up 0.5s ease-out",
        "slide-down":     "slide-down 0.3s ease-out",
        "fade-in":        "fade-in 0.4s ease-out",
        "zoom-in":        "zoom-in 0.3s ease-out",
        typewriter:       "typewriter 3s steps(40) forwards",
        shimmer:          "shimmer 2s linear infinite",
        orbit:            "orbit 20s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1",   boxShadow: "0 0 20px rgba(249,115,22,0.45)" },
          "50%":       { opacity: "0.8", boxShadow: "0 0 40px rgba(249,115,22,0.80)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)"   },
          "50%":       { transform: "translateY(-20px)" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(-100%)"  },
          "100%": { transform: "translateY(100vh)"  },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%"   },
          "50%":       { backgroundPosition: "100% 50%" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)"  },
          "100%": { opacity: "1", transform: "translateY(0)"     },
        },
        "slide-down": {
          "0%":   { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)"     },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "zoom-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)"    },
        },
        typewriter: {
          "0%":   { width: "0"    },
          "100%": { width: "100%" },
        },
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)"  },
        },
        orbit: {
          "0%":   { transform: "rotate(0deg) translateX(150px) rotate(0deg)"     },
          "100%": { transform: "rotate(360deg) translateX(150px) rotate(-360deg)" },
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      spacing: {
        "18":  "4.5rem",
        "88":  "22rem",
        "128": "32rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      zIndex: {
        "60": "60", "70": "70", "80": "80", "90": "90", "100": "100",
      },
    },
  },
  plugins: [animate],
};

export default config;
