import { useEffect, useRef, useState } from "react";
import Icon from "../common/Icon";
import { useAppStore } from "../../store/appStore";
import { loginToPortal, PortalLoginError, formatExpiry } from "../../lib/portalAuth";
import { clearImageCache } from "../../lib/attachments";
import type { AuthReason } from "../../types";

interface LoginDialogProps {
  open: boolean;
  reason: AuthReason | null;
  /** Ohne gültige Anmeldung geht es nicht weiter: dann fehlt „Später“. */
  required: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TITLES: Record<AuthReason, string> = {
  expired: "Ihre Anmeldung ist abgelaufen",
  invalid: "Bitte melden Sie sich erneut an",
  missing: "Bitte melden Sie sich an",
  expiring: "Anmeldung verlängern",
};

/** Erneute Anmeldung am Kundenportal ohne die Einrichtung zu verlassen. */
export default function LoginDialog({ open, reason, required, onClose, onSuccess }: LoginDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const storedEmail = useAppStore((s) => s.email);
  const tokenExpiresAt = useAppStore((s) => s.tokenExpiresAt);
  const applyAuth = useAppStore((s) => s.applyAuth);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [email, setEmail] = useState(storedEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setEmail(storedEmail);
      setPassword("");
      setError(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, storedEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const login = await loginToPortal(email, password);
      applyAuth({
        authToken: login.token,
        tokenExpiresAt: login.tokenExpiresAt,
        userId: login.userId,
        email: email.trim(),
        userGroups: login.groups,
        skills: login.skills,
        webhookUrl: login.webhookUrl,
      });
      if (login.avatar) updateProfile({ avatar: login.avatar });
      clearImageCache();
      setPassword("");
      onSuccess();
    } catch (err) {
      if (err instanceof PortalLoginError) {
        setError(err.mustChangePassword && err.portalUrl ? `${err.message} (${err.portalUrl})` : err.message);
      } else {
        setError("Das Portal ist gerade nicht erreichbar. Bitte versuchen Sie es in Kürze erneut.");
      }
    } finally {
      setBusy(false);
    }
  };

  const sub =
    reason === "expired" ? "Anmeldungen gelten 14 Tage. Melden Sie sich bitte mit Ihren Zugangsdaten aus dem Kundenportal neu an."
    : reason === "expiring" && tokenExpiresAt ? `Ihre Anmeldung läuft am ${formatExpiry(tokenExpiresAt)} ab. Sie können sie jetzt schon verlängern.`
    : reason === "invalid" ? "Der Assistent hat Ihre Anmeldung nicht akzeptiert. Bitte melden Sie sich neu an."
    : "Damit der Assistent nur Ihre Dokumente durchsucht, ist eine Anmeldung nötig.";

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="login-title"
      onCancel={(e) => { if (required) e.preventDefault(); else onClose(); }}
      onClose={() => { if (!required) onClose(); }}
    >
      <form className="dialog__box" onSubmit={submit} method="dialog">
        <h2 className="dialog__title" id="login-title">{TITLES[reason ?? "missing"]}</h2>
        <p className="dialog__sub">{sub}</p>

        <div className="form">
          <div className="field">
            <label htmlFor="relogin-email">E-Mail-Adresse</label>
            <input id="relogin-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!storedEmail} />
          </div>
          <div className="field">
            <label htmlFor="relogin-password">Passwort</label>
            <input id="relogin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus={Boolean(storedEmail)} />
          </div>
          {error && (
            <div className="notice notice--err notice--compact" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="dialog__footer">
          {!required && (
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Später</button>
          )}
          <button type="submit" className={`btn btn--primary btn--submit${busy ? " is-loading" : ""}`} disabled={busy || !email.trim() || !password}>
            Anmelden
            <span className="btn__spinner" aria-hidden="true" />
          </button>
        </div>
      </form>
    </dialog>
  );
}
