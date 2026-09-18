import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import TitleBar from "../common/TitleBar";
import ConfirmDialog from "../common/ConfirmDialog";
import Icon from "../common/Icon";
import Sidebar from "./Sidebar";
import ChatBar from "./ChatBar";
import MessageItem from "./MessageItem";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import Welcome from "./Welcome";
import Lightbox, { type LightboxItem } from "./Lightbox";
import LoginDialog from "../Auth/LoginDialog";
import { useAppStore } from "../../store/appStore";
import { useWebhook } from "../../hooks/useWebhook";
import { isTauri, invokeCommand } from "../../lib/tauri";
import { loadProtectedImage } from "../../lib/attachments";
import { toAuthError, describeError } from "../../lib/authError";
import { formatExpiry } from "../../lib/portalAuth";
import type { AuthReason, ChatAttachment, ChatSession, MessageRole } from "../../types";

// ── Server session shapes ─────────────────────────────────────────────────────

interface ServerMessage { role: string; content: string; created_at: string; }
interface ServerSession {
  session_id: string;
  title: string | null;
  created_at: string;
  last_message_at: string | null;
  messages: ServerMessage[] | string;
}

const EXPIRY_WARN_SECONDS = 2 * 86_400; // zwei Tage vor Ablauf hinweisen

const dayFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long" });
function dayLabel(d: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff <= 0) return "Heute";
  if (diff === 1) return "Gestern";
  return dayFmt.format(d);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ChatPageProps {
  onResetSettings: () => void;
}

export default function ChatPage({ onResetSettings }: ChatPageProps) {
  const {
    messages, isTyping, addMessage, updateMessage, setTyping, clearMessages,
    sessionId, sessions, webhookUrl, userId, authToken, tokenExpiresAt, authLoaded,
    replaceWithServerSessions, availableSkills, activeSkillSession,
    startSkillSession, updateSkillSession, endSkillSession,
  } = useAppStore();
  const { sendMessage } = useWebhook();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [solved, setSolved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);

  // Anmeldung
  const [login, setLogin] = useState<{ open: boolean; reason: AuthReason | null; required: boolean }>({ open: false, reason: null, required: false });
  const pendingText = useRef<string | null>(null);
  const [expiryDismissed, setExpiryDismissed] = useState(false);

  const now = Math.floor(Date.now() / 1000);
  const tokenExpired = authLoaded && (!authToken || (tokenExpiresAt !== null && tokenExpiresAt <= now));
  const tokenExpiring = !tokenExpired && tokenExpiresAt !== null && tokenExpiresAt - now < EXPIRY_WARN_SECONDS;
  const authState: "ok" | "expiring" | "required" = tokenExpired ? "required" : tokenExpiring ? "expiring" : "ok";

  const currentSession = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);

  useEffect(() => { setSolved(false); }, [sessionId]);

  // Ohne gültige Anmeldung sofort nachfragen (Token fehlt oder Ablaufdatum überschritten)
  useEffect(() => {
    if (tokenExpired && !login.open) {
      setLogin({ open: true, reason: !authToken ? "missing" : "expired", required: true });
    }
  }, [tokenExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verlauf vom Server laden
  useEffect(() => {
    if (!webhookUrl || !userId) return;
    const loadUrl = webhookUrl.replace(/\/ib-chat$/, "/ib-load-history");
    if (loadUrl === webhookUrl) return;

    (async () => {
      try {
        let raw: string;
        if (isTauri()) {
          raw = await invokeCommand<string>("post_json", { url: loadUrl, body: { userId } });
        } else {
          const res = await fetch(loadUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
          raw = await res.text();
        }
        const parsed: unknown = JSON.parse(raw);
        const data: ServerSession[] = Array.isArray(parsed) ? (parsed as ServerSession[]) : ((parsed as { sessions?: ServerSession[] }).sessions ?? []);
        const loaded: ChatSession[] = data.map((s) => {
          const rawMsgs: ServerMessage[] = typeof s.messages === "string" ? (JSON.parse(s.messages) as ServerMessage[]) : (s.messages ?? []);
          return {
            id: s.session_id,
            title: s.title ?? null,
            createdAt: s.created_at,
            lastMessageAt: s.last_message_at ?? null,
            messages: rawMsgs.map((m) => ({
              id: uuidv4(),
              role: m.role as MessageRole,
              content: m.content,
              timestamp: new Date(m.created_at),
              status: "sent" as const,
            })),
          };
        });
        replaceWithServerSessions(loaded);
      } catch {
        // Lokaler Verlauf bleibt
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  // ── Senden ────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async (text: string) => {
    if (tokenExpired) {
      pendingText.current = text;
      setLogin({ open: true, reason: !authToken ? "missing" : "expired", required: true });
      return;
    }
    const originSessionId = sessionId;
    const userMsgId = addMessage({ role: "user", content: text, status: "sending" }, originSessionId);
    setTyping(true);

    try {
      const result = await sendMessage(text);
      updateMessage(userMsgId, { status: "sent" });
      setTyping(false);

      if (result.skillAction === "collecting" || result.skillAction === "confirming") {
        updateSkillSession({ status: result.skillAction, collectedData: result.collectedData ?? activeSkillSession?.collectedData ?? {} });
      } else if (result.skillAction === "complete") {
        if (result.skillOutput) {
          updateSkillSession({ status: "complete", outputFileUrl: result.skillOutput.fileUrl, outputFileName: result.skillOutput.fileName });
        }
        setTimeout(() => endSkillSession(), 800);
      } else if (result.skillAction === "cancelled") {
        endSkillSession();
      }

      const id = addMessage({
        role: "assistant",
        content: result.text,
        status: "sent",
        sources: result.sources,
        attachments: result.attachments,
        skillOutput: result.skillOutput,
        buttons: result.buttons,
        selectOptions: result.selectOptions,
        dateChannelOptions: result.dateChannelOptions,
      }, originSessionId);
      setFreshId(id);
    } catch (err) {
      setTyping(false);
      const auth = toAuthError(err);
      if (auth) {
        // Nachricht bleibt als „gesendet“ stehen und wird nach der Anmeldung erneut geschickt.
        updateMessage(userMsgId, { status: "sent" });
        pendingText.current = text;
        setLogin({ open: true, reason: auth.reason, required: auth.reason !== "expiring" });
        return;
      }
      updateMessage(userMsgId, { status: "sent" });
      addMessage({ role: "assistant", content: describeError(err), status: "error" }, originSessionId);
    }
  }, [tokenExpired, authToken, sessionId, addMessage, updateMessage, setTyping, sendMessage, updateSkillSession, endSkillSession, activeSkillSession]);

  const handleLoginSuccess = () => {
    setLogin({ open: false, reason: null, required: false });
    setExpiryDismissed(false);
    const text = pendingText.current;
    pendingText.current = null;
    if (text) {
      // Die Nutzerfrage steht schon im Verlauf, deshalb nur die Antwort nachholen.
      setTyping(true);
      sendMessage(text)
        .then((result) => {
          setTyping(false);
          const id = addMessage({ role: "assistant", content: result.text, status: "sent", sources: result.sources, attachments: result.attachments, skillOutput: result.skillOutput, buttons: result.buttons, selectOptions: result.selectOptions, dateChannelOptions: result.dateChannelOptions });
          setFreshId(id);
        })
        .catch((err) => {
          setTyping(false);
          addMessage({ role: "assistant", content: describeError(err), status: "error" });
        });
    }
  };

  const openAttachment = (attachment: ChatAttachment, src: string | null) => {
    setLightbox({ attachment, src });
    if (!src) {
      loadProtectedImage(attachment.url, authToken)
        .then((full) => setLightbox((cur) => (cur && cur.attachment.url === attachment.url ? { ...cur, src: full } : cur)))
        .catch(() => { /* Vorschau bleibt leer, Dialog zeigt den Ladekreis */ });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const showWelcome = messages.length === 0 && !isTyping;

  return (
    <div className="win">
      <TitleBar />
      <div className={`win__body${sidebarOpen ? "" : " is-side-hidden"}`}>
        <Sidebar
          onRelogin={() => setLogin({ open: true, reason: tokenExpiring ? "expiring" : "invalid", required: false })}
          onResetSettings={onResetSettings}
        />

        <section className="chat chat--fill" aria-label="Gespräch">
          <ChatBar
            title={currentSession?.title ?? null}
            messages={messages}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            authState={authState}
            onLogin={() => setLogin({ open: true, reason: tokenExpired ? (!authToken ? "missing" : "expired") : "expiring", required: tokenExpired })}
            solved={solved}
            onSolved={() => setSolved(true)}
            onClear={() => setConfirmClear(true)}
          />

          <div className="chat__body">
            {showWelcome && <Welcome onSend={handleSend} onDraft={setDraft} />}
            {messages.map((msg, idx) => {
              const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
              const prev = idx > 0 ? messages[idx - 1] : null;
              const prevTs = prev ? (prev.timestamp instanceof Date ? prev.timestamp : new Date(prev.timestamp)) : null;
              const newDay = !prevTs || prevTs.toDateString() !== ts.toDateString();
              return (
                <div key={msg.id} style={{ display: "contents" }}>
                  {newDay && <p className="chat__day">{dayLabel(ts)}</p>}
                  <MessageItem
                    message={msg}
                    isLast={idx === messages.length - 1}
                    fresh={msg.id === freshId}
                    onReply={isTyping ? undefined : handleSend}
                    onOpenAttachment={openAttachment}
                  />
                </div>
              );
            })}
            {isTyping && <TypingIndicator />}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>

          {tokenExpiring && !expiryDismissed && tokenExpiresAt && (
            <div className="chat__notice">
              <div className="notice notice--warn notice--compact" role="status">
                <Icon name="clock" />
                <div>Ihre Anmeldung läuft am {formatExpiry(tokenExpiresAt)} ab.</div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLogin({ open: true, reason: "expiring", required: false })}>Jetzt verlängern</button>
                <button type="button" className="btn btn--quiet btn--sm btn--icon" aria-label="Hinweis ausblenden" onClick={() => setExpiryDismissed(true)}><Icon name="close" /></button>
              </div>
            </div>
          )}

          <Composer
            onSend={handleSend}
            disabled={isTyping}
            draft={draft}
            onDraftConsumed={() => setDraft(null)}
            skills={availableSkills}
            activeSession={activeSkillSession}
            onStartSkill={startSkillSession}
            onEndSkill={endSkillSession}
          />
        </section>
      </div>

      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />

      <LoginDialog
        open={login.open}
        reason={login.reason}
        required={login.required}
        onClose={() => { setLogin({ open: false, reason: null, required: false }); pendingText.current = null; }}
        onSuccess={handleLoginSuccess}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Gespräch leeren?"
        text="Alle Nachrichten dieses Gesprächs werden aus der App entfernt."
        confirmLabel="Leeren"
        danger
        onConfirm={() => { clearMessages(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
