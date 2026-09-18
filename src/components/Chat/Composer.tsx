import { useEffect, useRef, useState } from "react";
import Icon from "../common/Icon";
import type { ActiveSkill, SkillSession } from "../../types";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Text, der von außen in das Feld gelegt wird (Vorschlag vom Startbildschirm). */
  draft?: string | null;
  onDraftConsumed?: () => void;
  skills: ActiveSkill[];
  activeSession: SkillSession | null;
  onStartSkill: (slug: string) => void;
  onEndSkill: () => void;
}

const STATUS_TEXT: Record<SkillSession["status"], string> = {
  idle: "",
  collecting: "Angaben werden gesammelt",
  confirming: "Bitte bestätigen",
  executing: "Wird erstellt",
  complete: "Fertig",
};

/** Eingabezeile nach Design-System `.composer`: Textfeld, Senden, darunter Skills und Tastenhinweis. */
export default function Composer({ onSend, disabled = false, draft, onDraftConsumed, skills, activeSession, onStartSkill, onEndSkill }: ComposerProps) {
  const [text, setText] = useState("");
  const [tip, setTip] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draft) {
      setText(draft);
      onDraftConsumed?.();
      requestAnimationFrame(() => {
        const ta = ref.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      });
    }
  }, [draft, onDraftConsumed]);

  // Höhe an den Inhalt anpassen (Fallback, wenn field-sizing nicht unterstützt wird)
  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, Math.round(window.innerHeight * 0.4))}px`;
  }, [text]);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const canSend = text.trim().length > 0 && !disabled;

  const send = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  const activeSkill = activeSession ? skills.find((s) => s.slug === activeSession.skillSlug) : null;

  return (
    <div className="composer">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={activeSession ? `Antworten Sie dem Assistenten für „${activeSkill?.name ?? activeSession.skillSlug}“ …` : "Stellen Sie eine Frage zu Ihren Dokumenten …"}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        aria-label="Nachricht"
        disabled={disabled}
      />
      <button type="button" className="btn btn--primary btn--icon" aria-label="Senden" title="Senden (Enter)" onClick={send} disabled={!canSend}>
        <Icon name="send" />
      </button>

      <div className="composer__hint">
        {activeSession && activeSkill ? (
          <span className="skill is-active skill--active">
            <Icon name="bolt" />
            {activeSkill.name}
            <span className="skill__status">· {STATUS_TEXT[activeSession.status]}</span>
            <button type="button" className="skill__close" aria-label="Skill beenden" title="Skill beenden" onClick={onEndSkill}>
              <Icon name="close" />
            </button>
          </span>
        ) : skills.length > 0 ? (
          <span className="skills">
            {skills.map((skill) => (
              <span key={skill.slug} style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`skill${skill.isConfigComplete ? "" : " skill--pending"}`}
                  disabled={disabled}
                  title={skill.isConfigComplete ? `Skill starten: ${skill.name}` : "Noch nicht eingerichtet"}
                  onClick={() => {
                    if (!skill.isConfigComplete) {
                      setTip(skill.slug);
                      setTimeout(() => setTip(null), 2500);
                      return;
                    }
                    onStartSkill(skill.slug);
                  }}
                >
                  <Icon name={skill.isConfigComplete ? "bolt" : "alert"} />
                  {skill.name}
                </button>
                {tip === skill.slug && <span className="tip" role="status">Bitte zuerst im Kundenportal einrichten.</span>}
              </span>
            ))}
          </span>
        ) : null}
        <span className="composer__kbd">Enter sendet, Umschalt + Enter für eine neue Zeile.</span>
      </div>
    </div>
  );
}
