import { useEffect, useState } from "react";

// ── Tauri window helpers (lazy-loaded) ────────────────────────────────────────

async function getAppWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return getCurrentWindow();
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TitleBarProps {
  title?: string;
  showTitle?: boolean;
}

export default function TitleBar({ title = "IntegrationBuddy", showTitle = false }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      const win = await getAppWindow();
      if (!win) return;

      setIsMaximized(await win.isMaximized());

      unlisten = await win.onResized(async () => {
        setIsMaximized(await win.isMaximized());
      });
    })();

    return () => { unlisten?.(); };
  }, []);

  const minimize = async () => {
    const win = await getAppWindow();
    await win?.minimize();
  };

  const toggleMaximize = async () => {
    const win = await getAppWindow();
    await win?.toggleMaximize();
  };

  const close = async () => {
    const win = await getAppWindow();
    await win?.close();
  };

  return (
    <div
      className="drag-region flex items-center justify-between h-10 px-4 shrink-0"
      style={{ background: "rgba(6, 8, 15, 0.9)" }}
    >
      {/* Logo / Title */}
      <div className="flex items-center gap-2 no-drag">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #6D5BFF 0%, #2DD4BF 100%)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1L10.5 3.5V8.5L6 11L1.5 8.5V3.5L6 1Z"
              stroke="white"
              strokeWidth="1.2"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="6" cy="6" r="1.5" fill="white" />
          </svg>
        </div>
        {showTitle && (
          <span
            className="text-xs font-display font-semibold"
            style={{ color: "var(--text-2)" }}
          >
            {title}
          </span>
        )}
      </div>

      {/* Window controls */}
      <div className="no-drag flex items-center gap-1">
        {/* Minimize */}
        <button
          onClick={minimize}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
          }}
          title="Minimieren"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={toggleMaximize}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
          }}
          title={isMaximized ? "Wiederherstellen" : "Maximieren"}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2.5" y="0.5" width="8" height="8" rx="1" />
              <path d="M0.5 2.5H2.5V10.5H8.5V8.5" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="0.5" y="0.5" width="10" height="10" rx="1.5" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={close}
          className="w-8 h-8 rounded-md flex items-center justify-center transition-all duration-150"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(248, 113, 113, 0.18)";
            (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
          }}
          title="Schließen"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="10" y2="10" />
            <line x1="10" y1="1" x2="1" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
