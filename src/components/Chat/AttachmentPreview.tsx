import { useEffect, useState } from "react";
import Icon from "../common/Icon";
import { loadProtectedImage } from "../../lib/attachments";
import { useAppStore } from "../../store/appStore";
import type { ChatAttachment } from "../../types";

interface AttachmentPreviewProps {
  attachment: ChatAttachment;
  onOpen: (attachment: ChatAttachment, src: string | null) => void;
}

/** Vorschau eines Bildanhangs: Miniatur laden (mit Token), Klick öffnet die Großansicht. */
export default function AttachmentPreview({ attachment, onOpen }: AttachmentPreviewProps) {
  const authToken = useAppStore((s) => s.authToken);
  const [thumb, setThumb] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let alive = true;
    setThumb(null);
    setError(null);
    loadProtectedImage(attachment.thumb_url || attachment.url, authToken)
      .then((src) => { if (alive) setThumb(src); })
      .catch((e: unknown) => {
        if (!alive) return;
        const text = e instanceof Error ? e.message : String(e);
        setError(/401|403/.test(text) ? "Kein Zugriff auf dieses Bild." : "Bild konnte nicht geladen werden.");
      });
    return () => { alive = false; };
  }, [attachment.url, attachment.thumb_url, authToken]);

  const open = async () => {
    if (error || opening) return;
    setOpening(true);
    try {
      const full = await loadProtectedImage(attachment.url, authToken);
      onOpen(attachment, full);
    } catch {
      onOpen(attachment, thumb);
    } finally {
      setOpening(false);
    }
  };

  return (
    <figure className="attach">
      <button
        type="button"
        className="attach__frame"
        onClick={open}
        disabled={Boolean(error)}
        aria-label={`${attachment.title || attachment.file} vergrößern`}
      >
        {thumb && <img src={thumb} alt={attachment.title || attachment.file} draggable={false} />}
        {!thumb && !error && (
          <span className="attach__loading"><span className="spinner" /></span>
        )}
        {error && <span className="attach__error">{error}</span>}
        {thumb && (
          <span className="attach__zoom" aria-hidden="true">
            {opening ? <span className="spinner" style={{ borderColor: "rgba(255,255,255,0.35)", borderTopColor: "#fff", width: 14, height: 14 }} /> : <Icon name="zoom" />}
          </span>
        )}
      </button>
      <figcaption className="attach__cap" title={attachment.file}>
        <Icon name="image" />
        <span>{attachment.title || attachment.file}</span>
      </figcaption>
    </figure>
  );
}
