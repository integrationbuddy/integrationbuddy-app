import { useMemo, useState } from "react";
import Icon from "../common/Icon";
import TicketDialog from "./TicketDialog";
import { renderMarkdown } from "../../lib/markdown";
import { buildTicketText, normalizeGuideState, type ParsedGuide } from "../../lib/guide";
import { requestTicketSummary, ticketSummaryUrl } from "../../lib/ticketSummary";
import { useAppStore } from "../../store/appStore";
import type { ChatSource, GuideState, GuideStepStatus } from "../../types";

interface SolutionGuideProps {
  messageId: string;
  guide: ParsedGuide;
  state: GuideState | undefined;
  question: string | null;
  sources: ChatSource[];
  answeredAt: Date;
}

/** Lösungsanleitung als abhakbare Schritte; der Stand fließt in den Ticket-Text. */
export default function SolutionGuide({ messageId, guide, state: stored, question, sources, answeredAt }: SolutionGuideProps) {
  const updateMessage = useAppStore((s) => s.updateMessage);
  const webhookUrl = useAppStore((s) => s.webhookUrl);
  const authToken = useAppStore((s) => s.authToken);
  const [ticketOpen, setTicketOpen] = useState(false);
  const state = normalizeGuideState(stored, guide.steps.length);

  const introHtml = useMemo(() => (guide.intro ? renderMarkdown(guide.intro) : ""), [guide.intro]);
  const outroHtml = useMemo(() => (guide.outro ? renderMarkdown(guide.outro) : ""), [guide.outro]);
  const stepHtml = useMemo(
    () => guide.steps.map((s) => ({ text: renderMarkdown(s.text), detail: s.detail ? renderMarkdown(s.detail) : "" })),
    [guide.steps],
  );

  const done = state.status.filter((s) => s === "done").length;
  const failedAt = state.status.indexOf("failed");
  const allDone = done === guide.steps.length;
  const current = state.status.findIndex((s) => s !== "done"); // erster offener oder hängender Schritt
  const pct = Math.round((done / guide.steps.length) * 100);

  const save = (next: GuideState) => updateMessage(messageId, { guide: next });

  const setStep = (k: number, value: GuideStepStatus) => {
    // Es gibt höchstens einen Schritt, an dem es hängt
    const status = state.status.map((s, j) => (j === k ? value : value === "failed" && s === "failed" ? "open" : s));
    save({ ...state, status });
  };

  const toggleDone = (k: number) => setStep(k, state.status[k] === "done" ? "open" : "done");
  const toggleFailed = (k: number) => setStep(k, state.status[k] === "failed" ? "open" : "failed");

  const ticketText = buildTicketText({ question, guide, state, sources, answeredAt });
  const summarize = ticketSummaryUrl(webhookUrl) && authToken
    ? async () => (await requestTicketSummary({ webhookUrl, authToken, question, guide, state, sources, answeredAt })).text
    : null;

  return (
    <div className="chat__a chat__a--wide guide">
      {introHtml && <div className="guide__intro" dangerouslySetInnerHTML={{ __html: introHtml }} />}

      <div className="guide__card" role="group" aria-label="Lösungsanleitung">
        <div className="guide__head">
          <span className="guide__label"><Icon name="book" /> Anleitung</span>
          <span className="guide__count">{done} von {guide.steps.length} erledigt</span>
        </div>
        <div className="progress-bar" aria-hidden="true">
          <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
        </div>

        <ol className="guide__steps">
          {guide.steps.map((_, k) => {
            const s = state.status[k];
            const isCurrent = k === current && s !== "failed";
            return (
              <li key={k} className={`guide__step is-${s}${isCurrent ? " is-current" : ""}`}>
                <label className="guide__check">
                  <input
                    type="checkbox"
                    checked={s === "done"}
                    onChange={() => toggleDone(k)}
                    aria-label={`Schritt ${k + 1} erledigt`}
                  />
                  <span className="guide__num">{k + 1}</span>
                </label>
                <div className="guide__content">
                  <div className="guide__text" dangerouslySetInnerHTML={{ __html: stepHtml[k].text }} />
                  {stepHtml[k].detail && <div className="guide__detail" dangerouslySetInnerHTML={{ __html: stepHtml[k].detail }} />}
                  {s === "failed" && (
                    <div className="guide__stuck">
                      <span className="badge badge--warning">Hier komme ich nicht weiter</span>
                      <textarea
                        className="input guide__note"
                        rows={2}
                        placeholder="Was ist passiert? Zum Beispiel die genaue Fehlermeldung."
                        value={state.note}
                        onChange={(e) => save({ ...state, note: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                {s !== "done" && (
                  <button
                    type="button"
                    className={`btn btn--quiet btn--sm guide__flag${s === "failed" ? " is-on" : ""}`}
                    onClick={() => toggleFailed(k)}
                    title={s === "failed" ? "Markierung entfernen" : "An diesem Schritt komme ich nicht weiter"}
                  >
                    <Icon name="alert" />
                    {s === "failed" ? "Markiert" : "Hänge hier"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="guide__foot">
          {allDone ? (
            <span className="guide__status guide__status--ok"><Icon name="check" /> Alle Schritte erledigt. Ist das Problem behoben, oben „Problem gelöst“ wählen.</span>
          ) : failedAt >= 0 ? (
            <span className="guide__status guide__status--warn"><Icon name="alert" /> Hängt bei Schritt {failedAt + 1}. Der Stand geht vollständig ins Ticket.</span>
          ) : (
            <span className="guide__status">Haken Sie erledigte Schritte ab. Kommen Sie nicht weiter, markieren Sie den Schritt.</span>
          )}
          <button type="button" className={`btn ${failedAt >= 0 ? "btn--primary" : "btn--ghost"} btn--sm`} onClick={() => setTicketOpen(true)}>
            <Icon name="doc" />
            Ticket vorbereiten
          </button>
        </div>
      </div>

      {outroHtml && <div className="guide__outro" dangerouslySetInnerHTML={{ __html: outroHtml }} />}

      <TicketDialog
        open={ticketOpen}
        fallbackText={ticketText}
        summarize={summarize}
        onClose={() => setTicketOpen(false)}
      />
    </div>
  );
}
