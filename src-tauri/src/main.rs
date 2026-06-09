// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::command;

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct AuthPayload {
    email:    String,
    password: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeletePayload {
    session_id: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Send a message to the configured n8n webhook and return the raw response.
///
/// Accepts a generic JSON payload so it forwards all fields (including optional
/// `skill` context) without needing a rigid struct definition.
///
/// Security:
///   - Only http:// and https:// schemes are allowed
///   - 120-second timeout prevents indefinite hangs
#[command]
async fn send_message_to_webhook(
    url:     String,
    payload: serde_json::Value,
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

    // ── Execute request ───────────────────────────────────────────────────
    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&payload)
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

/// Authenticate a user against the IntegrationBuddy portal and return the raw JSON response.
#[command]
async fn authenticate_with_portal(
    url:     String,
    payload: AuthPayload,
) -> Result<String, String> {
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige URL".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => return Err(format!("Nur HTTP/HTTPS erlaubt. Erhalten: '{}'", scheme)),
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let body = serde_json::json!({
        "email":    payload.email,
        "password": payload.password,
    });

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Verbindungsfehler: {}", e))?;

    let text = response
        .text()
        .await
        .map_err(|e| format!("Lesefehler: {}", e))?;

    Ok(text)
}

/// Fetch an image URL and return it as a base64 data-URL string.
/// Used to load portal avatars without CSP img-src restrictions.
#[command]
async fn fetch_image_as_base64(url: String) -> Result<String, String> {
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige Bild-URL".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => return Err(format!("Nur HTTP/HTTPS erlaubt. Erhalten: '{}'", scheme)),
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Verbindungsfehler: {}", e))?;

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .split(';')
        .next()
        .unwrap_or("image/jpeg")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Lesefehler: {}", e))?;

    use base64::{engine::general_purpose, Engine as _};
    let b64 = general_purpose::STANDARD.encode(&bytes);

    Ok(format!("data:{};base64,{}", content_type, b64))
}

/// Send an arbitrary JSON body via POST and return the raw response text.
/// Used for generic API calls (e.g. loading chat history from n8n).
#[command]
async fn post_json(url: String, body: serde_json::Value) -> Result<String, String> {
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige URL".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => return Err(format!("Nur HTTP/HTTPS erlaubt. Erhalten: '{}'", scheme)),
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let response = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Verbindungsfehler: {}", e))?;

    let text = response
        .text()
        .await
        .map_err(|e| format!("Lesefehler: {}", e))?;

    Ok(text)
}

/// Decode a Base64 string and save it directly to the Downloads folder.
/// Wird verwendet wenn n8n die PDF als Base64 zurückgibt (kein MinIO nötig).
#[command]
async fn save_base64_file(base64_data: String, file_name: String) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};

    let safe_name: String = file_name
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, '.' | '-' | '_' | ' '))
        .collect();
    let safe_name = if safe_name.is_empty() { "download".to_string() } else { safe_name };

    let downloads_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join("Downloads")))
        .ok_or_else(|| "Downloads-Ordner nicht gefunden.".to_string())?;

    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| format!("Ordner erstellen fehlgeschlagen: {}", e))?;

    let target_path = downloads_dir.join(&safe_name);

    let bytes = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| format!("Base64-Dekodierung fehlgeschlagen: {}", e))?;

    std::fs::write(&target_path, &bytes)
        .map_err(|e| format!("Schreibfehler: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Download a file from a URL and save it to the user's Downloads folder.
/// Returns the full path where the file was saved.
#[command]
async fn download_file(url: String, file_name: String) -> Result<String, String> {
    let parsed = url
        .parse::<reqwest::Url>()
        .map_err(|_| "Ungültige Datei-URL".to_string())?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => return Err(format!("Nur HTTP/HTTPS erlaubt. Erhalten: '{}'", scheme)),
    }

    // Dateiname bereinigen (keine Pfad-Traversal-Zeichen)
    let safe_name: String = file_name
        .chars()
        .filter(|c| c.is_alphanumeric() || matches!(c, '.' | '-' | '_' | ' '))
        .collect();
    let safe_name = if safe_name.is_empty() { "download".to_string() } else { safe_name };

    // Downloads-Ordner ermitteln
    let downloads_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join("Downloads")))
        .ok_or_else(|| "Downloads-Ordner nicht gefunden.".to_string())?;

    std::fs::create_dir_all(&downloads_dir)
        .map_err(|e| format!("Ordner erstellen fehlgeschlagen: {}", e))?;

    let target_path = downloads_dir.join(&safe_name);

    // Datei herunterladen
    let client = Client::builder()
        .timeout(Duration::from_secs(60))
        .user_agent("IntegrationBuddy/1.0")
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download-Fehler: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server-Fehler {}", response.status().as_u16()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Lesefehler: {}", e))?;

    std::fs::write(&target_path, &bytes)
        .map_err(|e| format!("Schreibfehler: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
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
            authenticate_with_portal,
            fetch_image_as_base64,
            post_json,
            download_file,
            save_base64_file,
        ])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
