import { useAppStore } from "../store/appStore";
import { isTauri, invokeCommand } from "../lib/tauri";
import { AuthRequiredError, toAuthError } from "../lib/authError";
import type {
  WebhookPayload,
  WebhookResponseShape,
  SendMessageResult,
  ChatSource,
  ChatAttachment,
} from "../types";

// ── Response parsing ──────────────────────────────────────────────────────────

function cleanSources(list: unknown): ChatSource[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out = list
    .filter((s): s is ChatSource => Boolean(s) && typeof s === "object" && typeof (s as ChatSource).file === "string")
    .map((s) => ({
      file: s.file,
      title: s.title ?? null,
      page: typeof s.page === "number" ? s.page : s.page ? Number(s.page) : null,
      section: s.section ?? null,
      similarity: typeof s.similarity === "number" ? s.similarity : null,
    }));
  return out.length ? out : undefined;
}

function cleanAttachments(list: unknown): ChatAttachment[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out = list
    .filter((a): a is ChatAttachment => Boolean(a) && typeof a === "object" && typeof (a as ChatAttachment).url === "string")
    .filter((a) => /^https:\/\//.test(a.url) && (a.type ?? "image") === "image")
    .map((a) => ({
      type: "image" as const,
      file: a.file,
      title: a.title ?? null,
      mime: a.mime ?? null,
      url: a.url,
      thumb_url: a.thumb_url && /^https:\/\//.test(a.thumb_url) ? a.thumb_url : null,
    }));
  return out.length ? out : undefined;
}

export function parseResponse(raw: string): SendMessageResult {
  if (!raw || !raw.trim()) {
    return { text: "Keine Antwort erhalten." };
  }

  try {
    const parsed = JSON.parse(raw) as WebhookResponseShape | WebhookResponseShape[] | unknown;
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;

    if (obj && typeof obj === "object") {
      const candidate = obj as WebhookResponseShape;

      if (candidate.success === false && candidate.code && ["expired", "invalid", "missing"].includes(candidate.code)) {
        throw new AuthRequiredError(candidate.code as "expired" | "invalid" | "missing", candidate.error);
      }

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
        text: typeof text === "string" ? text : JSON.stringify(text),
        sources:        cleanSources(candidate.sources),
        attachments:    cleanAttachments(candidate.attachments),
        skillOutput:    candidate.skillOutput,
        skillAction:    candidate.skillAction,
        collectedData:  candidate.collectedData,
        buttons:        candidate.buttons,
        selectOptions:  candidate.selectOptions,
        dateChannelOptions: candidate.dateChannelOptions,
      };
    }
  } catch (e) {
    if (e instanceof AuthRequiredError) throw e;
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
    authToken,
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
    if (!authToken) {
      throw new AuthRequiredError("missing");
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

    try {
      if (isTauri()) {
        // ── Tauri path: HTTP request goes through Rust backend ──────────────
        rawResponse = await invokeCommand<string>("send_message_to_webhook", {
          url:       webhookUrl,
          payload,
          authToken,
        });
      } else {
        // ── Browser dev-mode fallback ────────────────────────────────────────
        const res = await fetch(webhookUrl, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body:    JSON.stringify(payload),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`Server-Fehler ${res.status}: ${text}`);
        }
        rawResponse = text;
      }
    } catch (err) {
      const auth = toAuthError(err);
      if (auth) throw auth;
      throw err;
    }

    return parseResponse(rawResponse);
  };

  // Session serverseitig löschen — Fehler sind nicht kritisch
  const deleteSessionOnServer = async (id: string): Promise<void> => {
    if (!deleteUrl) return;
    const payload = { session_id: id };
    try {
      if (isTauri()) {
        await invokeCommand("delete_session_on_server", { url: deleteUrl, payload });
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
