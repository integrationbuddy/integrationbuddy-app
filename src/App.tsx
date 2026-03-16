import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "./store/appStore";
import SetupPage from "./components/Setup/SetupPage";
import ChatPage from "./components/Chat/ChatPage";
import { UpdateDialog } from "./components/UpdateDialog";
import { useUpdater } from "./hooks/useUpdater";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.97 },
};

export default function App() {
  const { isSetupComplete, resetSetup } = useAppStore();
  const { updateInfo, installing, progress, installUpdate, dismiss } = useUpdater();

  const handleResetSettings = () => {
    if (window.confirm("Alle Einstellungen zurücksetzen und die Einrichtung neu starten?")) {
      resetSetup();
    }
  };

  return (
    <div className="h-full w-full" style={{ background: "var(--bg-0)" }}>
      <AnimatePresence mode="wait">
        {isSetupComplete ? (
          <motion.div
            key="chat"
            className="h-full w-full"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ChatPage onResetSettings={handleResetSettings} />
          </motion.div>
        ) : (
          <motion.div
            key="setup"
            className="h-full w-full"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <SetupPage />
          </motion.div>
        )}
      </AnimatePresence>

      <UpdateDialog
        info={updateInfo}
        installing={installing}
        progress={progress}
        onInstall={installUpdate}
        onDismiss={dismiss}
      />
    </div>
  );
}
