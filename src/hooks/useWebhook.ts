import { useAppStore } from "../store/appStore";
import type { WebhookPayload, WebhookResponseShape } from "../types";

// ── Tauri detection ───────────────────────────────────────────────────────────

const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window;

// ── Response parsing ──────────────────────────────────────────────────────────

function parseResponse(raw: string): string {
  if (!raw || !raw.trim()) return "Keine Antwort erhalten.";

  try {
    const parsed = JSON.parse(raw) as
      | WebhookResponseShape
      | WebhookResponseShape[]
      | unknown;

    const obj = Array.isArray(parsed) ? parsed[0] : parsed;

    if (obj && typeof obj === "object") {
      const candidate = (obj as WebhookResponseShape);
      return (
        candidate.response ??
        candidate.output ??
        candidate.message ??
        candidate.text ??
        candidate.answer ??
        candidate.result ??
        candidate.content ??
        raw
      );
    }
  } catch {
    // Not JSON — return raw text
  }

  return raw.trim();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWebhook() {
  const { webhookUrl, user, sessionId } = useAppStore();

  // Delete-Endpunkt aus der Chat-URL ableiten (z.B. /ib-chat → /delete-session)
  const deleteUrl = webhookUrl.replace(/\/ib-chat$/, "/delete-session");

  const sendMessage = async (content: string): Promise<string> => {
    if (!webhookUrl) {
      throw new Error("Kein Webhook-URL konfiguriert.");
    }

    const payload: WebhookPayload = {
      message:   content,
      sessionId,
      userName:  `${user.firstName} ${user.lastName}`.trim(),
      timestamp: new Date().toISOString(),
    };

    let rawResponse: string;

    if (isTauri()) {
      // ── Tauri path: HTTP request goes through Rust backend ──────────────
      const { invoke } = await import("@tauri-apps/api/core");
      rawResponse = await invoke<string>("send_message_to_webhook", {
        url: webhookUrl,
        payload,
      });
    } else {
      // ── Browser dev-mode fallback ────────────────────────────────────────
      const res = await fetch(webhookUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      rawResponse = await res.text();
    }

    return parseResponse(rawResponse);
  };

  // Session serverseitig löschen — Fehler sind nicht kritisch
  const deleteSessionOnServer = async (id: string): Promise<void> => {
    if (!deleteUrl) return;
    const payload = { session_id: id };
    try {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("send_message_to_webhook", { url: deleteUrl, payload });
      } else {
        await fetch(deleteUrl, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }
    } catch {
      // Lokal löschen wir trotzdem — Server-Fehler nicht nach oben reichen
    }
  };

  return {
    sendMessage,
    deleteSessionOnServer,
    isConfigured: Boolean(webhookUrl),
  };
}
