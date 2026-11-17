/// <reference types="vite/client" />

// Build-Konfiguration je Kunde (.env.<kunde>, siehe .env.example)
interface ImportMetaEnv {
  readonly VITE_PORTAL_AUTH_URL?: string;
  readonly VITE_SOLVED_WEBHOOK_URL?: string;
  readonly VITE_CSP_EXTRA?: string;
  readonly VITE_UPDATER?: "on" | "off";
  readonly VITE_SERVER_HISTORY?: "on" | "off";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
