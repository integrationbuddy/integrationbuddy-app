# IntegrationBuddy Chat

Datenschutzkonformer KI-Chat-Assistent für Windows, gebaut mit Tauri 2 + React.

## Voraussetzungen

- **Node.js** >= 18
- **Rust** >= 1.77 (via [rustup.rs](https://rustup.rs))
- **Tauri CLI v2**: wird via `npm` installiert
- **Visual Studio C++ Build Tools** (Windows)

## Installation

```bash
npm install
```

## Icons generieren

Legen Sie eine Quelldatei `src-tauri/icons/app-icon.png` (1024×1024 px) ab und führen Sie aus:

```bash
npx tauri icon src-tauri/icons/app-icon.png
```

Das erstellt alle nötigen Icon-Formate automatisch.

## Entwicklung

```bash
npm run tauri dev
```

Öffnet das Tauri-Fenster mit Hot-Reload.

## Produktion (Build)

```bash
npm run tauri build
```

Erzeugt einen signierten Windows-Installer unter `src-tauri/target/release/bundle/`.

## Architektur

```
src/                     # React-Frontend (Vite + TypeScript)
├── components/
│   ├── Setup/           # Einrichtungsassistent (4 Schritte)
│   ├── Chat/            # Chat-Oberfläche
│   └── common/          # TitleBar, AvatarUpload, Avatar
├── hooks/
│   └── useWebhook.ts    # HTTP → Tauri-Rust-Backend
├── store/
│   └── appStore.ts      # Zustand + localStorage
└── types/               # TypeScript-Typen

src-tauri/               # Rust-Backend
└── src/main.rs          # send_message_to_webhook Command
```

## Sicherheit

| Merkmal | Details |
|---|---|
| **HTTP-Requests** | Ausschließlich über Rust (kein fetch im Browser) |
| **URL-Validierung** | Nur `http://` und `https://` erlaubt |
| **CSP** | Strict Content-Security-Policy konfiguriert |
| **Lokale Speicherung** | Alle Einstellungen bleiben auf dem Gerät (localStorage) |
| **Frameless Window** | Eigene Titelleiste, kein Betriebssystem-Overlay |
| **Kein Context-Menu** | Im Release-Build deaktiviert |

## n8n Webhook-Format

**Gesendeter Body (JSON):**
```json
{
  "message":   "Nutzertext",
  "sessionId": "uuid-v4",
  "userName":  "Vorname Nachname",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Erwartete Antwort:** Text oder JSON mit einem dieser Felder:
`response`, `output`, `message`, `text`, `answer`, `result`, `content`
