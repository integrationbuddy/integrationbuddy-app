import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  Message,
  UserProfile,
  AIProfile,
  ChatSession,
  ActiveSkill,
  SkillSession,
} from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

interface AppState extends AppSettings {
  sessions: ChatSession[];
  messages: Message[];        // current session's messages (always in sync)
  isTyping: boolean;
  activeSkillSession: SkillSession | null; // NICHT persistiert (resettet bei App-Start)

  // Actions – settings
  completeSetup: (data: {
    user: UserProfile;
    ai: AIProfile;
    webhookUrl: string;
    userId?: number | null;
    authToken?: string | null;
    userGroups?: string[];
    skills?: ActiveSkill[];
  }) => void;
  resetSetup: () => void;
  loadAuthToken: () => Promise<void>;

  // Actions – messages
  addMessage: (msg: Omit<Message, "id" | "timestamp">, targetSessionId?: string) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setTyping: (typing: boolean) => void;
  clearMessages: () => void;

  // Actions – sessions
  newSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  replaceWithServerSessions: (sessions: ChatSession[]) => void;

  // Actions – skills
  setAvailableSkills: (skills: ActiveSkill[]) => void;
  startSkillSession: (skillSlug: string) => void;
  updateSkillSession: (updates: Partial<SkillSession>) => void;
  endSkillSession: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Maximale Anzahl gespeicherter Chat-Verläufe (neueste behalten). */
const MAX_SESSIONS = 50;

/** Kürzt das sessions-Array auf MAX_SESSIONS (neueste zuerst). */
const trimSessions = (sessions: ChatSession[]): ChatSession[] =>
  sessions.length > MAX_SESSIONS ? sessions.slice(0, MAX_SESSIONS) : sessions;

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
  user:            { firstName: "", lastName: "", avatar: null },
  ai:              { name: "IntegrationBuddy", avatar: null },
  webhookUrl:      "",
  sessionId:       defaultSessionId,
  userId:          null,
  authToken:       null,
  userGroups:      [],
  availableSkills: [],
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultState,
      sessions:           [makeSession(defaultSessionId)],
      messages:           [],
      isTyping:           false,
      activeSkillSession: null,

      // ── Setup ──────────────────────────────────────────────────────────────

      completeSetup: ({
        user,
        ai,
        webhookUrl,
        userId = null,
        authToken = null,
        userGroups = [],
        skills = [],
      }) => {
        // Token im Windows Credential Manager speichern, nicht in localStorage
        if (authToken) {
          invoke("keyring_set_token", { token: authToken }).catch(console.error);
        } else {
          invoke("keyring_delete_token").catch(console.error);
        }
        const newId = uuidv4();
        set((s) => ({
          user,
          ai,
          webhookUrl,
          userId,
          authToken,
          userGroups,
          availableSkills: skills,
          isSetupComplete: true,
          sessionId: newId,
          sessions: trimSessions([makeSession(newId), ...s.sessions]),
          messages: [],
          activeSkillSession: null,
        }));
      },

      resetSetup: () => {
        invoke("keyring_delete_token").catch(console.error);
        const newId = uuidv4();
        set({
          ...defaultState,
          sessionId:          newId,
          sessions:           [makeSession(newId)],
          messages:           [],
          activeSkillSession: null,
        });
      },

      loadAuthToken: async () => {
        try {
          const token = await invoke<string | null>("keyring_get_token");
          set({ authToken: token ?? null });
        } catch {
          // Keyring nicht verfügbar — authToken bleibt null
        }
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
            const sessionMessages = isCurrentSession
              ? [...s.messages, message]
              : [...sess.messages, message];
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
          sessionId:          newId,
          sessions:           trimSessions([makeSession(newId), ...s.sessions]),
          messages:           [],
          activeSkillSession: null,
        }));
      },

      switchSession: (id) =>
        set((s) => {
          const target = s.sessions.find((sess) => sess.id === id);
          if (!target || target.id === s.sessionId) return {};
          return {
            sessionId:          id,
            messages:           target.messages,
            activeSkillSession: null, // Skill-Session beim Wechsel beenden
          };
        }),

      deleteSession: (id) =>
        set((s) => {
          const remaining = s.sessions.filter((sess) => sess.id !== id);
          if (remaining.length === 0) {
            const newId = uuidv4();
            return {
              sessions:           [makeSession(newId)],
              sessionId:          newId,
              messages:           [],
              activeSkillSession: null,
            };
          }
          if (id === s.sessionId) {
            const next = remaining[0];
            return {
              sessions:           remaining,
              sessionId:          next.id,
              messages:           next.messages,
              activeSkillSession: null,
            };
          }
          return { sessions: remaining };
        }),

      replaceWithServerSessions: (serverSessions) =>
        set(() => {
          if (serverSessions.length === 0) return {};
          const first = serverSessions[0];
          return {
            sessions:  serverSessions,
            sessionId: first.id,
            messages:  first.messages,
          };
        }),

      // ── Skills ─────────────────────────────────────────────────────────────

      setAvailableSkills: (skills) => set({ availableSkills: skills }),

      startSkillSession: (skillSlug) =>
        set({
          activeSkillSession: {
            skillSlug,
            status:        "collecting",
            collectedData: {},
          },
        }),

      updateSkillSession: (updates) =>
        set((s) => ({
          activeSkillSession: s.activeSkillSession
            ? { ...s.activeSkillSession, ...updates }
            : null,
        })),

      endSkillSession: () => set({ activeSkillSession: null }),
    }),
    {
      name:    "ib-storage-v1",
      version: 3,
      storage: createJSONStorage(() => localStorage),

      // Migrate: v1 → v2 (sessions array), v2 → v3 (availableSkills)
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const sessionId = (state.sessionId as string | undefined) ?? uuidv4();
          return { ...state, sessions: [makeSession(sessionId)], availableSkills: [] };
        }
        if (version < 3) {
          return { ...state, availableSkills: [] };
        }
        return state;
      },

      // Persist settings + session history
      // NICHT persistiert: isTyping, messages (ephemeral), activeSkillSession
      partialize: (s) => ({
        isSetupComplete: s.isSetupComplete,
        user:            s.user,
        ai:              s.ai,
        webhookUrl:      s.webhookUrl,
        sessionId:       s.sessionId,
        sessions:        s.sessions,
        userId:          s.userId,
        // authToken wird NICHT in localStorage gespeichert — nur im Windows Credential Manager
        userGroups:      s.userGroups,
        availableSkills: s.availableSkills,
      }),

      // Restore current session's messages after hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const current = state.sessions?.find((s) => s.id === state.sessionId);
          state.messages           = current?.messages ?? [];
          state.activeSkillSession = null; // immer zurücksetzen
        }
      },
    }
  )
);
