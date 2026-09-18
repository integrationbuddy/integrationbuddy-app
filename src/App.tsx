import { useEffect, useState } from "react";
import { useAppStore } from "./store/appStore";
import SetupPage from "./components/Setup/SetupPage";
import ChatPage from "./components/Chat/ChatPage";
import ConfirmDialog from "./components/common/ConfirmDialog";
import { UpdateDialog } from "./components/UpdateDialog";
import { useUpdater } from "./hooks/useUpdater";

export default function App() {
  const isSetupComplete = useAppStore((s) => s.isSetupComplete);
  const theme = useAppStore((s) => s.theme);
  const resetSetup = useAppStore((s) => s.resetSetup);
  const loadAuthToken = useAppStore((s) => s.loadAuthToken);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { loadAuthToken(); }, [loadAuthToken]);

  // Thema auf <html>: hell oder dunkel fest, „system“ folgt Windows über prefers-color-scheme.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const { updateInfo, installing, progress, error, installUpdate, dismiss } = useUpdater();

  return (
    <>
      {isSetupComplete ? <ChatPage onResetSettings={() => setConfirmReset(true)} /> : <SetupPage />}

      <ConfirmDialog
        open={confirmReset}
        title="Abmelden und zurücksetzen?"
        text="Anmeldung, Profil und der lokale Gesprächsverlauf werden von diesem Gerät entfernt. Die Einrichtung beginnt von vorn."
        confirmLabel="Zurücksetzen"
        danger
        onConfirm={() => { setConfirmReset(false); resetSetup(); }}
        onCancel={() => setConfirmReset(false)}
      />

      <UpdateDialog info={updateInfo} installing={installing} progress={progress} error={error} onInstall={installUpdate} onDismiss={dismiss} />
    </>
  );
}
