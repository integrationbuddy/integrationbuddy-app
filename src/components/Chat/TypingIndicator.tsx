import { motion } from "framer-motion";
import Avatar from "../common/Avatar";
import { useAppStore } from "../../store/appStore";

export default function TypingIndicator() {
  const ai = useAppStore((s) => s.ai);

  return (
    <motion.div
      className="flex items-end gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
    >
      {/* AI Avatar */}
      <Avatar src={ai.avatar} name={ai.name} size={32} variant="ai" />

      {/* Bubble */}
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
        style={{
          background:  "rgba(17, 21, 35, 0.9)",
          border:      "1px solid rgba(255, 255, 255, 0.07)",
          borderLeft:  "2px solid var(--ai)",
          minWidth:    56,
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ width: 6, height: 6, background: "var(--ai)" }}
            animate={{
              y:       [0, -5, 0],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.1,
              repeat:   Infinity,
              delay:    i * 0.18,
              ease:     "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
