import { isTauri, invokeCommand } from "./tauri";

/**
 * Bilder aus /original/<datei> werden nur mit gültigem Token ausgeliefert.
 * Ein <img src> kann keinen Authorization-Header setzen, deshalb laden wir die
 * Datei per Rust (Tauri) oder fetch (Browser) und zeigen sie als Data-URL an.
 * Der Cache lebt nur im Speicher; Bilddaten landen nie in localStorage.
 */
const cache = new Map<string, Promise<string>>();

export function loadProtectedImage(url: string, token: string | null): Promise<string> {
  const key = `${url}|${token ? token.slice(-12) : ""}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const task = (async () => {
    if (isTauri()) {
      return invokeCommand<string>("fetch_image_as_base64", { url, authToken: token });
    }
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Server-Fehler ${res.status}`);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
      reader.readAsDataURL(blob);
    });
  })();

  // Fehlversuche nicht dauerhaft merken, sonst bleibt ein Bild nach Neu-Anmeldung kaputt.
  task.catch(() => cache.delete(key));
  cache.set(key, task);
  return task;
}

export function clearImageCache(): void {
  cache.clear();
}
