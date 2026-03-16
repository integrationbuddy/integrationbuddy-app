import { motion, AnimatePresence } from "framer-motion";
import { UpdateInfo } from "../hooks/useUpdater";

interface Props {
  info: UpdateInfo | null;
  installing: boolean;
  progress: number;
  onInstall: () => void;
  onDismiss: () => void;
}

export function UpdateDialog({ info, installing, progress, onInstall, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {info?.available && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={!installing ? onDismiss : undefined}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto w-[420px] rounded-2xl border border-white/10 bg-[#0F1420] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#2DD4BF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-base leading-tight">
                      Update verfügbar
                    </h2>
                    <p className="text-white/40 text-xs mt-0.5">
                      Version {info.version}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                {info.body ? (
                  <div className="text-white/60 text-sm leading-relaxed max-h-40 overflow-y-auto pr-1 custom-scrollbar whitespace-pre-wrap">
                    {info.body}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm italic">
                    Keine Versionshinweise verfügbar.
                  </p>
                )}
              </div>

              {/* Progress bar (during install) */}
              {installing && (
                <div className="px-6 pb-2">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#2DD4BF] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "linear" }}
                    />
                  </div>
                  <p className="text-white/30 text-xs mt-1.5 text-right">
                    {progress > 0 ? `${progress}% heruntergeladen…` : "Wird vorbereitet…"}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={onDismiss}
                  disabled={installing}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-medium
                    hover:bg-white/5 hover:text-white/70 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Später
                </button>
                <button
                  onClick={onInstall}
                  disabled={installing}
                  className="flex-1 py-2.5 rounded-xl bg-[#2DD4BF] text-[#06080F] text-sm font-semibold
                    hover:bg-[#2DD4BF]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2"
                >
                  {installing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 11-8 8z" />
                      </svg>
                      Installiere…
                    </>
                  ) : (
                    "Jetzt installieren"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
