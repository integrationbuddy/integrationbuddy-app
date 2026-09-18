import Icon from "../common/Icon";
import SolvedButton from "./SolvedButton";
import type { Message } from "../../types";

interface ChatBarProps {
  title: string | null;
  messages: Message[];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  authState: "ok" | "expiring" | "required";
  onLogin: () => void;
  solved: boolean;
  onSolved: () => void;
  onClear: () => void;
}

/** Kopfzeile des Gesprächs nach `.chat__bar`: Titel, Verbindungsstatus, Aktionen. */
export default function ChatBar({ title, messages, sidebarOpen, onToggleSidebar, authState, onLogin, solved, onSolved, onClear }: ChatBarProps) {
  return (
    <div className="chat__bar">
      <button type="button" className="btn btn--quiet btn--icon btn--sm" aria-label={sidebarOpen ? "Seitenleiste ausblenden" : "Seitenleiste einblenden"} title={sidebarOpen ? "Seitenleiste ausblenden" : "Seitenleiste einblenden"} aria-pressed={sidebarOpen} onClick={onToggleSidebar}>
        <Icon name="panel" />
      </button>
      <span className="chat__bar-title" title={title ?? undefined}>{title ?? "Neues Gespräch"}</span>
      <span className="chat__bar-spacer" />

      {authState === "ok" && <span className="badge badge--success badge--plain">Wissensdatenbank verbunden</span>}
      {authState === "expiring" && (
        <button type="button" className="badge badge--warning" onClick={onLogin} title="Anmeldung erneuern">Anmeldung läuft bald ab</button>
      )}
      {authState === "required" && (
        <button type="button" className="badge badge--error" onClick={onLogin} title="Jetzt anmelden">Anmeldung erforderlich</button>
      )}

      <SolvedButton messages={messages} solved={solved} onSolved={onSolved} />

      {messages.length > 0 && (
        <button type="button" className="btn btn--quiet btn--icon btn--sm" aria-label="Gespräch leeren" title="Gespräch leeren" onClick={onClear}>
          <Icon name="trash" />
        </button>
      )}
    </div>
  );
}
