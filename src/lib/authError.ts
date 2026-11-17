import type { AuthReason } from "../types";

/**
 * Der Chat-Workflow antwortet bei ungültigem Token mit HTTP 401 und
 * { success:false, error, code: "expired" | "invalid" | "missing" }.
 * Im Tauri-Pfad kommt das als Fehlertext "Server-Fehler 401: {…}" an,
 * im Browser-Pfad als gleich aufgebauter Fehler aus useWebhook.
 */
export class AuthRequiredError extends Error {
  reason: AuthReason;
  constructor(reason: AuthReason, message?: string) {
    super(message ?? "Anmeldung erforderlich");
    this.name = "AuthRequiredError";
    this.reason = reason;
  }
}

export function toAuthError(err: unknown): AuthRequiredError | null {
  if (err instanceof AuthRequiredError) return err;
  const text = err instanceof Error ? err.message : String(err ?? "");
  // Prüft der n8n-Webhook das Token selbst (Authentication: JWT Auth), lehnt er mit 403 ab
  // ("Authorization data is wrong!"). Das ist ebenfalls ein Fall für eine neue Anmeldung.
  if (/Server-Fehler 403\b|HTTP 403\b/.test(text) && /authori[sz]ation|jwt|token/i.test(text)) {
    return new AuthRequiredError("invalid");
  }
  if (!/Server-Fehler 401\b|HTTP 401\b/.test(text)) return null;

  let reason: AuthReason = "invalid";
  const jsonStart = text.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(text.slice(jsonStart)) as { code?: string };
      if (body.code === "expired" || body.code === "missing" || body.code === "invalid") {
        reason = body.code;
      }
    } catch {
      // kein JSON im Fehlertext
    }
  }
  return new AuthRequiredError(reason);
}

/** Verständlicher Text für Verbindungs- und Serverfehler in der Nachrichtenliste. */
export function describeError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err ?? "");
  if (/Verbindungsfehler|Failed to fetch|NetworkError|timed out|Zeitüberschreitung/i.test(text)) {
    return "Der Assistent ist gerade nicht erreichbar. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.";
  }
  const m = text.match(/Server-Fehler (\d{3})/);
  if (m) {
    const code = m[1];
    if (code === "429") return "Zu viele Anfragen in kurzer Zeit. Bitte warten Sie einen Moment.";
    if (code.startsWith("5")) return "Der Assistent hat mit einem Fehler geantwortet. Bitte versuchen Sie es in Kürze erneut.";
  }
  return text || "Unbekannter Fehler.";
}
