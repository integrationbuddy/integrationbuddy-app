import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

/**
 * Kunden-Builds (vite build --mode <kunde>) ergänzen die CSP in index.html um die Server des Kunden
 * (VITE_CSP_EXTRA, mit Leerzeichen getrennt). Die Tauri-CSP steht in src-tauri/tauri.<kunde>.conf.json.
 */
function cspExtra(extra: string): Plugin {
  return {
    name: "ib-csp-extra",
    transformIndexHtml(html) {
      const hosts = extra.trim();
      if (!hosts) return html;
      return html
        .replace(/connect-src 'self'/, `connect-src 'self' ${hosts}`)
        .replace(/img-src 'self'/, `img-src 'self' ${hosts}`);
    },
  };
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), cspExtra(env.VITE_CSP_EXTRA ?? "")],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
