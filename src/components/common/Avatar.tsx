import logo from "../../ds/assets/logo-mark.webp";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  /** assistant: ohne Bild erscheint die Logo-Marke statt Initialen */
  variant?: "user" | "assistant";
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

/** Avatar nach Design-System `.avatar`: Bild, sonst Initialen auf Akzent. */
export default function Avatar({ src, name, size = "md", variant = "user", className = "" }: AvatarProps) {
  const cls = ["avatar", size !== "lg" && `avatar--${size}`, className].filter(Boolean).join(" ");
  const image = src ?? (variant === "assistant" ? logo : null);
  return (
    <span className={cls} style={{ overflow: "hidden" }} aria-hidden="true">
      {image ? <img src={image} alt="" draggable={false} /> : initials(name)}
    </span>
  );
}
