import { useState } from "react";
import TitleBar from "../common/TitleBar";
import AvatarUpload from "../common/AvatarUpload";
import Icon from "../common/Icon";
import logo from "../../ds/assets/logo-mark.webp";
import { useAppStore } from "../../store/appStore";
import { loginToPortal, PortalLoginError, type PortalLogin } from "../../lib/portalAuth";

type Step = "login" | "profile";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Einrichtung in zwei Schritten: Anmeldung am Kundenportal, dann Profil bestätigen. */
export default function SetupPage() {
  const completeSetup = useAppStore((s) => s.completeSetup);
  const [step, setStep] = useState<Step>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState<PortalLogin | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [aiName, setAiName] = useState("IntegrationBuddy");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [advOpen, setAdvOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLoginError(null);
    try {
      const result = await loginToPortal(email, password);
      setLogin(result);
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setAvatar(result.avatar);
      setWebhookUrl(result.webhookUrl);
      setAdvOpen(!result.webhookUrl);
      setStep("profile");
    } catch (err) {
      if (err instanceof PortalLoginError) {
        setLoginError(err.mustChangePassword && err.portalUrl ? `${err.message} (${err.portalUrl})` : err.message);
      } else {
        setLoginError("Das Portal ist gerade nicht erreichbar. Bitte prüfen Sie Ihre Verbindung.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(webhookUrl)) {
      setUrlError("Bitte geben Sie eine gültige Adresse ein, die mit https:// beginnt.");
      return;
    }
    completeSetup({
      user: { firstName: firstName.trim(), lastName: lastName.trim(), avatar },
      ai: { name: aiName.trim() || "IntegrationBuddy", avatar: null },
      webhookUrl: webhookUrl.trim(),
      email: email.trim(),
      userId: login?.userId ?? null,
      authToken: login?.token ?? null,
      tokenExpiresAt: login?.tokenExpiresAt ?? null,
      userGroups: login?.groups ?? [],
      skills: login?.skills ?? [],
    });
  };

  const profileValid = firstName.trim() && lastName.trim() && aiName.trim() && webhookUrl.trim();

  return (
    <div className="setup">
      <TitleBar />
      <div className="setup__body">
        {step === "login" ? (
          <form className="login-card setup__card" onSubmit={handleLogin}>
            <div className="login-logo">
              <img src={logo} alt="" />
              <div>
                <div className="login-logo__name">IntegrationBuddy</div>
                <div className="login-logo__sub">Wissensassistent</div>
              </div>
            </div>
            <h1 className="login-title">Anmelden</h1>
            <p className="login-subtitle">Mit Ihren Zugangsdaten aus dem Kundenportal. Die Anmeldung gilt 14 Tage.</p>

            <div className="form">
              <div className="field">
                <label htmlFor="setup-email">E-Mail-Adresse</label>
                <input id="setup-email" type="email" autoComplete="username" placeholder="vorname.nachname@firma.de" value={email} onChange={(e) => { setEmail(e.target.value); setLoginError(null); }} required autoFocus />
              </div>
              <div className="field">
                <label htmlFor="setup-password">Passwort</label>
                <input id="setup-password" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(null); }} required />
              </div>
              {loginError && (
                <div className="notice notice--err notice--compact" role="alert">
                  <Icon name="alert" />
                  <span>{loginError}</span>
                </div>
              )}
              <button type="submit" className={`btn btn--primary btn--full btn--submit${busy ? " is-loading" : ""}`} disabled={busy || !email.trim() || !password}>
                Anmelden
                <span className="btn__spinner" aria-hidden="true" />
              </button>
            </div>

            <p className="login-footer">
              Die Anmeldung wird im Windows-Anmeldeinformationsspeicher abgelegt, nicht in Dateien der App.
            </p>
          </form>
        ) : (
          <form className="card card--lift setup__card setup__card--wide" onSubmit={handleFinish}>
            <div className="card__body">
              <div className="setup__steps"><i className="is-done" /><i className="is-done" />Schritt 2 von 2</div>
              <h1 className="login-title">Fast fertig</h1>
              <p className="login-subtitle">Prüfen Sie, wie der Assistent Sie anspricht. Alles lässt sich später ändern.</p>

              <div className="form">
                <AvatarUpload value={avatar} onChange={setAvatar} name={`${firstName} ${lastName}`.trim() || "Sie"} />

                <div className="form-row">
                  <div className="field">
                    <label htmlFor="setup-first">Vorname</label>
                    <input id="setup-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus={!firstName} />
                  </div>
                  <div className="field">
                    <label htmlFor="setup-last">Nachname</label>
                    <input id="setup-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="setup-ai">Name des Assistenten</label>
                  <input id="setup-ai" value={aiName} onChange={(e) => setAiName(e.target.value)} required />
                  <p className="field__hint">So erscheint der Assistent im Gespräch, zum Beispiel „IntegrationBuddy“ oder ein eigener Name.</p>
                </div>

                {login?.groups?.length ? (
                  <div className="field">
                    <span className="label">Ihre Wissensbereiche</span>
                    <div className="cluster" style={{ gap: 6 }}>
                      {login.groups.map((g) => <span key={g} className="badge badge--neutral badge--plain">{g}</span>)}
                    </div>
                  </div>
                ) : null}

                <details className="adv" open={advOpen} onToggle={(e) => setAdvOpen((e.currentTarget as HTMLDetailsElement).open)}>
                  <summary><Icon name="chevron" />Verbindung zum Assistenten</summary>
                  <div className={`field${urlError ? " is-invalid" : ""}`}>
                    <label htmlFor="setup-url">Adresse des Assistenten</label>
                    <input id="setup-url" type="url" placeholder="https://…/webhook/ib-chat" value={webhookUrl} onChange={(e) => { setWebhookUrl(e.target.value); setUrlError(null); }} required />
                    {urlError ? <p className="field__err">{urlError}</p> : <p className="field__hint">Wird vom Kundenportal vorgegeben. Nur ändern, wenn IntegrationBuddy Sie darum bittet.</p>}
                  </div>
                </details>
              </div>
            </div>
            <div className="card__footer">
              <button type="button" className="btn btn--ghost" onClick={() => setStep("login")}>
                <Icon name="back" />
                Zurück
              </button>
              <button type="submit" className="btn btn--primary" disabled={!profileValid}>
                Einrichtung abschließen
                <Icon name="check" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
