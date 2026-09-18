export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar: string | null; // base64-encoded data URL
}

export interface AIProfile {
  name: string;
  avatar: string | null; // base64-encoded data URL
}

export type ThemeMode = "light" | "dark" | "system";

// ── Skills ───────────────────────────────────────────────────────────────────

export interface ActiveSkill {
  slug: string;
  name: string;
  icon: string;
  n8nWorkflowId: string;
  config: Record<string, unknown> | null;
  isConfigComplete: boolean;
}

export type SkillSessionStatus =
  | "idle"        // kein Skill aktiv
  | "collecting"  // LLM fragt nach Eingaben
  | "confirming"  // LLM hat alle Felder, wartet auf Nutzer-Bestätigung
  | "executing"   // wartet auf Skill-Ergebnis
  | "complete";   // Skill hat Output produziert

export interface SkillSession {
  skillSlug: string;
  status: SkillSessionStatus;
  collectedData: Record<string, unknown>;
  outputFileUrl?: string;
  outputFileName?: string;
}

export interface SkillFileOutput {
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

// ── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  isSetupComplete: boolean;
  user: UserProfile;
  ai: AIProfile;
  webhookUrl: string;
  sessionId: string;
  userId: number | null;
  email: string;
  authToken: string | null;
  tokenExpiresAt: number | null; // Unix-Sekunden, vom Portal geliefert (14 Tage)
  userGroups: string[];
  availableSkills: ActiveSkill[];
  theme: ThemeMode;
}

// ── Messages ─────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";
export type MessageStatus = "sending" | "sent" | "error";

export interface QuickReplyButton {
  label: string;
  value: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

/** Fundstelle aus der Wissensdatenbank, wie sie der Chat-Workflow liefert. */
export interface ChatSource {
  file: string;
  title?: string | null;
  page?: number | null;
  section?: string | null;
  similarity?: number | null;
}

/** Originaldatei, die zur Antwort gehört (bisher nur Bilder). Abruf nur mit gültigem Token. */
export interface ChatAttachment {
  type: "image";
  file: string;
  title?: string | null;
  mime?: string | null;
  url: string;
  thumb_url?: string | null;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  skillOutput?: SkillFileOutput; // gesetzt wenn eine Datei mit der Antwort geliefert wird
  buttons?: QuickReplyButton[]; // Quick-Reply-Buttons (z.B. Ja/Nein-Bestätigungen)
  selectOptions?: SelectOption[]; // Single-Select-Liste mit Bestätigen-Button (z.B. Messinstrumente)
  dateChannelOptions?: SelectOption[]; // Kanal-Auswahl + Datumspicker (z.B. Anfragedatum)
  sources?: ChatSource[];
  attachments?: ChatAttachment[];
}

export interface ChatSession {
  id: string;
  title: string | null;       // first user message (auto-set), null until first message
  createdAt: string;          // ISO string
  lastMessageAt: string | null;
  messages: Message[];
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export interface WebhookSkillPayload {
  slug: string;
  config: Record<string, unknown> | null;
  sessionStatus: SkillSessionStatus;
  collectedData: Record<string, unknown>;
}

export interface WebhookPayload {
  message: string;
  sessionId: string;
  userName: string;
  timestamp: string;
  userId: number | null;
  userGroups: string[];
  skill?: WebhookSkillPayload; // undefined = normaler RAG-Chat
}

/** Possible shapes n8n can return */
export interface WebhookResponseShape {
  success?: boolean;
  error?: string;
  code?: string;
  response?: string;
  output?: string;
  message?: string;
  text?: string;
  answer?: string;
  result?: string;
  content?: string;
  sources?: ChatSource[];
  attachments?: ChatAttachment[];
  // Skill-spezifische Felder
  skillOutput?: SkillFileOutput;
  skillAction?: "collecting" | "confirming" | "complete" | "cancelled";
  collectedData?: Record<string, unknown>;
  buttons?: QuickReplyButton[];
  selectOptions?: SelectOption[];
  dateChannelOptions?: SelectOption[];
}

/** Ergebnis von sendMessage() */
export interface SendMessageResult {
  text: string;
  sources?: ChatSource[];
  attachments?: ChatAttachment[];
  skillOutput?: SkillFileOutput;
  skillAction?: "collecting" | "confirming" | "complete" | "cancelled";
  collectedData?: Record<string, unknown>;
  buttons?: QuickReplyButton[];
  selectOptions?: SelectOption[];
  dateChannelOptions?: SelectOption[];
}

/** Grund, warum eine neue Anmeldung nötig ist. */
export type AuthReason = "expired" | "invalid" | "missing" | "expiring";
