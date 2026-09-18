/** @type {import('tailwindcss').Config} */
import preset from "./tailwind.preset.cjs";

// Farben, Schriften, Radien und Bewegung kommen aus dem IntegrationBuddy Design-System
// (tailwind.preset.cjs, Kopie aus Design-System/tokens/). Keine eigene Palette mehr.
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  corePlugins: {
    // ib.css bringt seine eigene Grundlage mit (box-sizing, body, Buttons, Eingabefelder).
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
