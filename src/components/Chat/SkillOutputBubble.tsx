import { useState } from "react";
import type { SkillFileOutput } from "../../types";

interface SkillOutputBubbleProps {
  output: SkillFileOutput;
}

const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Prüft ob fileUrl eine Base64-Data-URL ist */
const isDataUrl = (url: string) => url.startsWith("data:");

/** Extrahiert Base64-Bytes aus einer Data-URL */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  const binary  = atob(base64);
  const bytes   = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export default function SkillOutputBubble({ output }: SkillOutputBubbleProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      if (isTauri() && isDataUrl(output.fileUrl)) {
        // ── Tauri + Base64: direkt als Datei in Downloads speichern ────────
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_base64_file", {
          base64Data: output.fileUrl.split(",")[1],
          fileName:   output.fileName,
        });
      } else if (isTauri()) {
        // ── Tauri + HTTP-URL: herunterladen ──────────────────────────────
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("download_file", {
          url:      output.fileUrl,
          fileName: output.fileName,
        });
      } else {
        // ── Browser-Fallback: funktioniert mit Data-URL und HTTP-URL ────
        const bytes = isDataUrl(output.fileUrl)
          ? dataUrlToBytes(output.fileUrl)
          : null;

        if (bytes) {
          const blob = new Blob([bytes as unknown as ArrayBuffer], { type: output.mimeType });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href     = blobUrl;
          a.download = output.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } else {
          const a = document.createElement("a");
          a.href     = output.fileUrl;
          a.download = output.fileName;
          a.target   = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
      setDownloaded(true);
    } catch (e) {
      setError("Download fehlgeschlagen: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDownloading(false);
    }
  };

  const fileIcon =
    output.mimeType === "application/pdf" ? "📄" :
    output.mimeType.startsWith("image/")  ? "🖼️" :
    "📎";

  return (
    <div
      style={{
        marginTop:    10,
        padding:      "12px 16px",
        borderRadius: 12,
        background:   "linear-gradient(135deg, rgba(45,212,191,0.08) 0%, rgba(109,91,255,0.08) 100%)",
        border:       "1px solid rgba(45,212,191,0.25)",
        display:      "flex",
        alignItems:   "center",
        gap:          12,
        maxWidth:     340,
      }}
    >
      {/* Datei-Icon */}
      <div
        style={{
          width:          42,
          height:         42,
          borderRadius:   10,
          background:     "rgba(45,212,191,0.12)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "1.4rem",
          flexShrink:     0,
        }}
      >
        {fileIcon}
      </div>

      {/* Dateiinfo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize:     "0.82rem",
            fontWeight:   600,
            color:        "var(--text-1)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {output.fileName}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--ai)", marginTop: 2 }}>
          {output.mimeType === "application/pdf" ? "PDF-Dokument" : output.mimeType}
        </div>
        {error && (
          <div style={{ fontSize: "0.72rem", color: "#f87171", marginTop: 3 }}>
            {error}
          </div>
        )}
      </div>

      {/* Download-Button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        title={downloaded ? "Erneut herunterladen" : "Herunterladen"}
        style={{
          flexShrink:   0,
          padding:      "7px 14px",
          borderRadius: 8,
          border:       "none",
          background:   downloaded ? "rgba(45,212,191,0.15)" : "var(--ai)",
          color:        downloaded ? "var(--ai)" : "#06080F",
          fontWeight:   600,
          fontSize:     "0.78rem",
          cursor:       downloading ? "wait" : "pointer",
          transition:   "all .15s",
          whiteSpace:   "nowrap",
          display:      "flex",
          alignItems:   "center",
          gap:          5,
        }}
      >
        {downloading ? (
          <>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
            <span>Laden…</span>
          </>
        ) : downloaded ? (
          <>✓ Gespeichert</>
        ) : (
          <>↓ Download</>
        )}
      </button>
    </div>
  );
}
