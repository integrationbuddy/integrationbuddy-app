import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../common/Icon";

interface TicketDialogProps {
  open: boolean;
  /** Einfache Fassung aus dem Stand der Anleitung; Rückfall, wenn die Zusammenfassung nicht klappt. */
  fallbackText: string;
  /** Lässt den Ticket-Text vom Assistenten formulieren; null = nicht verfügbar. */
  summarize: (() => Promise<string>) | null;
  onClose: () => void;
}

type Phase = "loading" | "ready" | "fallback";

/** Ticket-Text zum Prüfen, Bearbeiten und Kopieren, z. B. in Matrix42. Die App legt selbst kein Ticket an. */
export default function TicketDialog({ open, fallbackText, summarize, onClose }: TicketDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [text, setText] = useState("");
  const run = useRef(0);

  const generate = useCallback(async () => {
    const id = ++run.current;
    setCopied(false);
    if (!summarize) { setText(fallbackText); setPhase("fallback"); return; }
    setPhase("loading");
    try {
      const result = await summarize();
      if (id !== run.current) return;
      setText(result);
      setPhase("ready");
    } catch {
      if (id !== run.current) return;
      setText(fallbackText);
      setPhase("fallback");
    }
  }, [summarize, fallbackText]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); generate(); }
    if (!open && d.open) { run.current++; d.close(); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Zwischenablage nicht verfügbar: Text bleibt markierbar
    }
  };

  return (
    <dialog ref={ref} className="dialog" onCancel={onClose} onClose={onClose} aria-labelledby="ticket-title">
      <div className="dialog__box dialog__box--ticket">
        <h2 className="dialog__title" id="ticket-title">Ticket vorbereiten</h2>
        <p className="dialog__sub">
          Prüfen und ergänzen Sie den Text, dann kopieren Sie ihn in ein neues Ticket.
        </p>

        {phase === "loading" ? (
          <div className="ticket-preview ticket-preview--loading" role="status">
            <span className="btn__spinner" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }} />
            Der Assistent fasst den Bearbeitungsstand zusammen …
          </div>
        ) : (
          <>
            {phase === "fallback" && (
              <p className="ticket-note"><Icon name="alert" /> Die automatische Zusammenfassung ist gerade nicht verfügbar. Angezeigt wird der vollständige Stand der Anleitung.</p>
            )}
            <textarea
              className="ticket-preview ticket-edit"
              value={text}
              onChange={(e) => { setText(e.target.value); setCopied(false); }}
              aria-label="Ticket-Text"
              spellCheck
            />
          </>
        )}

        <div className="dialog__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Schließen</button>
          {summarize && (
            <button type="button" className="btn btn--ghost" onClick={generate} disabled={phase === "loading"}>
              <Icon name="refresh" />
              Neu formulieren
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={copy} disabled={phase === "loading"} autoFocus>
            <Icon name={copied ? "check" : "copy"} />
            {copied ? "Kopiert" : "Text kopieren"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
