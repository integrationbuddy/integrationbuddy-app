/**
 * Ticket-Zusammenfassung per LLM: schickt den Stand einer Lösungsanleitung an den n8n-Workflow
 * "Ticket-Zusammenfassung" (Webhook ib-ticket-summary, gleiche Anmeldung wie der Chat).
 * Schlägt das fehl, nutzt der Dialog die einfache Fassung aus buildTicketText().
 */
import { isTauri, invokeCommand } from "./tauri";
import type { ChatSource, GuideState } from "../types";
import type { ParsedGuide } from "./guide";

export interface TicketSummary {
  subject: string;
  text: string;
}

/** Leitet die Adresse aus der Chat-Adresse ab, z. B. …/webhook/ib-chat-v2 → …/webhook/ib-ticket-summary. */
export function ticketSummaryUrl(webhookUrl: string): string | null {
  return /\/ib-chat(-v2)?$/.test(webhookUrl) ? webhookUrl.replace(/\/ib-chat(-v2)?$/, "/ib-ticket-summary") : null;
}

interface SummaryInput {
  webhookUrl: string;
  authToken: string | null;
  question: string | null;
  guide: ParsedGuide;
  state: GuideState;
  sources: ChatSource[];
  answeredAt: Date;
}

export async function requestTicketSummary(input: SummaryInput): Promise<TicketSummary> {
  const url = ticketSummaryUrl(input.webhookUrl);
  if (!url || !input.authToken) throw new Error("Zusammenfassung nicht verfügbar");

  const payload = {
    question: input.question ?? "",
    answeredAt: input.answeredAt.toISOString(),
    steps: input.guide.steps.map((s, k) => ({ text: s.text, detail: s.detail, status: input.state.status[k] ?? "open" })),
    note: input.state.note,
    sources: input.sources.map((s) => ({ file: s.file, title: s.title ?? null, page: s.page ?? null, section: s.section ?? null })),
    hints: [input.guide.intro, input.guide.outro].filter(Boolean).join("\n"),
  };

  let raw: string;
  if (isTauri()) {
    raw = await invokeCommand<string>("send_message_to_webhook", { url, payload, authToken: input.authToken });
  } else {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.authToken}` },
      body: JSON.stringify(payload),
    });
    raw = await res.text();
    if (!res.ok) throw new Error(`Server-Fehler ${res.status}: ${raw}`);
  }

  const parsed = JSON.parse(raw) as { success?: boolean; subject?: string; text?: string } | { success?: boolean; subject?: string; text?: string }[];
  const obj = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!obj || obj.success === false || typeof obj.text !== "string" || !obj.text.trim()) {
    throw new Error("Zusammenfassung nicht verfügbar");
  }
  return { subject: obj.subject ?? "", text: obj.text.trim() };
}
