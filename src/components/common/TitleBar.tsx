import { useEffect, useState } from "react";
import logo from "../../ds/assets/logo-mark.webp";
import { isTauri } from "../../lib/tauri";

async function getAppWindow() {
  if (!isTauri()) return null;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  } catch {
    return null;
  }
}

/** Titelleiste nach Design-System `.titlebar`: Marke links, Fensterknöpfe rechts, Fläche ziehbar. */
export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      const win = await getAppWindow();
      if (!win) return;
      setIsMaximized(await win.isMaximized());
      unlisten = await win.onResized(async () => setIsMaximized(await win.isMaximized()));
    })();
    return () => { unlisten?.(); };
  }, []);

  const call = (fn: "minimize" | "toggleMaximize" | "close") => async () => {
    const win = await getAppWindow();
    await win?.[fn]();
  };

  return (
    <div className="titlebar" onDoubleClick={call("toggleMaximize")}>
      <div className="titlebar__brand">
        <img src={logo} alt="" width={20} height={20} />
        IntegrationBuddy
      </div>
      <div className="titlebar__controls">
        <button type="button" aria-label="Minimieren" title="Minimieren" onClick={call("minimize")}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 6h10" /></svg>
        </button>
        <button type="button" aria-label={isMaximized ? "Wiederherstellen" : "Maximieren"} title={isMaximized ? "Wiederherstellen" : "Maximieren"} onClick={call("toggleMaximize")}>
          {isMaximized ? (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3.5 3.5V1.5h7v7h-2" /><rect x="1.5" y="3.5" width="7" height="7" /></svg>
          ) : (
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1"><rect x="1.5" y="1.5" width="9" height="9" /></svg>
          )}
        </button>
        <button type="button" className="is-close" aria-label="Schließen" title="Schließen" onClick={call("close")}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M1 1l10 10M11 1 1 11" /></svg>
        </button>
      </div>
    </div>
  );
}
