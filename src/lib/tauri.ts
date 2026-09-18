/** Läuft die Oberfläche im Tauri-Fenster (Rust-Backend verfügbar) oder im Browser (Entwicklung)? */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Ruft einen Rust-Command auf. Wirft im Browser einen Fehler, damit Aufrufer den Fallback wählen. */
export async function invokeCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}
