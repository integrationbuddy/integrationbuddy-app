import { useMemo, useState } from "react";
import Icon from "../common/Icon";
import AttachmentPreview from "./AttachmentPreview";
import SkillOutputCard from "./SkillOutputCard";
import SolutionGuide from "./SolutionGuide";
import { renderMarkdown } from "../../lib/markdown";
import { parseGuide } from "../../lib/guide";
import type { ChatAttachment, ChatSource, Message, SelectOption } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

/** Fasst Fundstellen je Dokument zusammen: ein Chip pro Datei, Seiten aufsteigend. */
interface SourceGroup { file: string; title: string; pages: number[]; sections: string[]; }

function groupSources(list: ChatSource[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  for (const s of list) {
    const key = s.file.replace(/\.md$/, "");
    const g = map.get(key) ?? { file: key, title: (s.title && s.title.trim()) || key, pages: [], sections: [] };
    if (s.page && !g.pages.includes(s.page)) g.pages.push(s.page);
    if (s.section && !g.sections.includes(s.section)) g.sections.push(s.section);
    map.set(key, g);
  }
  return [...map.values()].map((g) => ({ ...g, pages: g.pages.sort((a, b) => a - b) }));
}

function sourceLabel(g: SourceGroup): string {
  if (g.pages.length === 0) return g.title;
  return `${g.title}, S. ${g.pages.join(", ")}`;
}

function sourceTitle(g: SourceGroup): string {
  const parts = [g.file, ...g.sections];
  if (g.pages.length) parts.push(`Seite ${g.pages.join(", ")}`);
  return parts.join(" · ");
}

/** Der Assistent hängt oft selbst eine Zeile „Quelle: …“ an; mit Quellenchips ist sie doppelt. */
function stripTrailingSourceLine(text: string, hasSources: boolean): string {
  if (!hasSources) return text;
  return text.replace(/\n+\s*\**\s*Quellen?:[^\n]*\**\s*$/i, "").trimEnd();
}

// ── Auswahl-Bausteine (Skills) ─────────────────────────────────────────────────

function SelectPicker({ options, onConfirm }: { options: SelectOption[]; onConfirm: (label: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="picker" role="group" aria-label="Auswahl">
      {options.map((opt) => (
        <label key={opt.value} className={`picker__opt${selected === opt.value ? " is-checked" : ""}`}>
          <input type="radio" name={`sel-${options[0]?.value}`} checked={selected === opt.value} onChange={() => setSelected(opt.value)} />
          {opt.label}
        </label>
      ))}
      <div className="picker__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!selected}
          onClick={() => {
            const opt = options.find((o) => o.value === selected);
            if (opt) onConfirm(opt.label);
          }}
        >
          Bestätigen
        </button>
      </div>
    </div>
  );
}

function formatDateDE(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function DateChannelPicker({ channelOptions, onConfirm }: { channelOptions: SelectOption[]; onConfirm: (text: string) => void }) {
  const [channel, setChannel] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const canConfirm = Boolean(channel && date);
  return (
    <div className="picker" role="group" aria-label="Kanal und Datum">
      <div className="picker__row">
        {channelOptions.map((opt) => (
          <label key={opt.value} className={`picker__opt${channel === opt.value ? " is-checked" : ""}`}>
            <input type="radio" name="channel-option" checked={channel === opt.value} onChange={() => setChannel(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>
      <input type="date" className="input input--sm" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
      <div className="picker__actions">
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!canConfirm}
          onClick={() => {
            const label = channelOptions.find((o) => o.value === channel)?.label ?? channel;
            onConfirm(`Per ${label} am ${formatDateDE(date)}`);
          }}
        >
          Bestätigen
        </button>
      </div>
    </div>
  );
}

// ── Nachricht ─────────────────────────────────────────────────────────────────

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  fresh: boolean;
  question?: string | null; // Nutzerfrage zu dieser Antwort, für den Ticket-Text
  onReply?: (value: string) => void;
  onOpenAttachment: (attachment: ChatAttachment, src: string | null) => void;
}

export default function MessageItem({ message, isLast, fresh, question = null, onReply, onOpenAttachment }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [replied, setReplied] = useState(false);
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const hasSources = Boolean(message.sources?.length);
  const body = useMemo(() => (isUser || isError ? "" : stripTrailingSourceLine(message.content, hasSources)), [message.content, isUser, isError, hasSources]);
  const guide = useMemo(() => (body ? parseGuide(body) : null), [body]);
  const html = useMemo(() => (body && !guide ? renderMarkdown(body) : ""), [body, guide]);
  const groups = useMemo(() => groupSources(message.sources ?? []), [message.sources]);
  const ts = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);

  const showButtons = !isUser && isLast && !replied && Boolean(message.buttons?.length) && onReply;
  const showSelect = !isUser && isLast && !replied && Boolean(message.selectOptions?.length) && onReply;
  const showDate = !isUser && isLast && !replied && Boolean(message.dateChannelOptions?.length) && onReply;

  const reply = (value: string) => {
    setReplied(true);
    onReply?.(value);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Zwischenablage nicht verfügbar
    }
  };

  // Eine Quelle, für die ein Bildanhang existiert, öffnet die Großansicht direkt.
  const attachmentFor = (g: SourceGroup): ChatAttachment | undefined =>
    message.attachments?.find((a) => a.file === g.file || a.file.replace(/\.[^.]+$/, "") === g.file.replace(/\.[^.]+$/, ""));

  return (
    <div className={`msg ${isUser ? "msg--user" : "msg--assistant"}${fresh ? " chat__new" : ""}`}>
      {isUser ? (
        <p className="chat__q">{message.content}</p>
      ) : isError ? (
        <div className="chat__a chat__a--error">
          <p>{message.content}</p>
        </div>
      ) : guide ? (
        <SolutionGuide
          messageId={message.id}
          guide={guide}
          state={message.guide}
          question={question}
          sources={message.sources ?? []}
          answeredAt={ts}
        />
      ) : (
        <div className="chat__a chat__a--wide" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="msg__row" aria-label="Quellen">
          {groups.map((g) => {
            const att = attachmentFor(g);
            return att ? (
              <button
                key={g.file}
                type="button"
                className="chat__src chat__src--link"
                title={sourceTitle(g)}
                onClick={() => onOpenAttachment(att, null)}
              >
                <Icon name="image" />
                <span>Quelle: {sourceLabel(g)}</span>
              </button>
            ) : (
              <span key={g.file} className="chat__src" title={sourceTitle(g)}>
                <Icon name="doc" />
                <span>Quelle: {sourceLabel(g)}</span>
              </span>
            );
          })}
        </div>
      )}

      {!isUser && message.attachments && message.attachments.length > 0 && (
        <div className="msg__row" aria-label="Anhänge">
          {message.attachments.map((a) => (
            <AttachmentPreview key={a.url} attachment={a} onOpen={onOpenAttachment} />
          ))}
        </div>
      )}

      {!isUser && message.skillOutput && <SkillOutputCard output={message.skillOutput} />}

      {showButtons && (
        <div className="msg__row">
          {message.buttons!.map((b) => (
            <button key={b.value} type="button" className="btn btn--ghost btn--sm" onClick={() => reply(b.value)}>
              {b.label}
            </button>
          ))}
        </div>
      )}
      {showSelect && <SelectPicker options={message.selectOptions!} onConfirm={reply} />}
      {showDate && <DateChannelPicker channelOptions={message.dateChannelOptions!} onConfirm={reply} />}

      <div className="msg__foot">
        <span>{timeFmt.format(ts)}</span>
        {isUser && message.status === "sending" && (
          <span className="msg__status"><Icon name="clock" /> wird gesendet</span>
        )}
        {!isUser && !isError && (
          <button type="button" className="btn btn--quiet btn--sm btn--icon" aria-label="Antwort kopieren" title={copied ? "Kopiert" : "Antwort kopieren"} onClick={copy}>
            <Icon name={copied ? "check" : "copy"} />
          </button>
        )}
      </div>
    </div>
  );
}
