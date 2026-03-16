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

  useEffect(() => {
    // Nur in Tauri-Umgebung prüfen, nicht im Browser
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
      } catch {
        // Kein Update verfügbar oder Netzwerkfehler → still ignorieren
      }
    };

    // Kurze Verzögerung damit die App zuerst vollständig lädt
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  const installUpdate = async () => {
    if (!updateInfo?.update) return;
    setInstalling(true);
    setProgress(0);

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
        // "Finished" → App startet neu automatisch
      });
    } catch {
      setInstalling(false);
      setProgress(0);
    }
  };

  const dismiss = () => setUpdateInfo(null);

  return { updateInfo, installing, progress, installUpdate, dismiss };
}
