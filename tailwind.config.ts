import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf5",
          100: "#d5f9e6",
          200: "#aef1cf",
          300: "#79e2b1",
          400: "#3fcb8e",
          500: "#1aae72",
          600: "#0e8c5a",
          700: "#0b6f49",
          800: "#0c583c",
          900: "#0b4832"
        },
        pitch: {
          DEFAULT: "#0b1f17",
          dark: "#04100c",
          light: "#102921"
        },
        gold: {
          400: "#f5c542",
          500: "#e6b228",
          600: "#c5961a"
        },
        crimson: {
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626"
        }
      },
      fontFamily: {
        display: ["'Bebas Neue'", "Impact", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        "glow-brand": "0 0 40px -10px rgba(63,203,142,0.5), 0 0 16px -4px rgba(26,174,114,0.4)",
        "glow-gold": "0 0 40px -10px rgba(245,197,66,0.55), 0 0 16px -4px rgba(230,178,40,0.4)",
        "glow-red": "0 0 40px -10px rgba(248,113,113,0.5)",
        "card-hover": "0 24px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
      },
      animation: {
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bid-flash": "bidFlash 0.6s ease-out",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.4s linear infinite",
        "ticker": "ticker 28s linear infinite",
        "rise": "rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "spotlight": "spotlight 1.6s ease-in-out infinite alternate"
      },
      keyframes: {
        bidFlash: {
          "0%": { transform: "scale(1)", backgroundColor: "rgba(245,197,66,0.4)" },
          "100%": { transform: "scale(1)", backgroundColor: "transparent" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        spotlight: {
          "0%": { opacity: "0.6", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1.05)" }
        }
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        "stadium": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(26,174,114,0.25), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 0%, rgba(245,197,66,0.15), transparent 60%)"
      }
    }
  },
  plugins: []
};

export default config;
