import { useState } from "react";
import { motion } from "framer-motion";
import Avatar from "../common/Avatar";
import SkillOutputBubble from "./SkillOutputBubble";
import { useAppStore } from "../../store/appStore";
import type { Message, SelectOption } from "../../types";

// ── Single-Select-Auswahl mit Bestätigen-Button ────────────────────────────────

interface SelectOptionsPickerProps {
  options: SelectOption[];
  onConfirm: (label: string) => void;
}

function SelectOptionsPicker({ options, onConfirm }: SelectOptionsPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="flex flex-col gap-1 px-1 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
          style={{
            background: selected === opt.value ? "rgba(109,91,255,0.12)" : "transparent",
          }}
        >
          <input
            type="radio"
            name="select-option"
            checked={selected === opt.value}
            onChange={() => setSelected(opt.value)}
            style={{ accentColor: "var(--accent-light)" }}
          />
          <span style={{ color: "var(--text-1)", fontSize: "0.85rem" }}>{opt.label}</span>
        </label>
      ))}
      <motion.button
        onClick={() => {
          const opt = options.find((o) => o.value === selected);
          if (opt) onConfirm(opt.label);
        }}
        disabled={!selected}
        whileHover={selected ? { scale: 1.02 } : {}}
        whileTap={selected ? { scale: 0.98 } : {}}
        style={{
          marginTop:    6,
          padding:      "7px 0",
          borderRadius: 10,
          border:       "none",
          background:   selected ? "linear-gradient(135deg, #6D5BFF 0%, #4F3FCC 100%)" : "rgba(255,255,255,0.06)",
          color:        selected ? "white" : "var(--text-3)",
          fontSize:     "0.85rem",
          fontWeight:   600,
          cursor:       selected ? "pointer" : "not-allowed",
        }}
      >
        Bestätigen
      </motion.button>
    </div>
  );
}

// ── Kanal + Datum-Auswahl mit Bestätigen-Button ────────────────────────────────

interface DateChannelPickerProps {
  channelOptions: SelectOption[];
  onConfirm: (text: string) => void;
}

function formatDateDE(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function DateChannelPicker({ channelOptions, onConfirm }: DateChannelPickerProps) {
  const [channel, setChannel] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const canConfirm = Boolean(channel && date);

  return (
    <div
      className="flex flex-col gap-2 px-1 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex flex-wrap gap-2 px-1">
        {channelOptions.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ background: channel === opt.value ? "rgba(109,91,255,0.12)" : "transparent" }}
          >
            <input
              type="radio"
              name="channel-option"
              checked={channel === opt.value}
              onChange={() => setChannel(opt.value)}
              style={{ accentColor: "var(--accent-light)" }}
            />
            <span style={{ color: "var(--text-1)", fontSize: "0.85rem" }}>{opt.label}</span>
          </label>
        ))}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-2 py-1.5 rounded-lg"
        style={{
          background: "rgba(255,255,255,0.05)",
          border:     "1px solid rgba(255,255,255,0.1)",
          color:      "var(--text-1)",
          fontSize:   "0.85rem",
          colorScheme: "dark",
        }}
      />
      <motion.button
        onClick={() => {
          if (!canConfirm) return;
          const channelLabel = channelOptions.find((o) => o.value === channel)?.label ?? channel;
          onConfirm(`Per ${channelLabel} am ${formatDateDE(date)}`);
        }}
        disabled={!canConfirm}
        whileHover={canConfirm ? { scale: 1.02 } : {}}
        whileTap={canConfirm ? { scale: 0.98 } : {}}
        style={{
          padding:      "7px 0",
          borderRadius: 10,
          border:       "none",
          background:   canConfirm ? "linear-gradient(135deg, #6D5BFF 0%, #4F3FCC 100%)" : "rgba(255,255,255,0.06)",
          color:        canConfirm ? "white" : "var(--text-3)",
          fontSize:     "0.85rem",
          fontWeight:   600,
          cursor:       canConfirm ? "pointer" : "not-allowed",
        }}
      >
        Bestätigen
      </motion.button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour:   "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Very lightweight markdown-to-HTML converter (no external deps). */
function renderContent(text: string): string {
  return text
    // Code blocks
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links (basic)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^[-•*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isLast:  boolean;
  onButtonClick?: (value: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessageBubble({ message, isLast, onButtonClick }: MessageBubbleProps) {
  const { user, ai } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [buttonsUsed, setButtonsUsed] = useState(false);
  const isUser = message.role === "user";
  // Nur bei der letzten Nachricht anzeigen — verhindert Klicks auf veraltete
  // Ja/Nein-Buttons, nachdem sich der Dialog längst weiterbewegt hat.
  const showButtons = !isUser && isLast && !buttonsUsed && message.buttons && message.buttons.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timestamp = message.timestamp instanceof Date
    ? message.timestamp
    : new Date(message.timestamp);

  return (
    <motion.div
      className={`flex items-end gap-3 group ${isUser ? "flex-row-reverse" : ""}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      {/* Avatar */}
      <Avatar
        src={isUser ? user.avatar : ai.avatar}
        name={isUser ? `${user.firstName} ${user.lastName}` : ai.name}
        size={32}
        variant={isUser ? "user" : "ai"}
      />

      {/* Bubble + meta */}
      <div className={`flex flex-col gap-1 max-w-[72%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        <span
          className="text-xs px-1 font-medium"
          style={{ color: isUser ? "var(--accent-light)" : "var(--ai)" }}
        >
          {isUser ? `${user.firstName} ${user.lastName}`.trim() : ai.name}
        </span>

        {/* Bubble */}
        <div className="relative">
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed msg-content ${
              isUser
                ? "msg-user rounded-br-sm"
                : "msg-ai rounded-bl-sm"
            } ${message.status === "error" ? "border-danger/40" : ""}`}
          >
            {message.status === "error" ? (
              <span style={{ color: "#F87171" }}>{message.content}</span>
            ) : (
              <span
                dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
                style={{ color: "var(--text-1)" }}
              />
            )}
          </div>

          {/* Copy button — appears on hover */}
          <motion.button
            className={`absolute top-1 ${isUser ? "left-1" : "right-1"} w-6 h-6 rounded-md flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity`}
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-3)" }}
            onClick={handleCopy}
            whileHover={{ scale: 1.1, color: "white" }}
            whileTap={{ scale: 0.9 }}
            title="Kopieren"
          >
            {copied ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </motion.button>
        </div>

        {/* Skill-Output (Datei-Download-Karte) */}
        {!isUser && message.skillOutput && (
          <SkillOutputBubble output={message.skillOutput} />
        )}

        {/* Quick-Reply-Buttons (z.B. Ja/Nein-Bestätigungen) */}
        {showButtons && (
          <div className="flex flex-wrap gap-2 px-1">
            {message.buttons!.map((btn) => {
              const normalized = btn.value.trim().toLowerCase();
              const tone =
                normalized === "ja" || normalized === "yes"
                  ? { color: "#34D399", border: "rgba(52,211,153,0.35)", bg: "rgba(52,211,153,0.08)" }
                  : normalized === "nein" || normalized === "no"
                  ? { color: "#F87171", border: "rgba(248,113,113,0.35)", bg: "rgba(248,113,113,0.08)" }
                  : { color: "var(--accent-light)", border: "var(--accent-light)", bg: "rgba(109,91,255,0.1)" };
              return (
                <motion.button
                  key={btn.value}
                  onClick={() => {
                    setButtonsUsed(true);
                    onButtonClick?.(btn.value);
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding:      "6px 16px",
                    borderRadius: 999,
                    border:       `1px solid ${tone.border}`,
                    background:   tone.bg,
                    color:        tone.color,
                    fontSize:     "0.82rem",
                    fontWeight:   600,
                    cursor:       "pointer",
                  }}
                >
                  {btn.label}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Single-Select-Auswahl mit Bestätigen-Button (z.B. Messinstrumente) */}
        {!isUser && isLast && !buttonsUsed && message.selectOptions && message.selectOptions.length > 0 && (
          <SelectOptionsPicker
            options={message.selectOptions}
            onConfirm={(label) => {
              setButtonsUsed(true);
              onButtonClick?.(label);
            }}
          />
        )}

        {/* Kanal + Datum-Auswahl (z.B. Anfragedatum) */}
        {!isUser && isLast && !buttonsUsed && message.dateChannelOptions && message.dateChannelOptions.length > 0 && (
          <DateChannelPicker
            channelOptions={message.dateChannelOptions}
            onConfirm={(text) => {
              setButtonsUsed(true);
              onButtonClick?.(text);
            }}
          />
        )}

        {/* Timestamp */}
        <div
          className={`flex items-center gap-1.5 px-1 ${isUser ? "flex-row-reverse" : ""}`}
          style={{ color: "var(--text-3)", fontSize: "11px" }}
        >
          <span>{formatTime(timestamp)}</span>
          {isUser && message.status === "sent" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {isUser && message.status === "sending" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}
