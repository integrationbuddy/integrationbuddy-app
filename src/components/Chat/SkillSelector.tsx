import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ActiveSkill, SkillSession } from "../../types";

interface SkillSelectorProps {
  skills: ActiveSkill[];
  activeSession: SkillSession | null;
  onStartSkill: (slug: string) => void;
  onEndSkill: () => void;
}

// Icon-Map: skill.icon → SVG oder Emoji
const ICON_MAP: Record<string, string> = {
  "file-text": "📄",
  puzzle:      "🧩",
  mail:        "✉️",
  chart:       "📊",
  calendar:    "📅",
  clipboard:   "📋",
  star:        "⭐",
};

function getIcon(icon: string): string {
  return ICON_MAP[icon] ?? "🧩";
}

export default function SkillSelector({
  skills,
  activeSession,
  onStartSkill,
  onEndSkill,
}: SkillSelectorProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  if (skills.length === 0) return null;

  return (
    <div style={{ padding: "0 16px 8px" }}>
      <AnimatePresence mode="wait">
        {/* Aktiver Skill → farbiges Banner */}
        {activeSession ? (
          <motion.div
            key="active-banner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              gap:            8,
              padding:        "8px 14px",
              borderRadius:   10,
              background:     "rgba(109,91,255,0.12)",
              border:         "1px solid rgba(109,91,255,0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1rem" }}>
                {getIcon(skills.find((s) => s.slug === activeSession.skillSlug)?.icon ?? "puzzle")}
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--accent)", fontWeight: 600 }}>
                {skills.find((s) => s.slug === activeSession.skillSlug)?.name ?? activeSession.skillSlug}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
                {activeSession.status === "collecting"  && "• Daten werden gesammelt …"}
                {activeSession.status === "confirming"  && "• Bitte bestätigen"}
                {activeSession.status === "executing"   && "• Wird verarbeitet …"}
                {activeSession.status === "complete"    && "• Fertig"}
              </span>
            </div>

            {/* Abbrechen */}
            <button
              onClick={onEndSkill}
              title="Skill beenden"
              style={{
                background:  "transparent",
                border:      "none",
                cursor:      "pointer",
                color:       "var(--text-2)",
                padding:     "2px 4px",
                borderRadius: 6,
                fontSize:    "1rem",
                lineHeight:  1,
                transition:  "color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
            >
              ✕
            </button>
          </motion.div>
        ) : (
          /* Skill-Chips */
          <motion.div
            key="skill-chips"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            style={{
              display:    "flex",
              gap:        6,
              overflowX:  "auto",
              paddingBottom: 2,
              scrollbarWidth: "none",
            }}
          >
            {skills.map((skill) => (
              <div key={skill.slug} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => {
                    if (!skill.isConfigComplete) {
                      setTooltip(skill.slug);
                      setTimeout(() => setTooltip(null), 2500);
                    } else {
                      onStartSkill(skill.slug);
                    }
                  }}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          6,
                    padding:      "5px 12px",
                    borderRadius: 999,
                    border:       "1px solid var(--bg-3)",
                    background:   "var(--bg-2)",
                    color:        skill.isConfigComplete ? "var(--text-1)" : "var(--text-3)",
                    cursor:       skill.isConfigComplete ? "pointer" : "not-allowed",
                    fontSize:     "0.8rem",
                    fontWeight:   500,
                    transition:   "all .15s",
                    whiteSpace:   "nowrap",
                    opacity:      skill.isConfigComplete ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (skill.isConfigComplete) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.color = "var(--accent)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--bg-3)";
                    e.currentTarget.style.color = skill.isConfigComplete ? "var(--text-1)" : "var(--text-3)";
                  }}
                >
                  <span>{getIcon(skill.icon)}</span>
                  <span>{skill.name}</span>
                  {!skill.isConfigComplete && <span style={{ fontSize: "0.7rem" }}>⚙️</span>}
                </button>

                {/* Tooltip: nicht konfiguriert */}
                <AnimatePresence>
                  {tooltip === skill.slug && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      style={{
                        position:    "absolute",
                        bottom:      "calc(100% + 6px)",
                        left:        "50%",
                        transform:   "translateX(-50%)",
                        background:  "var(--bg-3)",
                        color:       "var(--text-1)",
                        fontSize:    "0.75rem",
                        padding:     "5px 10px",
                        borderRadius: 8,
                        whiteSpace:  "nowrap",
                        border:      "1px solid rgba(245,158,11,.4)",
                        zIndex:      50,
                        pointerEvents: "none",
                      }}
                    >
                      ⚠ Bitte zuerst im Portal konfigurieren
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
