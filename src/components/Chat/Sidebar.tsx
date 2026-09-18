import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../common/Icon";
import Avatar from "../common/Avatar";
import { useAppStore } from "../../store/appStore";
import { useWebhook } from "../../hooks/useWebhook";
import type { ChatSession, ThemeMode } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  const diff = Math.round((today - day) / 86_400_000);
  if (diff <= 0) return "Heute";
  if (diff === 1) return "Gestern";
  if (diff < 7) return "Diese Woche";
  if (diff < 31) return "Dieser Monat";
  return "Älter";
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  return diff <= 0 ? timeFmt.format(d) : dateFmt.format(d);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  onRelogin: () => void;
  onResetSettings: () => void;
}

export default function Sidebar({ onRelogin, onResetSettings }: SidebarProps) {
  const sessions = useAppStore((s) => s.sessions);
  const sessionId = useAppStore((s) => s.sessionId);
  const newSession = useAppStore((s) => s.newSession);
  const switchSession = useAppStore((s) => s.switchSession);
  const deleteSession = useAppStore((s) => s.deleteSession);
  const user = useAppStore((s) => s.user);
  const userGroups = useAppStore((s) => s.userGroups);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { deleteSessionOnServer } = useWebhook();

  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...sessions]
      .filter((s) => s.messages.length > 0 || s.id === sessionId)
      .filter((s) => !q || (s.title ?? "Neues Gespräch").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.lastMessageAt ?? b.createdAt).getTime() - new Date(a.lastMessageAt ?? a.createdAt).getTime());
    const out: { label: string; items: ChatSession[] }[] = [];
    for (const s of sorted) {
      const label = groupLabel(s.lastMessageAt ?? s.createdAt);
      const g = out[out.length - 1];
      if (g && g.label === label) g.items.push(s); else out.push({ label, items: [s] });
    }
    return out;
  }, [sessions, search, sessionId]);

  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Angemeldet";
  const roleLabel = userGroups.length ? userGroups.join(", ") : "Ohne Gruppenzuordnung";

  const themeItem = (mode: ThemeMode, label: string, icon: "sun" | "moon" | "monitor") => (
    <button type="button" role="menuitemradio" aria-checked={theme === mode} className="popover__item" onClick={() => { setTheme(mode); setMenuOpen(false); }}>
      <Icon name={icon} />
      {label}
    </button>
  );

  return (
    <aside className="app-side" aria-label="Gespräche">
      <div className="app-side__head">
        <button type="button" className="btn btn--primary btn--sm btn--full" onClick={newSession}>
          <Icon name="plus" />
          Neues Gespräch
        </button>
        <div className="search">
          <Icon name="search" />
          <input className="input input--sm" type="search" placeholder="Gespräche durchsuchen" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Gespräche durchsuchen" />
        </div>
      </div>

      <nav className="app-side__list">
        {groups.map((g) => (
          <div key={g.label} style={{ display: "contents" }}>
            <span className="nav-section-label">{g.label}</span>
            {g.items.map((sess) => {
              const active = sess.id === sessionId;
              return (
                <div key={sess.id} className={`convo${active ? " is-active" : ""}`} onClick={() => switchSession(sess.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); switchSession(sess.id); } }}
                  aria-current={active ? "true" : undefined}>
                  <b>{sess.title ?? "Neues Gespräch"}</b>
                  <span>{sess.messages.length === 0 ? "Noch keine Nachricht" : timeLabel(sess.lastMessageAt ?? sess.createdAt)}</span>
                  {sess.messages.length > 0 && (
                    <button
                      type="button"
                      className="convo__del"
                      aria-label="Gespräch löschen"
                      title="Gespräch löschen"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteSessionOnServer(sess.id);
                        deleteSession(sess.id);
                      }}
                    >
                      <Icon name="trash" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="app-side__empty">{search ? "Kein Gespräch passt zur Suche." : "Noch keine Gespräche."}</p>
        )}
      </nav>

      <div className="app-side__foot" ref={menuRef}>
        {menuOpen && (
          <div className="popover" role="menu">
            <span className="popover__label">Darstellung</span>
            {themeItem("light", "Hell", "sun")}
            {themeItem("dark", "Dunkel", "moon")}
            {themeItem("system", "Wie Windows", "monitor")}
            <div className="popover__sep" />
            <button type="button" role="menuitem" className="popover__item" onClick={() => { setMenuOpen(false); onRelogin(); }}>
              <Icon name="refresh" />
              Neu anmelden
            </button>
            <button type="button" role="menuitem" className="popover__item popover__item--danger" onClick={() => { setMenuOpen(false); onResetSettings(); }}>
              <Icon name="logout" />
              Abmelden und zurücksetzen
            </button>
          </div>
        )}
        <div className="sidebar__user" style={{ padding: 0 }}>
          <Avatar src={user.avatar} name={fullName} size="md" />
          <div className="min-w-0">
            <div className="sidebar__user-name" title={fullName}>{fullName}</div>
            <div className="sidebar__user-role" title={roleLabel}>{roleLabel}</div>
          </div>
          <button type="button" className="btn btn--quiet btn--icon btn--sm" aria-label="Einstellungen" title="Einstellungen" aria-expanded={menuOpen} style={{ marginLeft: "auto" }} onClick={() => setMenuOpen((o) => !o)}>
            <Icon name="settings" />
          </button>
        </div>
      </div>
    </aside>
  );
}
