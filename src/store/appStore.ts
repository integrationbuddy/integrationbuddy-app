import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { isTauri, invokeCommand } from "../lib/tauri";
import type {
  AppSettings,
  Message,
  UserProfile,
  AIProfile,
  ChatSession,
  ActiveSkill,
  SkillSession,
  ThemeMode,
} from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUpdate {
  authToken: string;
  tokenExpiresAt: number | null;
  userId: number;
  email: string;
  userGroups: string[];
  skills: ActiveSkill[];
  webhookUrl?: string;
}

interface AppState extends AppSettings {
  sessions: ChatSession[];
  messages: Message[];        // current session's messages (always in sync)
  isTyping: boolean;
  activeSkillSession: SkillSession | null; // NICHT persistiert (resettet bei App-Start)
  authLoaded: boolean;        // Token aus dem Credential Manager gelesen

  // Actions – settings
  completeSetup: (data: {
    user: UserProfile;
    ai: AIProfile;
    webhookUrl: string;
    email: string;
    userId?: number | null;
    authToken?: string | null;
    tokenExpiresAt?: number | null;
    userGroups?: string[];
    skills?: ActiveSkill[];
  }) => void;
  resetSetup: () => void;
  loadAuthToken: () => Promise<void>;
  applyAuth: (auth: AuthUpdate) => void;
  setTheme: (theme: ThemeMode) => void;
  updateProfile: (user: Partial<UserProfile>, ai?: Partial<AIProfile>) => void;

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

const keyring = {
  set: (token: string) => (isTauri() ? invokeCommand("keyring_set_token", { token }).catch(console.error) : Promise.resolve()),
  del: () => (isTauri() ? invokeCommand("keyring_delete_token").catch(console.error) : Promise.resolve()),
  get: () => (isTauri() ? invokeCommand<string | null>("keyring_get_token") : Promise.resolve<string | null>(null)),
};

// Im Browser (Entwicklung) gibt es keinen Credential Manager; dort bleibt der Token in sessionStorage.
const devToken = {
  get: () => { try { return sessionStorage.getItem("ib-dev-token"); } catch { return null; } },
  set: (t: string | null) => { try { t ? sessionStorage.setItem("ib-dev-token", t) : sessionStorage.removeItem("ib-dev-token"); } catch { /* egal */ } },
};

// ── Defaults ─────────────────────────────────────────────────────────────────

const defaultSessionId = uuidv4();

const defaultState: AppSettings = {
  isSetupComplete: false,
  user:            { firstName: "", lastName: "", avatar: null },
  ai:              { name: "IntegrationBuddy", avatar: null },
  webhookUrl:      "",
  sessionId:       defaultSessionId,
  userId:          null,
  email:           "",
  authToken:       null,
  tokenExpiresAt:  null,
  userGroups:      [],
  availableSkills: [],
  theme:           "light",
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
      authLoaded:         false,

      // ── Setup ──────────────────────────────────────────────────────────────

      completeSetup: ({
        user,
        ai,
        webhookUrl,
        email,
        userId = null,
        authToken = null,
        tokenExpiresAt = null,
        userGroups = [],
        skills = [],
      }) => {
        // Token im Windows Credential Manager speichern, nicht in localStorage
        if (authToken) keyring.set(authToken); else keyring.del();
        if (!isTauri()) devToken.set(authToken);
        const newId = uuidv4();
        set((s) => ({
          user,
          ai,
          webhookUrl,
          email,
          userId,
          authToken,
          tokenExpiresAt,
          userGroups,
          availableSkills: skills,
          isSetupComplete: true,
          authLoaded: true,
          sessionId: newId,
          sessions: trimSessions([makeSession(newId), ...s.sessions]),
          messages: [],
          activeSkillSession: null,
        }));
      },

      resetSetup: () => {
        keyring.del();
        if (!isTauri()) devToken.set(null);
        const newId = uuidv4();
        set((s) => ({
          ...defaultState,
          theme:              s.theme,
          sessionId:          newId,
          sessions:           [makeSession(newId)],
          messages:           [],
          activeSkillSession: null,
          authLoaded:         true,
        }));
      },

      loadAuthToken: async () => {
        try {
          const token = isTauri() ? await keyring.get() : devToken.get();
          set({ authToken: token ?? null, authLoaded: true });
        } catch {
          set({ authLoaded: true });
        }
      },

      applyAuth: ({ authToken, tokenExpiresAt, userId, email, userGroups, skills, webhookUrl }) => {
        keyring.set(authToken);
        if (!isTauri()) devToken.set(authToken);
        set((s) => ({
          authToken,
          tokenExpiresAt,
          userId,
          email,
          userGroups,
          availableSkills: skills,
          webhookUrl: webhookUrl || s.webhookUrl,
          authLoaded: true,
        }));
      },

      setTheme: (theme) => set({ theme }),

      updateProfile: (user, ai) =>
        set((s) => ({
          user: { ...s.user, ...user },
          ai:   ai ? { ...s.ai, ...ai } : s.ai,
        })),

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
        set((s) => {
          // Ein leeres Gespräch gibt es höchstens einmal: dann nur dorthin wechseln.
          const empty = s.sessions.find((sess) => sess.messages.length === 0);
          if (empty) {
            return { sessionId: empty.id, messages: [], activeSkillSession: null };
          }
          const newId = uuidv4();
          return {
            sessionId:          newId,
            sessions:           trimSessions([makeSession(newId), ...s.sessions]),
            messages:           [],
            activeSkillSession: null,
          };
        });
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

      // Server-Verlauf ist die Referenz. Lokal bekannte Gespräche behalten aber ihre
      // Nachrichten, wenn die Anzahl übereinstimmt: dort stecken Quellen und Anhänge,
      // die der Server nicht speichert.
      replaceWithServerSessions: (serverSessions) =>
        set((s) => {
          if (serverSessions.length === 0) return {};
          const merged = serverSessions.map((srv) => {
            const local = s.sessions.find((l) => l.id === srv.id);
            if (local && local.messages.length === srv.messages.length && local.messages.length > 0) {
              return { ...srv, messages: local.messages };
            }
            return srv;
          });
          const currentEmpty = s.sessions.find((l) => l.id === s.sessionId && l.messages.length === 0);
          const sessions = currentEmpty ? [currentEmpty, ...merged.filter((m) => m.id !== currentEmpty.id)] : merged;
          const active = sessions.find((x) => x.id === s.sessionId) ?? sessions[0];
          return {
            sessions:  trimSessions(sessions),
            sessionId: active.id,
            messages:  active.messages,
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
      version: 4,
      storage: createJSONStorage(() => localStorage),

      // Migrate: v1 → v2 (sessions array), v2 → v3 (availableSkills), v3 → v4 (theme, email, tokenExpiresAt)
      migrate: (persisted: unknown, version: number) => {
        let state = persisted as Record<string, unknown>;
        if (version < 2) {
          const sessionId = (state.sessionId as string | undefined) ?? uuidv4();
          state = { ...state, sessions: [makeSession(sessionId)], availableSkills: [] };
        }
        if (version < 3) {
          state = { ...state, availableSkills: [] };
        }
        if (version < 4) {
          state = { ...state, theme: "light", email: "", tokenExpiresAt: null };
        }
        return state;
      },

      // Persist settings + session history
      // NICHT persistiert: isTyping, messages (ephemeral), activeSkillSession, authToken
      partialize: (s) => ({
        isSetupComplete: s.isSetupComplete,
        user:            s.user,
        ai:              s.ai,
        webhookUrl:      s.webhookUrl,
        sessionId:       s.sessionId,
        sessions:        s.sessions,
        userId:          s.userId,
        email:           s.email,
        tokenExpiresAt:  s.tokenExpiresAt,
        // authToken wird NICHT in localStorage gespeichert — nur im Windows Credential Manager
        userGroups:      s.userGroups,
        availableSkills: s.availableSkills,
        theme:           s.theme,
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
