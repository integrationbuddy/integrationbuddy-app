import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { isTauri } from "@tauri-apps/api/core";

export interface UpdateInfo {
  available: boolean;
  version: string;
  body: string | null;
  update: Update | null;
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update?.available) {
          setUpdateInfo({
            available: true,
            version: update.version,
            body: update.body ?? null,
            update,
          });
        }
      } catch (e) {
        // Kein Update oder Netzwerkfehler — kein Dialog anzeigen
        console.error("[Updater] Prüfung fehlgeschlagen:", e);
      }
    };

    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  const installUpdate = async () => {
    if (!updateInfo?.update) return;
    setInstalling(true);
    setProgress(0);
    setError(null);

    try {
      let downloaded = 0;
      let total = 0;

      await updateInfo.update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(Math.round((downloaded / total) * 100));
          }
        }
        // "Finished" → Installer startet, App wird automatisch neu gestartet
      });
    } catch (e) {
      console.error("[Updater] Installation fehlgeschlagen:", e);
      setError("Update fehlgeschlagen. Bitte versuche es erneut.");
      setInstalling(false);
      setProgress(0);
    }
  };

  const dismiss = () => {
    if (!installing) setUpdateInfo(null);
  };

  return { updateInfo, installing, progress, error, installUpdate, dismiss };
}
