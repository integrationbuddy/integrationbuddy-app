import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { AppSettings, Message, UserProfile, AIProfile } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

interface AppState extends AppSettings {
  messages: Message[];
  isTyping: boolean;

  // Actions
  completeSetup: (data: {
    user: UserProfile;
    ai: AIProfile;
    webhookUrl: string;
  }) => void;
  resetSetup: () => void;
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const defaultState: AppSettings = {
  isSetupComplete: false,
  user: { firstName: "", lastName: "", avatar: null },
  ai:   { name: "IntegrationBuddy", avatar: null },
  webhookUrl: "",
  sessionId: uuidv4(),
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultState,
      messages: [],
      isTyping: false,

      completeSetup: ({ user, ai, webhookUrl }) =>
        set({
          user,
          ai,
          webhookUrl,
          isSetupComplete: true,
          sessionId: uuidv4(),
        }),

      resetSetup: () =>
        set({ ...defaultState, messages: [], sessionId: uuidv4() }),

      addMessage: (msgData) => {
        const id = uuidv4();
        const message: Message = {
          ...msgData,
          id,
          timestamp: new Date(),
        };
        set((s) => ({ messages: [...s.messages, message] }));
        return id;
      },

      updateMessage: (id, updates) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      setTyping: (typing) => set({ isTyping: typing }),

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "ib-storage-v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist settings, not ephemeral chat state
      partialize: (s) => ({
        isSetupComplete: s.isSetupComplete,
        user:            s.user,
        ai:              s.ai,
        webhookUrl:      s.webhookUrl,
        sessionId:       s.sessionId,
      }),
    }
  )
);
