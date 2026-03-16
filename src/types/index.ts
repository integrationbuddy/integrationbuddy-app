export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar: string | null; // base64-encoded data URL
}

export interface AIProfile {
  name: string;
  avatar: string | null; // base64-encoded data URL
}

export interface AppSettings {
  isSetupComplete: boolean;
  user: UserProfile;
  ai: AIProfile;
  webhookUrl: string;
  sessionId: string;
}

export type MessageRole = "user" | "assistant";
export type MessageStatus = "sending" | "sent" | "error";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
}

export interface WebhookPayload {
  message: string;
  sessionId: string;
  userName: string;
  timestamp: string;
}

/** Possible shapes n8n can return */
export interface WebhookResponseShape {
  response?: string;
  output?: string;
  message?: string;
  text?: string;
  answer?: string;
  result?: string;
  content?: string;
}
