import { useRef, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";

interface AvatarUploadProps {
  value: string | null;
  onChange: (base64: string | null) => void;
  name: string;
  variant?: "user" | "assistant";
}

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 256;

/** Verkleinert das Bild auf 256 px Kante, damit der Store klein bleibt. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Canvas nicht verfügbar")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden.")); };
    img.src = url;
  });
}

export default function AvatarUpload({ value, onChange, name, variant = "user" }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const processFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("image/")) { setError("Bitte wählen Sie eine Bilddatei."); return; }
    if (file.size > MAX_BYTES) { setError("Das Bild darf höchstens 5 MB groß sein."); return; }
    try {
      onChange(await shrink(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="setup__avatar">
      <Avatar src={value} name={name} size="lg" variant={variant} />
      <div className="stack" style={{ gap: 6 }}>
        <div className="setup__avatar-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" />
            {value ? "Bild ändern" : "Bild wählen"}
          </button>
          {value && (
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => onChange(null)}>
              Entfernen
            </button>
          )}
        </div>
        <p className={error ? "field__err" : "field__hint"}>{error || "Optional. PNG oder JPG, wird auf 256 px verkleinert."}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
