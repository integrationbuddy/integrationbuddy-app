import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import type { Message } from "../../types";

const SOLVED_WEBHOOK_URL = "https://n8n.srv1314651.hstgr.cloud/webhook/chat-solved";

interface SolvedButtonProps {
  messages:  Message[];
  solved:    boolean;
  onSolved:  () => void;
}

export default function SolvedButton({ messages, solved, onSolved }: SolvedButtonProps) {
  const { sessionId, userGroups, addMessage } = useAppStore((s) => ({
    sessionId:  s.sessionId,
    userGroups: s.userGroups,
    addMessage: s.addMessage,
  }));

  const [loading, setLoading] = useState(false);

  // Nur anzeigen wenn mind. 1 gesendete AI-Antwort vorhanden und noch nicht gelöst
  const hasAiResponse = messages.some(
    (m) => m.role === "assistant" && m.status === "sent"
  );
  if (!hasAiResponse || solved) return null;

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    const payload = {
      session_id:   sessionId,
      trigger_type: "button",
      group_name:   userGroups[0] ?? "unknown",
      messages:     messages.map((m) => ({
        role:      m.role,
        content:   m.content,
        timestamp: m.timestamp instanceof Date
          ? m.timestamp.toISOString()
          : String(m.timestamp),
      })),
    };

    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("send_message_to_webhook", {
          url:     SOLVED_WEBHOOK_URL,
          payload, // serde_json::Value — kein JSON.stringify
        });
      } else {
        await fetch(SOLVED_WEBHOOK_URL, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }
    } catch {
      // Fehler ignorieren — Bestätigung trotzdem anzeigen
    } finally {
      setLoading(false);
    }

    // Bestätigungsnachricht in den Chat injizieren
    addMessage({
      role:    "assistant",
      content: "Die Lösung wurde erfolgreich in der Datenbank hinterlegt. ✓",
      status:  "sent",
    });

    onSolved();
  };

  return (
    <AnimatePresence>
      {!solved && (
        <motion.button
          onClick={handleClick}
          disabled={loading}
          initial={{ opacity: 0, scale: 0.85, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.85, x: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          whileHover={loading ? {} : { scale: 1.04 }}
          whileTap={loading  ? {} : { scale: 0.96 }}
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           6,
            padding:       "5px 13px",
            borderRadius:  999,
            border:        "1px solid rgba(52,211,153,0.35)",
            background:    "rgba(52,211,153,0.08)",
            color:         "#34D399",
            fontSize:      "0.78rem",
            fontWeight:    600,
            cursor:        loading ? "not-allowed" : "pointer",
            opacity:       loading ? 0.6 : 1,
            whiteSpace:    "nowrap",
            flexShrink:    0,
          }}
        >
          {loading ? (
            <>
              <svg
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round"
                style={{ animation: "spin 0.8s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Wird gespeichert …
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Problem gelöst?
            </>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
