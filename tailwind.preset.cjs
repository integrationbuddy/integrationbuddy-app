/**
 * IntegrationBuddy Design-System · Tailwind-Preset (für die Windows-App, Tauri + React).
 *
 * Einbinden in tailwind.config.js:
 *   presets: [require("../Design-System/tokens/tailwind.preset.cjs")]
 * und in src/index.css vor @tailwind:
 *   @import "../../Design-System/fonts/fonts.css";
 *   @import "../../Design-System/tokens/tokens.css";
 *
 * Farben zeigen auf die CSS-Variablen aus tokens.css, damit das dunkle Thema
 * ([data-theme="dark"] auf <html>) ohne zweiten Klassensatz funktioniert.
 * Hinweis: Weil die Werte Variablen sind, funktionieren Tailwinds Deckkraft-Suffixe
 * (bg-accent/50) nicht. Dafür gibt es die Tokens accent-soft, accent-tint usw.
 */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        surface: { DEFAULT: "var(--color-surface)", 2: "var(--color-surface-2)" },
        raised: "var(--color-raised)",
        ink: { DEFAULT: "var(--color-ink)", soft: "var(--color-ink-soft)", faint: "var(--color-ink-faint)" },
        line: { DEFAULT: "var(--color-border)", strong: "var(--color-border-strong)" },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          light: "var(--color-accent-light)",
          soft: "var(--color-accent-soft)",
          border: "var(--color-accent-border)",
          tint: "var(--color-accent-tint)",
        },
        plate: {
          DEFAULT: "var(--color-plate)",
          2: "var(--color-plate-2)",
          3: "var(--color-plate-3)",
          4: "var(--color-plate-4)",
          text: "var(--color-on-plate)",
          soft: "var(--color-on-plate-soft)",
          line: "var(--color-plate-border)",
        },
        success: { DEFAULT: "var(--color-success)", soft: "var(--color-success-soft)", border: "var(--color-success-border)" },
        warning: { DEFAULT: "var(--color-warning)", soft: "var(--color-warning-soft)", border: "var(--color-warning-border)" },
        danger: { DEFAULT: "var(--color-danger)", strong: "var(--color-danger-strong)", soft: "var(--color-danger-soft)", border: "var(--color-danger-border)" },
        logo: "#0765C5",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        text: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "Consolas", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.45" }],
        label: ["13px", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        sm: ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.6" }],
        md: ["18px", { lineHeight: "1.6" }],
        h3: ["24px", { lineHeight: "1.25", letterSpacing: "-0.015em" }],
        h2: ["clamp(2rem, 1.4rem + 1.6vw, 2.5rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h1: ["clamp(2.75rem, 1.6rem + 3.6vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        num: ["32px", { lineHeight: "1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "14px",
        pill: "999px",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        edge: "var(--edge)",
        focus: "0 0 0 4px var(--color-focus-ring)",
      },
      spacing: {
        "sp-1": "4px", "sp-2": "8px", "sp-3": "12px", "sp-4": "16px", "sp-5": "24px",
        "sp-6": "32px", "sp-7": "40px", "sp-8": "48px", "sp-9": "64px", "sp-10": "120px",
        control: "48px", "control-sm": "36px", topbar: "64px", sidebar: "264px",
      },
      maxWidth: { wrap: "1312px", measure: "62ch" },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      transitionDuration: { fast: "150ms", base: "180ms", slow: "260ms" },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        dot: { "0%, 100%": { transform: "translateY(0)", opacity: "0.45" }, "50%": { transform: "translateY(-3px)", opacity: "1" } },
        spin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        rise: "rise 420ms cubic-bezier(0.23, 1, 0.32, 1) both",
        dot: "dot 1.1s cubic-bezier(0.77, 0, 0.175, 1) infinite",
        spin: "spin 700ms linear infinite",
      },
    },
  },
};
