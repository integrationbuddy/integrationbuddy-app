import { isTauri, invokeCommand } from "./tauri";
import type { ActiveSkill } from "../types";

// Kunden-spezifisch per Build-Env gesetzt (siehe .env.production / .env.<kunde>),
// Fallback ist nur für lokale Entwicklung gedacht.
export const PORTAL_AUTH_URL =
  import.meta.env.VITE_PORTAL_AUTH_URL ?? "https://portal.integrationbuddy.de/api/auth.php";

export interface PortalLogin {
  userId: number;
  token: string;
  tokenExpiresAt: number | null;
  groups: string[];
  skills: ActiveSkill[];
  firstName: string;
  lastName: string;
  webhookUrl: string;
  avatar: string | null; // data URL, bereits geladen
}

export class PortalLoginError extends Error {
  mustChangePassword: boolean;
  portalUrl?: string;
  constructor(message: string, mustChangePassword = false, portalUrl?: string) {
    super(message);
    this.name = "PortalLoginError";
    this.mustChangePassword = mustChangePassword;
    this.portalUrl = portalUrl;
  }
}

interface AuthResponse {
  success?: boolean;
  error?: string;
  must_change_password?: boolean;
  portal_url?: string;
  userId?: number;
  token?: string;
  tokenExpiresAt?: number;
  groups?: string[];
  skills?: ActiveSkill[];
  firstName?: string;
  lastName?: string;
  webhookUrl?: string;
  avatarUrl?: string | null;
}

/** Anmeldung am Kundenportal. Liefert Token (14 Tage), Gruppen, Skills und Profil. */
export async function loginToPortal(email: string, password: string): Promise<PortalLogin> {
  const payload = { email: email.trim(), password };
  let raw: string;

  if (isTauri()) {
    raw = await invokeCommand<string>("authenticate_with_portal", { url: PORTAL_AUTH_URL, payload });
  } else {
    const res = await fetch(PORTAL_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    raw = await res.text();
  }

  let data: AuthResponse;
  try {
    data = JSON.parse(raw) as AuthResponse;
  } catch {
    throw new PortalLoginError("Das Portal hat eine unerwartete Antwort geliefert.");
  }

  if (!data.success || !data.token || typeof data.userId !== "number") {
    if (data.must_change_password) {
      throw new PortalLoginError(
        "Bitte ändern Sie zuerst Ihr Passwort im Kundenportal.",
        true,
        data.portal_url
      );
    }
    throw new PortalLoginError(data.error ?? "Anmeldung fehlgeschlagen.");
  }

  // Avatar über Rust laden (umgeht CSP img-src); im Browser die URL direkt verwenden.
  let avatar: string | null = null;
  if (data.avatarUrl) {
    if (isTauri()) {
      try {
        avatar = await invokeCommand<string>("fetch_image_as_base64", { url: data.avatarUrl });
      } catch {
        avatar = null;
      }
    } else {
      avatar = data.avatarUrl;
    }
  }

  return {
    userId: data.userId,
    token: data.token,
    tokenExpiresAt: typeof data.tokenExpiresAt === "number" ? data.tokenExpiresAt : null,
    groups: data.groups ?? [],
    skills: data.skills ?? [],
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    webhookUrl: data.webhookUrl ?? "",
    avatar,
  };
}

/** Formatiert einen Unix-Zeitstempel (Sekunden) als deutsches Datum mit Uhrzeit. */
export function formatExpiry(ts: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts * 1000));
}
