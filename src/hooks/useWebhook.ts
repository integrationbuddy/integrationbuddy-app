import { useAppStore } from "../store/appStore";
import type {
  WebhookPayload,
  WebhookResponseShape,
  SendMessageResult,
} from "../types";

// ── Tauri detection ───────────────────────────────────────────────────────────

const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window;

// ── Response parsing ──────────────────────────────────────────────────────────

function parseResponse(raw: string): SendMessageResult {
  if (!raw || !raw.trim()) {
    return { text: "Keine Antwort erhalten." };
  }

  try {
    const parsed = JSON.parse(raw) as
      | WebhookResponseShape
      | WebhookResponseShape[]
      | unknown;

    const obj = Array.isArray(parsed) ? parsed[0] : parsed;

    if (obj && typeof obj === "object") {
      const candidate = obj as WebhookResponseShape;

      const text =
        candidate.response ??
        candidate.output ??
        candidate.message ??
        candidate.text ??
        candidate.answer ??
        candidate.result ??
        candidate.content ??
        raw.trim();

      return {
        text,
        skillOutput:    candidate.skillOutput,
        skillAction:    candidate.skillAction,
        collectedData:  candidate.collectedData,
      };
    }
  } catch {
    // Not JSON — return raw text
  }

  return { text: raw.trim() };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWebhook() {
  const {
    webhookUrl,
    user,
    sessionId,
    userId,
    userGroups,
    availableSkills,
    activeSkillSession,
  } = useAppStore();

  // Delete-Endpunkt aus der Chat-URL ableiten
  const deleteUrl = webhookUrl.replace(/\/ib-chat$/, "/delete-session");

  const sendMessage = async (content: string): Promise<SendMessageResult> => {
    if (!webhookUrl) {
      throw new Error("Kein Webhook-URL konfiguriert.");
    }

    // Skill-Kontext einbauen wenn eine Skill-Session aktiv ist
    const skillPayload = activeSkillSession
      ? {
          slug:          activeSkillSession.skillSlug,
          config:        availableSkills.find((s) => s.slug === activeSkillSession.skillSlug)?.config ?? null,
          sessionStatus: activeSkillSession.status,
          collectedData: activeSkillSession.collectedData,
        }
      : undefined;

    const payload: WebhookPayload = {
      message:    content,
      sessionId,
      userName:   `${user.firstName} ${user.lastName}`.trim(),
      timestamp:  new Date().toISOString(),
      userId,
      userGroups,
      ...(skillPayload ? { skill: skillPayload } : {}),
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
        await invoke("delete_session_on_server", { url: deleteUrl, payload });
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
