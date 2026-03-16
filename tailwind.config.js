/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        bg: {
          0: "#06080F",
          1: "#0B0E1A",
          2: "#111523",
          3: "#171D2E",
          4: "#1E2540",
        },
        accent: {
          DEFAULT: "#6D5BFF",
          light: "#8B7DFF",
          dim: "rgba(109, 91, 255, 0.15)",
          glow: "rgba(109, 91, 255, 0.35)",
        },
        ai: {
          DEFAULT: "#2DD4BF",
          light: "#5EEAD4",
          dim: "rgba(45, 212, 191, 0.12)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          hover: "rgba(255, 255, 255, 0.12)",
          accent: "rgba(109, 91, 255, 0.3)",
        },
        text: {
          1: "#ECEEF5",
          2: "#8B91A7",
          3: "#4A5066",
        },
        danger: "#F87171",
        success: "#34D399",
      },
      animation: {
        "blob-1": "blobMove1 14s ease-in-out infinite",
        "blob-2": "blobMove2 18s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "dot-1": "dotBounce 1.2s ease-in-out 0s infinite",
        "dot-2": "dotBounce 1.2s ease-in-out 0.2s infinite",
        "dot-3": "dotBounce 1.2s ease-in-out 0.4s infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        blobMove1: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(60px, 40px) scale(1.1)" },
          "66%": { transform: "translate(-30px, 60px) scale(0.9)" },
        },
        blobMove2: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-50px, -30px) scale(0.9)" },
          "66%": { transform: "translate(40px, -50px) scale(1.1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        dotBounce: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "50%": { transform: "translateY(-6px)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      boxShadow: {
        accent: "0 0 30px rgba(109, 91, 255, 0.25)",
        "accent-sm": "0 0 15px rgba(109, 91, 255, 0.2)",
        ai: "0 0 30px rgba(45, 212, 191, 0.2)",
        "ai-sm": "0 0 15px rgba(45, 212, 191, 0.15)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-sm": "0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      backdropBlur: {
        xs: "4px",
      },
    },
  },
  plugins: [],
};
