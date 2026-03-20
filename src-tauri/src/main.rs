// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::command;

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct ChatPayload {
    message:    String,
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "userName")]
    user_name:  String,
    timestamp:  String,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeletePayload {
    session_id: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    message:    String,
    #[serde(rename = "sessionId")]
    session_id: String,
    #[serde(rename = "userName")]
    user_name:  String,
    timestamp:  String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Send a message to the configured n8n webhook and return the raw response.
///
/// Security:
///   - Only http:// and https:// schemes are allowed (no file://, javascript:/, etc.)
///   - 120-second timeout prevents indefinite hangs
///   - User-Agent is set to identify the app
#[command]
async fn send_message_to_webhook(
    url:     String,
    payload: ChatPayload,
) -> Result<String, String> {
    // ── URL validation ────────────────────────────────────────────────────
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige URL — bitte prüfen Sie die Webhook-Adresse.".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => {
            return Err(format!(
                "Nur HTTP und HTTPS sind erlaubt. Erhalten: '{}'",
                scheme
            ))
        }
    }

    // ── Build HTTP client ─────────────────────────────────────────────────
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    // ── Build request body ────────────────────────────────────────────────
    let body = ChatRequest {
        message:    payload.message,
        session_id: payload.session_id,
        user_name:  payload.user_name,
        timestamp:  payload.timestamp,
    };

    // ── Execute request ───────────────────────────────────────────────────
    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Verbindungsfehler: {}", e))?;

    let status = response.status();

    let text = response
        .text()
        .await
        .map_err(|e| format!("Lesefehler: {}", e))?;

    if status.is_success() {
        Ok(text)
    } else {
        Err(format!("Server-Fehler {}: {}", status.as_u16(), text))
    }
}

/// Delete a session on the n8n server by sending { session_id } to the delete endpoint.
#[command]
async fn delete_session_on_server(
    url:     String,
    payload: DeletePayload,
) -> Result<(), String> {
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige URL".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => return Err(format!("Ungültiges URL-Schema: '{}'", scheme)),
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Verbindungsfehler: {}", e))?;

    Ok(())
}

// ── Main ──────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            send_message_to_webhook,
            delete_session_on_server,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
