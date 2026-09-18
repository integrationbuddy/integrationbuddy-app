import { useEffect, useRef, useState } from "react";
import Icon from "../common/Icon";
import { isTauri, invokeCommand } from "../../lib/tauri";
import type { ChatAttachment } from "../../types";

export interface LightboxItem {
  attachment: ChatAttachment;
  /** Data-URL des Originals (bereits geladen) oder null, dann wird geladen. */
  src: string | null;
}

interface LightboxProps {
  item: LightboxItem | null;
  onClose: () => void;
}

/** Großansicht eines Bildanhangs als natives <dialog>: Esc, Klick daneben und der Knopf schließen. */
export default function Lightbox({ item, onClose }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
    setSaved("idle");
  }, [item]);

  const save = async () => {
    if (!item?.src) return;
    setSaved("busy");
    try {
      const base = item.attachment.file.replace(/\.[^.]+$/, "");
      const fileName = item.src.startsWith("data:image/png") ? `${base}.png` : item.attachment.file;
      if (isTauri()) {
        await invokeCommand("save_base64_file", { base64Data: item.src.split(",")[1], fileName });
      } else {
        const a = document.createElement("a");
        a.href = item.src;
        a.download = fileName;
        a.click();
      }
      setSaved("done");
    } catch {
      setSaved("error");
    }
  };

  return (
    <dialog ref={ref} className="lightbox" onClose={onClose} onCancel={onClose} aria-label="Bild in Großansicht">
      {item && (
        <div className="lightbox__stage">
          <div className="lightbox__bar">
            <Icon name="image" size={18} />
            <div className="min-w-0">
              <div className="lightbox__title">{item.attachment.title || item.attachment.file}</div>
              <div className="lightbox__file">{item.attachment.file}</div>
            </div>
            <span className="chat__bar-spacer" />
            <button type="button" className="btn btn--inverse btn--sm" onClick={save} disabled={!item.src || saved === "busy"}>
              <Icon name="download" />
              {saved === "done" ? "Gespeichert" : saved === "error" ? "Speichern fehlgeschlagen" : "Speichern"}
            </button>
            <button type="button" className="btn btn--inverse btn--sm btn--icon" aria-label="Schließen" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <div className="lightbox__body" onClick={onClose}>
            {item.src ? (
              <img src={item.src} alt={item.attachment.title || item.attachment.file} onClick={(e) => e.stopPropagation()} draggable={false} />
            ) : (
              <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
