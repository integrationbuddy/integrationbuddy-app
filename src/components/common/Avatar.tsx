interface AvatarProps {
  src:     string | null;
  name:    string;
  size?:   number;
  variant?: "user" | "ai";
  className?: string;
}

/** Displays a circular avatar — image if available, else coloured initials. */
export default function Avatar({
  src,
  name,
  size = 36,
  variant = "user",
  className = "",
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bg =
    variant === "user"
      ? "linear-gradient(135deg, #6D5BFF 0%, #4F3FCC 100%)"
      : "linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)";

  const ringStyle =
    variant === "user"
      ? "0 0 0 2px var(--bg-1), 0 0 0 3px rgba(109,91,255,0.35)"
      : "0 0 0 2px var(--bg-1), 0 0 0 3px rgba(45,212,191,0.3)";

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none ${className}`}
      style={{
        width:     size,
        height:    size,
        background: src ? undefined : bg,
        boxShadow: ringStyle,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span
          className="font-display font-semibold text-white leading-none"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
