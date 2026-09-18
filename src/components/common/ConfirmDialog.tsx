import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Rückfrage als natives <dialog class="dialog"> statt window.confirm (Design-System §9). */
export default function ConfirmDialog({ open, title, text, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={onCancel} onClose={onCancel} aria-labelledby="confirm-title">
      <div className={`dialog__box${danger ? " dialog__box--danger" : ""}`}>
        <h2 className="dialog__title" id="confirm-title">{title}</h2>
        <p className="dialog__sub">{text}</p>
        <div className="dialog__footer">
          <button type="button" className="btn btn--ghost" onClick={onCancel} autoFocus>Abbrechen</button>
          <button type="button" className={`btn ${danger ? "btn--danger" : "btn--primary"}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
