import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarUpload from "../common/AvatarUpload";
import { useAppStore } from "../../store/appStore";
import type { UserProfile, AIProfile, ActiveSkill } from "../../types";
import TitleBar from "../common/TitleBar";

const PORTAL_AUTH_URL = "https://portal.integrationbuddy.de/api/auth.php";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 0 | 1 | 2 | 3 | 4; // 0=welcome, 1=login, 2=profile, 3=ai, 4=connection

interface LoginResult {
  userId: number;
  authToken: string;
  userGroups: string[];
  skills: ActiveSkill[];
  firstName: string;
  lastName: string;
  webhookUrl: string;
  avatarUrl: string | null;
}

interface FormState {
  email: string;
  password: string;
  user: UserProfile;
  ai:   AIProfile;
  webhookUrl: string;
  loginResult: LoginResult | null;
}

// ── Slide animation variants ──────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({
    x:       dir > 0 ? 60 : -60,
    opacity: 0,
    scale:   0.97,
  }),
  center: {
    x:       0,
    opacity: 1,
    scale:   1,
  },
  exit: (dir: number) => ({
    x:       dir < 0 ? 60 : -60,
    opacity: 0,
    scale:   0.97,
  }),
};

const transition = { type: "spring", stiffness: 350, damping: 35 };

// ── URL validation ────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ── SetupPage ─────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const completeSetup = useAppStore((s) => s.completeSetup);
  const [step, setStep] = useState<Step>(0);
  const [dir,  setDir]  = useState(1);
  const [urlError, setUrlError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    email:       "",
    password:    "",
    user:        { firstName: "", lastName: "", avatar: null },
    ai:          { name: "IntegrationBuddy", avatar: null },
    webhookUrl:  "",
    loginResult: null,
  });

  // ── Navigation ──────────────────────────────────────────────────────────

  const go = (target: Step) => {
    setDir(target > step ? 1 : -1);
    setStep(target);
  };

  const next = () => go((step + 1) as Step);
  const back = () => go((step - 1) as Step);

  // ── Validation ──────────────────────────────────────────────────────────

  const isStep1Valid = form.email.trim() && form.password.length >= 1;
  const isStep2Valid = form.user.firstName.trim() && form.user.lastName.trim();
  const isStep3Valid = form.ai.name.trim();
  const isStep4Valid = isValidUrl(form.webhookUrl);

  const handleLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      let rawResponse: string;
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        // Tauri: nativer Rust-Request (kein CORS/CSP)
        const { invoke } = await import("@tauri-apps/api/core");
        rawResponse = await invoke<string>("authenticate_with_portal", {
          url:     PORTAL_AUTH_URL,
          payload: { email: form.email.trim(), password: form.password },
        });
      } else {
        const res = await fetch(PORTAL_AUTH_URL, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ email: form.email.trim(), password: form.password }),
        });
        rawResponse = await res.text();
      }

      const data = JSON.parse(rawResponse);
      if (!data.success) {
        if (data.must_change_password) {
          setLoginError("Bitte zuerst das Passwort im Portal ändern: " + (data.portal_url ?? ""));
        } else {
          setLoginError(data.error ?? "Anmeldung fehlgeschlagen.");
        }
        return;
      }

      // Avatar per Rust-Command als base64 laden (umgeht CSP img-src)
      let avatarBase64: string | null = null;
      if (data.avatarUrl && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          avatarBase64 = await invoke<string>("fetch_image_as_base64", { url: data.avatarUrl });
        } catch {
          // Avatar nicht kritisch — ignorieren
        }
      }

      const result: LoginResult = {
        userId:     data.userId,
        authToken:  data.token,
        userGroups: data.groups ?? [],
        skills:     data.skills ?? [],
        firstName:  data.firstName ?? "",
        lastName:   data.lastName ?? "",
        webhookUrl: data.webhookUrl ?? "",
        avatarUrl:  avatarBase64,
      };
      setForm((f) => ({
        ...f,
        loginResult: result,
        user: { firstName: result.firstName, lastName: result.lastName, avatar: result.avatarUrl },
        webhookUrl: result.webhookUrl || f.webhookUrl,
      }));
      go(2); // go to profile step
    } catch (e) {
      setLoginError("Fehler: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFinish = () => {
    if (!isStep4Valid) {
      setUrlError("Bitte geben Sie eine gültige HTTP/HTTPS-URL ein.");
      return;
    }
    const lr = form.loginResult;
    completeSetup({
      user:       { ...form.user, firstName: form.user.firstName.trim(), lastName: form.user.lastName.trim() },
      ai:         { ...form.ai, name: form.ai.name.trim() },
      webhookUrl: form.webhookUrl.trim(),
      userId:     lr?.userId ?? null,
      authToken:  lr?.authToken ?? null,
      userGroups: lr?.userGroups ?? [],
      skills:     lr?.skills ?? [],
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full w-full relative overflow-hidden"
      style={{ background: "var(--bg-0)" }}
    >
      {/* Titlebar */}
      <TitleBar />

      {/* Animated blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 700, height: 700,
            top: -200, left: -150,
            background: "radial-gradient(circle, rgba(109,91,255,0.18) 0%, transparent 70%)",
            animation: "blobFloat1 16s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600,
            bottom: -200, right: -100,
            background: "radial-gradient(circle, rgba(45,212,191,0.14) 0%, transparent 70%)",
            animation: "blobFloat2 20s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(109,91,255,0.06) 0%, transparent 70%)",
            animation: "blobFloat3 12s ease-in-out infinite",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">

          {/* Step dots (steps 1–3) */}
          {step > 0 && (
            <motion.div
              className="flex items-center justify-center gap-2 mb-10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {([1, 2, 3, 4] as const).map((s) => (
                <div
                  key={s}
                  className={`step-dot ${step === s ? "active" : step > s ? "done" : ""}`}
                />
              ))}
            </motion.div>
          )}

          {/* Card */}
          <div
            className="glass rounded-2xl overflow-hidden relative"
            style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)" }}
          >
            {/* Top accent line */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(109,91,255,0.6), rgba(45,212,191,0.4), transparent)" }}
            />

            <div className="p-8" style={{ minHeight: 380 }}>
              <AnimatePresence mode="wait" custom={dir}>
                {/* ── Step 0: Welcome ─────────────────────────────────── */}
                {step === 0 && (
                  <motion.div
                    key="welcome"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex flex-col items-center text-center gap-6"
                  >
                    {/* Logo orb */}
                    <div className="relative">
                      <motion.div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, rgba(109,91,255,0.2) 0%, rgba(45,212,191,0.15) 100%)",
                          border: "1px solid rgba(109,91,255,0.3)",
                          boxShadow: "0 0 40px rgba(109,91,255,0.25)",
                        }}
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                          <path
                            d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
                            stroke="url(#logoGrad)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            fill="none"
                          />
                          <circle cx="24" cy="24" r="6" fill="url(#logoGrad)" opacity="0.9" />
                          <path d="M24 14V18M24 30V34M14 24H18M30 24H34" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
                          <defs>
                            <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#8B7DFF" />
                              <stop offset="1" stopColor="#2DD4BF" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </motion.div>
                      {/* Rotating ring */}
                      <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                          border: "1px solid transparent",
                          background: "linear-gradient(var(--bg-2), var(--bg-2)) padding-box, linear-gradient(135deg, rgba(109,91,255,0.5), transparent 50%, rgba(45,212,191,0.4)) border-box",
                          animation: "spin 8s linear infinite",
                        }}
                      />
                    </div>

                    <div>
                      <h1
                        className="font-display text-3xl font-bold mb-3"
                        style={{ color: "var(--text-1)" }}
                      >
                        Willkommen bei{" "}
                        <span className="gradient-text">IntegrationBuddy</span>
                      </h1>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                        Richten Sie Ihren persönlichen KI-Assistenten in wenigen
                        Schritten ein. Ihre Daten bleiben 100% auf Ihrem Gerät.
                      </p>
                    </div>

                    {/* Security badge */}
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                      style={{
                        background: "rgba(52,211,153,0.08)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        color: "#34D399",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      DSGVO-konform · Ende-zu-Ende verschlüsselt
                    </div>

                    <motion.button
                      className="btn btn-primary w-full rounded-xl py-3 text-sm font-semibold"
                      onClick={next}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Einrichtung starten
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </motion.button>
                  </motion.div>
                )}

                {/* ── Step 1: Portal Login ─────────────────────────────── */}
                {step === 1 && (
                  <motion.div
                    key="login"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex flex-col gap-6"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
                        Anmelden
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-2)" }}>
                        Melden Sie sich mit Ihren Portal-Zugangsdaten an.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                          E-Mail *
                        </label>
                        <input
                          className="input-field rounded-xl px-3 py-2.5 text-sm w-full"
                          type="email"
                          placeholder="max@firma.de"
                          value={form.email}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, email: e.target.value }));
                            setLoginError("");
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                          Passwort *
                        </label>
                        <input
                          className="input-field rounded-xl px-3 py-2.5 text-sm w-full"
                          type="password"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, password: e.target.value }));
                            setLoginError("");
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter" && isStep1Valid) handleLogin(); }}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {loginError && (
                        <motion.p
                          className="text-xs px-3 py-2 rounded-lg"
                          style={{ color: "#F87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {loginError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-3 mt-2">
                      <button className="btn btn-ghost rounded-xl px-4 py-2.5 text-sm flex-1" onClick={back}>
                        Zurück
                      </button>
                      <motion.button
                        className="btn btn-primary rounded-xl px-4 py-2.5 text-sm flex-[2]"
                        onClick={handleLogin}
                        disabled={!isStep1Valid || loginLoading}
                        style={{ opacity: (isStep1Valid && !loginLoading) ? 1 : 0.4, cursor: (isStep1Valid && !loginLoading) ? "pointer" : "not-allowed" }}
                        whileHover={isStep1Valid ? { scale: 1.02 } : {}}
                        whileTap={isStep1Valid ? { scale: 0.98 } : {}}
                      >
                        {loginLoading ? "Wird geprüft …" : "Anmelden"}
                        {!loginLoading && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: User Profile ─────────────────────────────── */}
                {step === 2 && (
                  <motion.div
                    key="profile"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex flex-col gap-6"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
                        Ihr Profil
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-2)" }}>
                        Wie soll der Assistent Sie ansprechen?
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <AvatarUpload
                        value={form.user.avatar}
                        onChange={(v) => setForm((f) => ({ ...f, user: { ...f.user, avatar: v } }))}
                        label="Profilbild hochladen"
                        variant="user"
                        size={88}
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                          Vorname *
                        </label>
                        <input
                          className="input-field rounded-xl px-3 py-2.5 text-sm w-full"
                          placeholder="Max"
                          value={form.user.firstName}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, user: { ...f.user, firstName: e.target.value } }))
                          }
                          autoFocus
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                          Nachname *
                        </label>
                        <input
                          className="input-field rounded-xl px-3 py-2.5 text-sm w-full"
                          placeholder="Mustermann"
                          value={form.user.lastName}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, user: { ...f.user, lastName: e.target.value } }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <button className="btn btn-ghost rounded-xl px-4 py-2.5 text-sm flex-1" onClick={back}>
                        Zurück
                      </button>
                      <motion.button
                        className="btn btn-primary rounded-xl px-4 py-2.5 text-sm flex-[2]"
                        onClick={next}
                        disabled={!isStep2Valid}
                        style={{ opacity: isStep2Valid ? 1 : 0.4, cursor: isStep2Valid ? "pointer" : "not-allowed" }}
                        whileHover={isStep2Valid ? { scale: 1.02 } : {}}
                        whileTap={isStep2Valid ? { scale: 0.98 } : {}}
                      >
                        Weiter
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: AI Configuration ────────────────────────── */}
                {step === 3 && (
                  <motion.div
                    key="ai"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex flex-col gap-6"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
                        Ihr KI-Assistent
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-2)" }}>
                        Geben Sie Ihrem Assistenten eine Identität.
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <AvatarUpload
                        value={form.ai.avatar}
                        onChange={(v) => setForm((f) => ({ ...f, ai: { ...f.ai, avatar: v } }))}
                        label="KI-Profilbild hochladen"
                        variant="ai"
                        size={88}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                        Name des Assistenten *
                      </label>
                      <input
                        className="input-field rounded-xl px-3 py-2.5 text-sm w-full"
                        placeholder="IntegrationBuddy"
                        value={form.ai.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, ai: { ...f.ai, name: e.target.value } }))
                        }
                        autoFocus
                      />
                    </div>

                    {/* Preview */}
                    {form.ai.name && (
                      <motion.div
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.15)" }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #2DD4BF, #0D9488)" }}
                        >
                          {form.ai.avatar ? (
                            <img src={form.ai.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                          ) : (
                            <span className="text-white text-xs font-bold">{form.ai.name[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "#2DD4BF" }}>{form.ai.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-3)" }}>Ihr KI-Assistent · bereit zu helfen</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <button className="btn btn-ghost rounded-xl px-4 py-2.5 text-sm flex-1" onClick={back}>
                        Zurück
                      </button>
                      <motion.button
                        className="btn btn-primary rounded-xl px-4 py-2.5 text-sm flex-[2]"
                        onClick={next}
                        disabled={!isStep3Valid}
                        style={{ opacity: isStep3Valid ? 1 : 0.4, cursor: isStep3Valid ? "pointer" : "not-allowed" }}
                        whileHover={isStep3Valid ? { scale: 1.02 } : {}}
                        whileTap={isStep3Valid ? { scale: 0.98 } : {}}
                      >
                        Weiter
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 4: Connection ──────────────────────────────── */}
                {step === 4 && (
                  <motion.div
                    key="connection"
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={transition}
                    className="flex flex-col gap-6"
                  >
                    <div>
                      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
                        Verbindung
                      </h2>
                      <p className="text-sm" style={{ color: "var(--text-2)" }}>
                        Verbinden Sie sich mit Ihrem n8n-Workflow.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                        n8n Webhook-URL *
                      </label>
                      <div className="relative">
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: "var(--text-3)" }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                        </div>
                        <input
                          className="input-field rounded-xl pl-9 pr-3 py-2.5 text-sm w-full"
                          placeholder="https://n8n.example.com/webhook/..."
                          value={form.webhookUrl}
                          onChange={(e) => {
                            setForm((f) => ({ ...f, webhookUrl: e.target.value }));
                            setUrlError("");
                          }}
                          autoFocus
                          type="url"
                        />
                      </div>
                      <AnimatePresence>
                        {urlError && (
                          <motion.p
                            className="text-xs mt-1"
                            style={{ color: "#F87171" }}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            {urlError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Security notice */}
                    <div
                      className="rounded-xl p-4 flex gap-3"
                      style={{
                        background: "rgba(109,91,255,0.06)",
                        border: "1px solid rgba(109,91,255,0.15)",
                      }}
                    >
                      <svg
                        className="shrink-0 mt-0.5"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#8B7DFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: "#8B7DFF" }}>
                          Sicherheitshinweis
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
                          Die URL wird ausschließlich lokal auf Ihrem Gerät gespeichert.
                          Alle Anfragen werden verschlüsselt über die native App gesendet —
                          kein Browser, kein CORS.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <button className="btn btn-ghost rounded-xl px-4 py-2.5 text-sm flex-1" onClick={back}>
                        Zurück
                      </button>
                      <motion.button
                        className="btn btn-primary rounded-xl px-4 py-2.5 text-sm flex-[2]"
                        onClick={handleFinish}
                        disabled={!isStep4Valid}
                        style={{ opacity: isStep4Valid ? 1 : 0.4, cursor: isStep4Valid ? "pointer" : "not-allowed" }}
                        whileHover={isStep4Valid ? { scale: 1.02 } : {}}
                        whileTap={isStep4Valid ? { scale: 0.98 } : {}}
                      >
                        Einrichtung abschließen
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: "var(--text-3)" }}>
            IntegrationBuddy · Datenschutzkonformer KI-Assistent
          </p>
        </div>
      </div>
    </div>
  );
}
