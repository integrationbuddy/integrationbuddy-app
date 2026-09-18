import { useState } from "react";
import Icon from "../common/Icon";
import { isTauri, invokeCommand } from "../../lib/tauri";
import type { SkillFileOutput } from "../../types";

const isDataUrl = (url: string) => url.startsWith("data:");

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Datei aus einem Skill (Angebot, Rechnung, Stundenzettel): Name, Typ, Speichern. */
export default function SkillOutputCard({ output }: { output: SkillFileOutput }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setState("busy");
    setError(null);
    try {
      if (isTauri() && isDataUrl(output.fileUrl)) {
        await invokeCommand("save_base64_file", { base64Data: output.fileUrl.split(",")[1], fileName: output.fileName });
      } else if (isTauri()) {
        await invokeCommand("download_file", { url: output.fileUrl, fileName: output.fileName });
      } else {
        const a = document.createElement("a");
        if (isDataUrl(output.fileUrl)) {
          const blob = new Blob([dataUrlToBytes(output.fileUrl) as unknown as ArrayBuffer], { type: output.mimeType });
          a.href = URL.createObjectURL(blob);
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } else {
          a.href = output.fileUrl;
          a.target = "_blank";
        }
        a.download = output.fileName;
        a.click();
      }
      setState("done");
    } catch (e) {
      setError("Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)));
      setState("idle");
    }
  };

  const typeLabel =
    output.mimeType === "application/pdf" ? "PDF-Dokument" :
    output.mimeType.startsWith("image/") ? "Bild" :
    output.mimeType.includes("word") ? "Word-Dokument" :
    output.mimeType.includes("sheet") || output.mimeType.includes("excel") ? "Excel-Tabelle" :
    "Datei";

  return (
    <div className="filecard">
      <span className="filecard__icon"><Icon name={output.mimeType.startsWith("image/") ? "image" : "doc"} /></span>
      <div className="min-w-0" style={{ flex: 1 }}>
        <div className="filecard__name" title={output.fileName}>{output.fileName}</div>
        <div className="filecard__meta">{typeLabel}</div>
        {error && <div className="filecard__err">{error}</div>}
      </div>
      <button type="button" className={`btn btn--sm ${state === "done" ? "btn--ghost" : "btn--primary"}`} onClick={download} disabled={state === "busy"}>
        <Icon name={state === "done" ? "check" : "download"} />
        {state === "busy" ? "Speichert …" : state === "done" ? "Gespeichert" : "Speichern"}
      </button>
    </div>
  );
}
