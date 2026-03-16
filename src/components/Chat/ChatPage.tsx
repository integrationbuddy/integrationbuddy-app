import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { useAppStore } from "../../store/appStore";
import { useWebhook } from "../../hooks/useWebhook";

// ── Component ─────────────────────────────────────────────────────────────────

interface ChatPageProps {
  onResetSettings: () => void;
}

export default function ChatPage({ onResetSettings }: ChatPageProps) {
  const { messages, isTyping, addMessage, updateMessage, setTyping, clearMessages } = useAppStore();
  const { sendMessage } = useWebhook();
  const { ai } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Show welcome on first load
  const showWelcome = messages.length === 0;

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    setError("");

    // Add user message
    const userMsgId = addMessage({ role: "user", content: text, status: "sending" });
    updateMessage(userMsgId, { status: "sent" });

    // Indicate AI is thinking
    setTyping(true);

    try {
      const reply = await sendMessage(text);
      setTyping(false);
      addMessage({ role: "assistant", content: reply, status: "sent" });
    } catch (err) {
      setTyping(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      addMessage({
        role:    "assistant",
        content: `Fehler: ${errMsg}`,
        status:  "error",
      });
      setError(errMsg);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: "var(--bg-0)" }}
    >
      {/* Header */}
      <ChatHeader
        isTyping={isTyping}
        messageCount={messages.length}
        onClear={clearMessages}
        onSettings={onResetSettings}
      />

      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 relative"
        style={{ scrollBehavior: "smooth" }}
      >
        {/* Subtle background grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(109,91,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(109,91,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Welcome state */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Animated logo */}
              <motion.div
                className="relative"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(109,91,255,0.15) 0%, rgba(45,212,191,0.1) 100%)",
                    border:     "1px solid rgba(109,91,255,0.25)",
                    boxShadow:  "0 0 40px rgba(109,91,255,0.15)",
                  }}
                >
                  <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
                    <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" stroke="url(#wGrad)" strokeWidth="1.8" fill="none" />
                    <circle cx="24" cy="24" r="5" fill="url(#wGrad)" opacity="0.8" />
                    <path d="M24 14V18M24 30V34M14 24H18M30 24H34" stroke="url(#wGrad)" strokeWidth="1.4" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="wGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8B7DFF" />
                        <stop offset="1" stopColor="#2DD4BF" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </motion.div>

              <div>
                <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--text-1)" }}>
                  Bereit zum Chat mit{" "}
                  <span className="gradient-text">{ai.name}</span>
                </h2>
                <p className="text-sm max-w-xs" style={{ color: "var(--text-2)" }}>
                  Stellen Sie eine Frage oder beginnen Sie ein Gespräch.
                  Alle Anfragen werden sicher über Ihr n8n-System geleitet.
                </p>
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "Was kannst du für mich tun?",
                  "Erkläre unsere Datenstrategie",
                  "Hilf mir bei einem Dokument",
                ].map((s) => (
                  <motion.button
                    key={s}
                    className="px-3 py-1.5 rounded-full text-xs cursor-pointer"
                    style={{
                      background:  "rgba(109,91,255,0.08)",
                      border:      "1px solid rgba(109,91,255,0.2)",
                      color:       "var(--text-2)",
                    }}
                    whileHover={{
                      background: "rgba(109,91,255,0.15)",
                      color:      "var(--text-1)",
                      scale:      1.03,
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={idx === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && <TypingIndicator key="typing" />}
        </AnimatePresence>

        {/* Error toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs self-center"
              style={{
                background:  "rgba(248,113,113,0.1)",
                border:      "1px solid rgba(248,113,113,0.25)",
                color:       "#F87171",
              }}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{   opacity: 0, y: -4 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Verbindungsfehler · Prüfen Sie Ihre n8n-URL
              <button onClick={() => setError("")} className="ml-1 opacity-70 hover:opacity-100">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Gradient fade at top of messages */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top:        "96px",
          height:     "40px",
          background: "linear-gradient(var(--bg-0), transparent)",
          zIndex:     5,
        }}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
