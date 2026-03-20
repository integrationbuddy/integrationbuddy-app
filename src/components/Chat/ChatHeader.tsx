import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "../common/Avatar";
import { useAppStore } from "../../store/appStore";
import TitleBar from "../common/TitleBar";

interface ChatHeaderProps {
  isTyping:        boolean;
  messageCount:    number;
  onClear:         () => void;
  onSettings:      () => void;
  sidebarOpen:     boolean;
  onToggleSidebar: () => void;
}

export default function ChatHeader({
  isTyping,
  messageCount,
  onClear,
  onSettings,
  sidebarOpen,
  onToggleSidebar,
}: ChatHeaderProps) {
  const { ai } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      {/* Titlebar */}
      <TitleBar />

      {/* Chat header bar */}
      <div
        className="flex items-center justify-between px-3 py-3 shrink-0 relative"
        style={{
          background:   "rgba(11, 14, 26, 0.95)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: sidebar toggle + AI identity */}
        <div className="flex items-center gap-2">

          {/* Sidebar toggle button */}
          <motion.button
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: sidebarOpen ? "rgba(109,91,255,0.15)" : "transparent",
              border:     sidebarOpen ? "1px solid rgba(109,91,255,0.3)" : "1px solid transparent",
              color:      sidebarOpen ? "var(--accent-light)" : "var(--text-3)",
            }}
            whileHover={{
              background: sidebarOpen ? "rgba(109,91,255,0.2)" : "rgba(255,255,255,0.07)",
              color:      "var(--text-2)",
            }}
            whileTap={{ scale: 0.9 }}
            title={sidebarOpen ? "Seitenleiste schließen" : "Seitenleiste öffnen"}
          >
            {/* Panel-left icon — two vertical stripes */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </motion.button>

          {/* AI identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={ai.avatar} name={ai.name} size={38} variant="ai" />
              {/* Online indicator */}
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{
                  background: "#34D399",
                  border:     "2px solid var(--bg-1)",
                  boxShadow:  "0 0 6px rgba(52,211,153,0.6)",
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="font-display text-sm font-semibold leading-none"
                  style={{ color: "var(--text-1)" }}
                >
                  {ai.name}
                </h1>
                {/* Verified badge */}
                <div
                  className="flex items-center justify-center w-4 h-4 rounded-full shrink-0"
                  style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)" }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                       stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isTyping ? (
                  <motion.p
                    key="typing"
                    className="text-xs mt-0.5"
                    style={{ color: "var(--ai)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    schreibt…
                  </motion.p>
                ) : (
                  <motion.p
                    key="online"
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-3)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Online · KI-Assistent
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 no-drag relative">
          {/* Message count badge */}
          {messageCount > 0 && (
            <div
              className="px-2 py-0.5 rounded-full text-xs mr-1"
              style={{
                background: "rgba(109,91,255,0.12)",
                border:     "1px solid rgba(109,91,255,0.2)",
                color:      "var(--accent-light)",
              }}
            >
              {messageCount} Nachrichten
            </div>
          )}

          {/* Menu button */}
          <div className="relative">
            <motion.button
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: menuOpen ? "rgba(255,255,255,0.08)" : "transparent",
                color:      menuOpen ? "var(--text-1)" : "var(--text-3)",
                border:     "1px solid transparent",
              }}
              onClick={() => setMenuOpen((o) => !o)}
              whileHover={{ background: "rgba(255,255,255,0.07)", color: "var(--text-2)" }}
              whileTap={{ scale: 0.9 }}
              title="Menü"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5"  r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50"
                    style={{
                      background:     "rgba(17, 21, 35, 0.98)",
                      border:         "1px solid rgba(255,255,255,0.1)",
                      boxShadow:      "0 16px 48px rgba(0,0,0,0.5)",
                      backdropFilter: "blur(16px)",
                    }}
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1,    y: 0 }}
                    exit={{   opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    {/* Clear chat */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                      style={{ color: "var(--text-2)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      onClick={() => { onClear(); setMenuOpen(false); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                      Chat leeren
                    </button>

                    <div className="divider mx-3" />

                    {/* Settings */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                      style={{ color: "var(--text-2)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                      onClick={() => { onSettings(); setMenuOpen(false); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Einstellungen zurücksetzen
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
