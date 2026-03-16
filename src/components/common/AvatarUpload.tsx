import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AvatarUploadProps {
  value:    string | null;
  onChange: (base64: string | null) => void;
  label?:   string;
  variant?: "user" | "ai";
  size?:    number;
}

export default function AvatarUpload({
  value,
  onChange,
  label = "Profilbild",
  variant = "user",
  size = 96,
}: AvatarUploadProps) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  const accentColor = variant === "user" ? "#6D5BFF" : "#2DD4BF";
  const dimColor    = variant === "user"
    ? "rgba(109, 91, 255, 0.15)"
    : "rgba(45, 212, 191, 0.12)";
  const ringClass = variant === "user" ? "avatar-ring" : "avatar-ring-ai";

  // ── File handling ────────────────────────────────────────────────────────

  const processFile = (file: File) => {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Bitte nur Bilddateien hochladen.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Bild muss kleiner als 5 MB sein.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(true);
  };

  const handleDragLeave = () => setDrag(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      <motion.div
        className="relative cursor-pointer select-none"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ width: size, height: size }}
      >
        {/* Avatar circle */}
        <div
          className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${value ? ringClass : ""}`}
          style={{
            background: value ? "transparent" : dimColor,
            border: `2px ${drag ? "dashed" : "solid"} ${drag ? accentColor : value ? "transparent" : `rgba(255,255,255,0.08)`}`,
            boxShadow: drag ? `0 0 0 4px ${accentColor}30` : undefined,
          }}
        >
          <AnimatePresence mode="wait">
            {value ? (
              <motion.img
                key="avatar"
                src={value}
                alt="Avatar"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              />
            ) : (
              <motion.div
                key="placeholder"
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.7 }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.55)" }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </motion.div>

        {/* Remove button */}
        {value && (
          <motion.button
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center no-drag"
            style={{ background: "#F87171", border: "2px solid var(--bg-1)" }}
            onClick={handleRemove}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            title="Bild entfernen"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </motion.button>
        )}
      </motion.div>

      {/* Label */}
      <div className="text-center">
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          {value ? "Klicken zum Ändern" : label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)", fontSize: "10px" }}>
          JPG, PNG, GIF · max. 5 MB
        </p>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs text-center"
            style={{ color: "#F87171" }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
