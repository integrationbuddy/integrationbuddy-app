import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import Sidebar from "./Sidebar";
import SkillSelector from "./SkillSelector";
import { useAppStore } from "../../store/appStore";
import { useWebhook } from "../../hooks/useWebhook";
import type { ChatSession, MessageRole } from "../../types";

// ── Server session shapes ─────────────────────────────────────────────────────

interface ServerMessage {
  role: string;
  content: string;
  created_at: string;
}

interface ServerSession {
  session_id: string;
  title: string | null;
  created_at: string;
  last_message_at: string | null;
  messages: ServerMessage[] | string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChatPageProps {
  onResetSettings: () => void;
}

export default function ChatPage({ onResetSettings }: ChatPageProps) {
  const {
    messages,
    isTyping,
    addMessage,
    updateMessage,
    setTyping,
    clearMessages,
    sessionId,
    webhookUrl,
    userId,
    replaceWithServerSessions,
    availableSkills,
    activeSkillSession,
    startSkillSession,
    updateSkillSession,
    endSkillSession,
  } = useAppStore();

  const { sendMessage } = useWebhook();
  const { ai } = useAppStore();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [error,       setError]       = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Load sessions from server on mount ────────────────────────────────────
  useEffect(() => {
    if (!webhookUrl || !userId) return;

    const loadUrl = webhookUrl.replace(/\/ib-chat$/, "/ib-load-history");
    if (loadUrl === webhookUrl) return; // URL pattern didn't match

    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    const load = async () => {
      try {
        let raw: string;
        if (isTauri) {
          const { invoke } = await import("@tauri-apps/api/core");
          raw = await invoke<string>("post_json", { url: loadUrl, body: { userId } });
        } else {
          const res = await fetch(loadUrl, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ userId }),
          });
          raw = await res.text();
        }

        const parsed: unknown = JSON.parse(raw);
        const data: ServerSession[] = Array.isArray(parsed)
          ? (parsed as ServerSession[])
          : ((parsed as { sessions?: ServerSession[] }).sessions ?? []);

        const sessions: ChatSession[] = data.map((s) => {
          const rawMsgs: ServerMessage[] =
            typeof s.messages === "string"
              ? (JSON.parse(s.messages) as ServerMessage[])
              : (s.messages as ServerMessage[]) ?? [];

          return {
            id:            s.session_id,
            title:         s.title ?? null,
            createdAt:     s.created_at,
            lastMessageAt: s.last_message_at ?? null,
            messages: rawMsgs.map((m) => ({
              id:        uuidv4(),
              role:      m.role as MessageRole,
              content:   m.content,
              timestamp: new Date(m.created_at),
              status:    "sent" as const,
            })),
          };
        });

        replaceWithServerSessions(sessions);
      } catch {
        // Silently fall back to local sessions
      }
    };

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showWelcome = messages.length === 0;

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    setError("");
    const originSessionId = sessionId;
    const userMsgId = addMessage({ role: "user", content: text, status: "sending" }, originSessionId);
    updateMessage(userMsgId, { status: "sent" });
    setTyping(true);

    try {
      const result = await sendMessage(text);
      setTyping(false);

      // ── Skill-State-Machine ──────────────────────────────────────────────
      if (result.skillAction === "collecting") {
        updateSkillSession({
          status:        "collecting",
          collectedData: result.collectedData ?? activeSkillSession?.collectedData ?? {},
        });
      } else if (result.skillAction === "confirming") {
        updateSkillSession({
          status:        "confirming",
          collectedData: result.collectedData ?? activeSkillSession?.collectedData ?? {},
        });
      } else if (result.skillAction === "complete") {
        if (result.skillOutput) {
          updateSkillSession({
            status:         "complete",
            outputFileUrl:  result.skillOutput.fileUrl,
            outputFileName: result.skillOutput.fileName,
          });
        }
        // Skill-Session nach kurzem Delay automatisch beenden
        setTimeout(() => endSkillSession(), 800);
      } else if (result.skillAction === "cancelled") {
        endSkillSession();
      }
      // Bei "undefined" skillAction (normaler RAG-Chat) → nichts tun

      // Nachricht zur Chat-History hinzufügen
      addMessage(
        {
          role:        "assistant",
          content:     result.text,
          status:      "sent",
          skillOutput: result.skillOutput,
        },
        originSessionId
      );
    } catch (err) {
      setTyping(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      addMessage({ role: "assistant", content: `Fehler: ${errMsg}`, status: "error" }, originSessionId);
      setError(errMsg);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full" style={{ background: "var(--bg-0)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <Sidebar isOpen={sidebarOpen} />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Header */}
        <ChatHeader
          isTyping={isTyping}
          messageCount={messages.length}
          onClear={clearMessages}
          onSettings={onResetSettings}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
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
                        background: "rgba(109,91,255,0.08)",
                        border:     "1px solid rgba(109,91,255,0.2)",
                        color:      "var(--text-2)",
                      }}
                      whileHover={{ background: "rgba(109,91,255,0.15)", color: "var(--text-1)", scale: 1.03 }}
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
                  background: "rgba(248,113,113,0.1)",
                  border:     "1px solid rgba(248,113,113,0.25)",
                  color:      "#F87171",
                }}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{   opacity: 0, y: -4 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8"  x2="12"   y2="12" />
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

        {/* ── Skill-Selector (erscheint über dem Input wenn Skills vorhanden) */}
        <SkillSelector
          skills={availableSkills}
          activeSession={activeSkillSession}
          onStartSkill={startSkillSession}
          onEndSkill={endSkillSession}
        />

        {/* Input */}
        <MessageInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  );
}
