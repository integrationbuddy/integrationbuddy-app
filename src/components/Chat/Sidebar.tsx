import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const date  = new Date(isoString);
  const now   = new Date();
  const diff  = now.getTime() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "Jetzt";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days  = Math.floor(hours / 24);
  if (days === 1) return "Gestern";
  if (days < 7)   return `vor ${days} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const { sessions, sessionId, newSession, switchSession, deleteSession } = useAppStore();
  const [search,    setSearch]    = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => {
    const ta = a.lastMessageAt ?? a.createdAt;
    const tb = b.lastMessageAt ?? b.createdAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });

  const filtered = search.trim()
    ? sorted.filter((s) =>
        (s.title ?? "Neue Unterhaltung").toLowerCase().includes(search.toLowerCase())
      )
    : sorted;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col shrink-0 overflow-hidden h-full"
          style={{
            background:  "rgba(6, 8, 16, 0.98)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Fixed inner width so content doesn't reflow during animation */}
          <div className="flex flex-col h-full" style={{ width: 260 }}>

            {/* Top strip matching TitleBar height — stays draggable */}
            <div
              className="drag-region shrink-0 flex items-center px-4"
              style={{
                height:      40,
                background:  "rgba(6, 8, 15, 0.9)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                className="font-display text-xs font-semibold no-drag"
                style={{ color: "var(--text-3)", letterSpacing: "0.05em" }}
              >
                CHATS
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 overflow-hidden p-3 gap-2">

              {/* Search input */}
              <div className="relative shrink-0">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="var(--text-3)"
                  strokeWidth="2" strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field w-full pl-8 pr-3 py-2 rounded-xl text-xs"
                />
              </div>

              {/* New Chat button */}
              <motion.button
                onClick={newSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium shrink-0"
                style={{
                  background: "rgba(109,91,255,0.12)",
                  border:     "1px solid rgba(109,91,255,0.25)",
                  color:      "var(--accent-light)",
                }}
                whileHover={{
                  background: "rgba(109,91,255,0.2)",
                  border:     "1px solid rgba(109,91,255,0.4)",
                }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5"  y1="12" x2="19" y2="12" />
                </svg>
                Neuer Chat
              </motion.button>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-1 -mx-1 px-1">
                <AnimatePresence initial={false}>
                  {filtered.map((sess) => {
                    const isActive = sess.id === sessionId;
                    return (
                      <motion.div
                        key={sess.id}
                        layout="position"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.15 }}
                        className="relative rounded-xl px-3 py-2.5 cursor-pointer shrink-0"
                        style={{
                          background: isActive ? "rgba(109,91,255,0.15)" : "transparent",
                          border:     isActive ? "1px solid rgba(109,91,255,0.25)" : "1px solid transparent",
                        }}
                        onClick={() => switchSession(sess.id)}
                        onMouseEnter={() => setHoveredId(sess.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        whileHover={{
                          background: isActive
                            ? "rgba(109,91,255,0.2)"
                            : "rgba(255,255,255,0.04)",
                        }}
                      >
                        {/* Title */}
                        <div
                          className="text-xs font-medium truncate pr-5"
                          style={{ color: isActive ? "var(--text-1)" : "var(--text-2)" }}
                        >
                          {sess.title ?? "Neue Unterhaltung"}
                        </div>

                        {/* Timestamp */}
                        <div
                          className="mt-0.5"
                          style={{ color: "var(--text-3)", fontSize: "10px" }}
                        >
                          {formatRelativeTime(sess.lastMessageAt ?? sess.createdAt)}
                        </div>

                        {/* Delete button (on hover) */}
                        <AnimatePresence>
                          {hoveredId === sess.id && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.7 }}
                              transition={{ duration: 0.1 }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center"
                              style={{
                                background: "rgba(248,113,113,0.15)",
                                color:      "#F87171",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(sess.id);
                              }}
                              whileHover={{ background: "rgba(248,113,113,0.3)" }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                                   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6"  x2="6"  y2="18" />
                                <line x1="6"  y1="6"  x2="18" y2="18" />
                              </svg>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <p
                    className="text-center mt-6"
                    style={{ color: "var(--text-3)", fontSize: "11px" }}
                  >
                    {search ? "Keine Chats gefunden" : "Noch keine Chats"}
                  </p>
                )}
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
