/**
 * Lösungsanleitungen: erkennt in einer Antwort des Assistenten die nummerierten Schritte,
 * damit die App sie als abhakbare Anleitung zeigt, und baut daraus den Text für ein Ticket.
 * Arbeitet auf dem Markdown-Rohtext; gerendert wird weiter über renderMarkdown().
 */
import type { ChatSource, GuideState, GuideStepStatus } from "../types";

export interface GuideStep {
  text: string;   // erste Zeile des Schritts (Markdown)
  detail: string; // eingerückte Folgezeilen, z. B. Unterpunkte (Markdown)
}

export interface ParsedGuide {
  intro: string;
  steps: GuideStep[];
  outro: string;
}

// „1. …“ / „1) …“ ganz links oder mit einem Leerzeichen, sowie „**Schritt 1:** …“
const NUMBERED = /^ ?(\d+)[.)]\s+(.+)$/;
const SCHRITT = /^ ?\**\s*Schritt\s+(\d+)\s*[:.)]?\s*\**\s*[:.)-]?\s*(.+)$/i;
const INDENTED = /^(\s{2,}|\t)\S/;
const HINT = /schritt|anleitung|lösung|loesung|vorgehen|gehen sie|prüfen sie|pruefen sie|führen sie|klicken sie|öffnen sie/i;

function matchStep(line: string): string | null {
  const m = line.match(SCHRITT) ?? line.match(NUMBERED);
  return m ? m[2].trim() : null;
}

/** Liefert die Anleitung oder null, wenn die Antwort keine Schrittfolge ist. */
export function parseGuide(raw: string): ParsedGuide | null {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const start = lines.findIndex((l) => matchStep(l) !== null);
  if (start < 0) return null;

  const steps: GuideStep[] = [];
  let i = start;
  while (i < lines.length) {
    const first = matchStep(lines[i]);
    if (first === null) break;
    const detail: string[] = [];
    i++;
    while (i < lines.length) {
      const line = lines[i];
      if (INDENTED.test(line)) { detail.push(line.replace(/^(\s{2,4}|\t)/, "")); i++; continue; }
      if (!line.trim()) {
        // Leerzeile gehört dazu, wenn danach der nächste Schritt oder eine Einrückung folgt
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && (matchStep(lines[j]) !== null || INDENTED.test(lines[j]))) { i = j; continue; }
      }
      break;
    }
    steps.push({ text: first, detail: detail.join("\n").trim() });
  }

  // Kurze Aufzählungen (z. B. „zwei Gründe“) sind keine Anleitung
  if (steps.length < 2 || (steps.length < 3 && !HINT.test(raw))) return null;

  return {
    intro: lines.slice(0, start).join("\n").trim(),
    steps,
    outro: lines.slice(i).join("\n").trim(),
  };
}

export function emptyGuideState(count: number): GuideState {
  return { status: Array<GuideStepStatus>(count).fill("open"), note: "" };
}

/** Status passend zur aktuellen Schrittzahl (falls sich die Antwort geändert hat). */
export function normalizeGuideState(state: GuideState | undefined, count: number): GuideState {
  if (!state) return emptyGuideState(count);
  const status = Array.from({ length: count }, (_, k) => state.status[k] ?? "open");
  return { status, note: state.note ?? "" };
}

/** Markdown in schlichten Text für das Ticket. */
export function plainText(md: string): string {
  return md
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/^\s*[-*•]\s+/gm, "- ")
    .trim();
}

const stampFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

interface TicketInput {
  question: string | null;
  guide: ParsedGuide;
  state: GuideState;
  sources: ChatSource[];
  answeredAt: Date;
}

export function ticketSubject(question: string | null): string {
  const q = (question ?? "").replace(/\s+/g, " ").trim();
  if (!q) return "Problem nach Lösungsanleitung nicht behoben";
  return q.length > 90 ? `${q.slice(0, 87)}…` : q;
}

/** Ticket-Text: Problem, Bearbeitungsstand je Schritt, Hinweis des Nutzers, Fundstellen. */
export function buildTicketText({ question, guide, state, sources, answeredAt }: TicketInput): string {
  const done = state.status.filter((s) => s === "done").length;
  const failedAt = state.status.indexOf("failed");
  const lastDone = state.status.lastIndexOf("done");
  const out: string[] = [];

  out.push(`Betreff: ${ticketSubject(question)}`, "");
  out.push("PROBLEM", question?.trim() || "(keine Frage erfasst)", "");

  out.push(`BEARBEITUNGSSTAND (Lösungsanleitung von IntegrationBuddy vom ${stampFmt.format(answeredAt)})`);
  let summary = `${done} von ${guide.steps.length} Schritten erledigt.`;
  if (failedAt >= 0) summary += ` Nicht weitergekommen bei Schritt ${failedAt + 1}.`;
  else if (done < guide.steps.length) summary += lastDone >= 0 ? ` Zuletzt erledigt: Schritt ${lastDone + 1}.` : " Noch kein Schritt erledigt.";
  out.push(summary, "");

  guide.steps.forEach((step, k) => {
    const s = state.status[k] ?? "open";
    const mark = s === "done" ? "[x]" : s === "failed" ? "[!]" : "[ ]";
    const label = s === "done" ? "erledigt, hat funktioniert" : s === "failed" ? "hier komme ich nicht weiter" : "nicht durchgeführt";
    out.push(`${mark} ${k + 1}. ${plainText(step.text)} (${label})`);
    if (step.detail) plainText(step.detail).split("\n").forEach((l) => out.push(`      ${l}`));
  });

  if (state.note.trim()) {
    out.push("", "BEOBACHTUNG / FEHLERMELDUNG", state.note.trim());
  }

  const refs = sourceLines(sources);
  if (refs.length) {
    out.push("", "KONTEXT AUS DER WISSENSDATENBANK", ...refs);
  }
  const hints = [guide.intro, guide.outro].map((t) => plainText(t)).filter(Boolean);
  if (hints.length) {
    out.push("", "HINWEISE AUS DER ANTWORT", ...hints);
  }

  return out.join("\n");
}

function sourceLines(list: ChatSource[]): string[] {
  const map = new Map<string, { title: string; pages: number[]; sections: string[] }>();
  for (const s of list) {
    const key = s.file.replace(/\.md$/, "");
    const g = map.get(key) ?? { title: (s.title && s.title.trim()) || key, pages: [], sections: [] };
    if (s.page && !g.pages.includes(s.page)) g.pages.push(s.page);
    if (s.section && !g.sections.includes(s.section)) g.sections.push(s.section);
    map.set(key, g);
  }
  return [...map.values()].map((g) => {
    let line = `- ${g.title}`;
    if (g.pages.length) line += `, S. ${g.pages.sort((a, b) => a - b).join(", ")}`;
    if (g.sections.length) line += ` (Abschnitt: ${g.sections.join("; ")})`;
    return line;
  });
}
