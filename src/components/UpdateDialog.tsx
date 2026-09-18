import { useEffect, useRef } from "react";
import Icon from "./common/Icon";
import { UpdateInfo } from "../hooks/useUpdater";

interface Props {
  info: UpdateInfo | null;
  installing: boolean;
  progress: number;
  error: string | null;
  onInstall: () => void;
  onDismiss: () => void;
}

/** Update-Hinweis als Dialog nach Design-System: Version, Hinweise, Fortschritt. */
export function UpdateDialog({ info, installing, progress, error, onInstall, onDismiss }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = Boolean(info?.available);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="update-title"
      onCancel={(e) => { if (installing) e.preventDefault(); else onDismiss(); }}
      onClose={() => { if (!installing) onDismiss(); }}
    >
      {info && (
        <div className="dialog__box">
          <div className="cluster" style={{ marginBottom: "var(--sp-3)" }}>
            <span className="avatar avatar--md avatar--soft"><Icon name="download" size={18} /></span>
            <div>
              <h2 className="dialog__title" id="update-title" style={{ margin: 0 }}>Update verfügbar</h2>
              <p className="muted text-sm" style={{ margin: 0 }}>Version {info.version}</p>
            </div>
          </div>

          {info.body ? (
            <div className="dialog__body-scroll">{info.body}</div>
          ) : (
            <p className="dialog__sub" style={{ margin: 0 }}>Keine Versionshinweise vorhanden.</p>
          )}

          {installing && (
            <div className="stack" style={{ gap: 6, marginTop: "var(--sp-4)" }}>
              <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${progress}%` }} /></div>
              <p className="muted text-xs" style={{ textAlign: "right" }}>{progress > 0 ? `${progress} % heruntergeladen` : "Wird vorbereitet …"}</p>
            </div>
          )}

          {error && (
            <div className="notice notice--err notice--compact" role="alert" style={{ marginTop: "var(--sp-4)" }}>
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}

          <div className="dialog__footer">
            <button type="button" className="btn btn--ghost" onClick={onDismiss} disabled={installing}>Später</button>
            <button type="button" className={`btn btn--primary btn--submit${installing ? " is-loading" : ""}`} onClick={onInstall} disabled={installing}>
              Jetzt installieren
              <span className="btn__spinner" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
