import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { AppSettings, Message, UserProfile, AIProfile, ChatSession } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

interface AppState extends AppSettings {
  sessions: ChatSession[];
  messages: Message[];        // current session's messages (always in sync)
  isTyping: boolean;

  // Actions – settings
  completeSetup: (data: { user: UserProfile; ai: AIProfile; webhookUrl: string }) => void;
  resetSetup: () => void;

  // Actions – messages
  addMessage: (msg: Omit<Message, "id" | "timestamp">, targetSessionId?: string) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;

  // Actions – sessions
  newSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeSession = (id: string): ChatSession => ({
  id,
  title: null,
  createdAt: new Date().toISOString(),
  lastMessageAt: null,
  messages: [],
});

// ── Defaults ─────────────────────────────────────────────────────────────────

const defaultSessionId = uuidv4();

const defaultState: AppSettings = {
  isSetupComplete: false,
  user:       { firstName: "", lastName: "", avatar: null },
  ai:         { name: "IntegrationBuddy", avatar: null },
  webhookUrl: "",
  sessionId:  defaultSessionId,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultState,
      sessions: [makeSession(defaultSessionId)],
      messages: [],
      isTyping: false,

      // ── Setup ──────────────────────────────────────────────────────────────

      completeSetup: ({ user, ai, webhookUrl }) => {
        const newId = uuidv4();
        set((s) => ({
          user,
          ai,
          webhookUrl,
          isSetupComplete: true,
          sessionId: newId,
          sessions: [makeSession(newId), ...s.sessions],
          messages: [],
        }));
      },

      resetSetup: () => {
        const newId = uuidv4();
        set({
          ...defaultState,
          sessionId: newId,
          sessions:  [makeSession(newId)],
          messages:  [],
        });
      },

      // ── Messages ───────────────────────────────────────────────────────────

      addMessage: (msgData, targetSessionId?) => {
        const id = uuidv4();
        const message: Message = { ...msgData, id, timestamp: new Date() };

        set((s) => {
          const effectiveId = targetSessionId ?? s.sessionId;
          const isCurrentSession = effectiveId === s.sessionId;

          const sessions = s.sessions.map((sess) => {
            if (sess.id !== effectiveId) return sess;
            const sessionMessages = isCurrentSession ? [...s.messages, message] : [...sess.messages, message];
            return {
              ...sess,
              messages:      sessionMessages,
              title:         sess.title ?? (msgData.role === "user" ? msgData.content.slice(0, 80) : null),
              lastMessageAt: new Date().toISOString(),
            };
          });

          if (isCurrentSession) {
            return { messages: [...s.messages, message], sessions };
          }
          return { sessions };
        });

        return id;
      },

      updateMessage: (id, updates) =>
        set((s) => {
          const newMessages = s.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          );
          const sessions = s.sessions.map((sess) =>
            sess.id !== s.sessionId ? sess : { ...sess, messages: newMessages }
          );
          return { messages: newMessages, sessions };
        }),

      setTyping: (typing) => set({ isTyping: typing }),

      clearMessages: () =>
        set((s) => ({
          messages: [],
          sessions: s.sessions.map((sess) =>
            sess.id !== s.sessionId ? sess : {
              ...sess,
              messages:      [],
              title:         null,
              lastMessageAt: null,
            }
          ),
        })),

      // ── Sessions ───────────────────────────────────────────────────────────

      newSession: () => {
        const newId = uuidv4();
        set((s) => ({
          sessionId: newId,
          sessions:  [makeSession(newId), ...s.sessions],
          messages:  [],
        }));
      },

      switchSession: (id) =>
        set((s) => {
          const target = s.sessions.find((sess) => sess.id === id);
          if (!target || target.id === s.sessionId) return {};
          return { sessionId: id, messages: target.messages };
        }),

      deleteSession: (id) =>
        set((s) => {
          const remaining = s.sessions.filter((sess) => sess.id !== id);
          if (remaining.length === 0) {
            const newId = uuidv4();
            return { sessions: [makeSession(newId)], sessionId: newId, messages: [] };
          }
          if (id === s.sessionId) {
            const next = remaining[0];
            return { sessions: remaining, sessionId: next.id, messages: next.messages };
          }
          return { sessions: remaining };
        }),
    }),
    {
      name:    "ib-storage-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),

      // Migrate from v1 (no sessions) → v2 (sessions array)
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const sessionId = (state.sessionId as string | undefined) ?? uuidv4();
          return { ...state, sessions: [makeSession(sessionId)] };
        }
        return state;
      },

      // Persist settings + session history, but not ephemeral isTyping/messages
      partialize: (s) => ({
        isSetupComplete: s.isSetupComplete,
        user:            s.user,
        ai:              s.ai,
        webhookUrl:      s.webhookUrl,
        sessionId:       s.sessionId,
        sessions:        s.sessions,
      }),

      // Restore current session's messages after hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const current = state.sessions?.find((s) => s.id === state.sessionId);
          state.messages = current?.messages ?? [];
        }
      },
    }
  )
);
