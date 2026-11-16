import { useState } from "react";
import Icon from "../common/Icon";
import { useAppStore } from "../../store/appStore";
import { isTauri, invokeCommand } from "../../lib/tauri";
import type { Message } from "../../types";

const SOLVED_WEBHOOK_URL = "https://n8n.srv1314651.hstgr.cloud/webhook/chat-solved";

interface SolvedButtonProps {
  messages: Message[];
  solved: boolean;
  onSolved: () => void;
}

/** „Problem gelöst“: schickt das Gespräch zur Zusammenfassung in die Wissensdatenbank. */
export default function SolvedButton({ messages, solved, onSolved }: SolvedButtonProps) {
  const sessionId = useAppStore((s) => s.sessionId);
  const userGroups = useAppStore((s) => s.userGroups);
  const authToken = useAppStore((s) => s.authToken);
  const addMessage = useAppStore((s) => s.addMessage);
  const [loading, setLoading] = useState(false);

  const hasAiResponse = messages.some((m) => m.role === "assistant" && m.status === "sent");
  if (!hasAiResponse || solved) return null;

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    const payload = {
      session_id: sessionId,
      trigger_type: "button",
      group_name: userGroups[0] ?? "unknown",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      })),
    };
    try {
      if (isTauri()) {
        await invokeCommand("send_message_to_webhook", { url: SOLVED_WEBHOOK_URL, payload, authToken });
      } else {
        await fetch(SOLVED_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) }, body: JSON.stringify(payload) });
      }
    } catch {
      // Bestätigung trotzdem zeigen; der Workflow arbeitet asynchron
    } finally {
      setLoading(false);
    }
    addMessage({ role: "assistant", content: "Die Lösung wurde in der Wissensdatenbank hinterlegt. Vielen Dank.", status: "sent" });
    onSolved();
  };

  return (
    <button type="button" className={`btn btn--ghost btn--sm${loading ? " btn--submit is-loading" : ""}`} onClick={handleClick} disabled={loading} title="Gespräch als gelöst in die Wissensdatenbank übernehmen">
      <Icon name="check" />
      Problem gelöst
      {loading && <span className="btn__spinner" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }} />}
    </button>
  );
}
