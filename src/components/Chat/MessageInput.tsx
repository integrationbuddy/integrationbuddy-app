import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MessageInputProps {
  onSend:    (text: string) => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [text, setText]       = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-4 pt-3 shrink-0">
      {/* Container */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        animate={{
          boxShadow: focused
            ? "0 0 0 2px rgba(109,91,255,0.4), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 2px 16px rgba(0,0,0,0.3)",
        }}
        transition={{ duration: 0.2 }}
        style={{
          background: "rgba(17, 21, 35, 0.95)",
          border: `1px solid ${focused ? "rgba(109,91,255,0.4)" : "rgba(255,255,255,0.07)"}`,
        }}
      >
        {/* Top accent line when focused */}
        <AnimatePresence>
          {focused && (
            <motion.div
              className="h-px w-full absolute top-0 left-0 z-10"
              style={{ background: "linear-gradient(90deg, transparent, rgba(109,91,255,0.7), rgba(45,212,191,0.4), transparent)" }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 px-4 py-3">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent resize-none outline-none text-sm leading-relaxed"
            style={{
              color:       "var(--text-1)",
              minHeight:   "24px",
              maxHeight:   "160px",
              fontFamily:  "DM Sans, sans-serif",
              caretColor:  "var(--accent)",
            }}
            placeholder={disabled ? "Warte auf Antwort…" : "Nachricht eingeben… (Enter zum Senden, Shift+Enter für neue Zeile)"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            rows={1}
          />

          {/* Send button */}
          <motion.button
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: canSend
                ? "linear-gradient(135deg, #6D5BFF 0%, #4F3FCC 100%)"
                : "rgba(255,255,255,0.05)",
              cursor:     canSend ? "pointer" : "not-allowed",
              boxShadow:  canSend ? "0 4px 16px rgba(109,91,255,0.4)" : "none",
            }}
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.08, boxShadow: "0 4px 24px rgba(109,91,255,0.6)" } : {}}
            whileTap={canSend ? { scale: 0.93 } : {}}
            animate={{ rotate: canSend ? 0 : 0 }}
            title="Senden (Enter)"
          >
            <AnimatePresence mode="wait">
              {disabled ? (
                <motion.div
                  key="loading"
                  className="w-4 h-4 border-2 border-t-transparent rounded-full"
                  style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <motion.svg
                  key="send"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={canSend ? "white" : "var(--text-3)"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Character hint */}
        <AnimatePresence>
          {text.length > 0 && (
            <motion.div
              className="px-4 pb-2 flex justify-end"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span style={{ fontSize: "10px", color: "var(--text-3)" }}>
                Shift+Enter für neue Zeile
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
