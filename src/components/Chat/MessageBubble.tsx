import { useState } from "react";
import { motion } from "framer-motion";
import Avatar from "../common/Avatar";
import { useAppStore } from "../../store/appStore";
import type { Message } from "../../types";

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const { user, ai } = useAppStore();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

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
