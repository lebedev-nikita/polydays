#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::{Client, Method};
use security_framework::passwords::{
    PasswordOptions, delete_generic_password, generic_password, set_generic_password,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::time::Duration;

const API: &str = env!("POLYDAYS_API_URL");
const SERVICE: &str = "app.polydays.desktop";
const CLIENT_ID: &str = "polydays-macos";

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Не удалось создать соединение.".into())
}

fn token() -> Result<Option<String>, String> {
    match generic_password(PasswordOptions::new_generic_password(SERVICE, API)) {
        Ok(bytes) => String::from_utf8(bytes)
            .map(Some)
            .map_err(|_| "Повторите вход в аккаунт.".into()),
        Err(error) if error.code() == -25300 => Ok(None),
        Err(_) => Err("Не удалось прочитать сессию из Связки ключей.".into()),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse {
    status: u16,
    body: String,
    content_type: String,
}

fn allowed_path(path: &str) -> bool {
    matches!(
        path.split('?').next().unwrap_or(""),
        "/api/config" | "/api/session" | "/trpc/sync"
    )
}

#[tauri::command]
async fn api_request(
    path: String,
    method: String,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    if !allowed_path(&path) || !matches!(method.as_str(), "GET" | "POST") {
        return Err("Недопустимый запрос.".into());
    }
    let mut request = client()?.request(
        Method::from_bytes(method.as_bytes()).map_err(|_| "Недопустимый метод.")?,
        format!("{API}{path}"),
    );
    if let Some(token) = token()? {
        request = request.bearer_auth(token);
    }
    if let Some(body) = body {
        request = request
            .header("Content-Type", "application/json")
            .body(body);
    }
    let response = request
        .send()
        .await
        .map_err(|_| "Сервер недоступен. Локальные данные сохранены.")?;
    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/json")
        .to_owned();
    let body = response
        .text()
        .await
        .map_err(|_| "Не удалось прочитать ответ сервера.")?;
    Ok(ApiResponse {
        status,
        body,
        content_type,
    })
}

#[derive(Deserialize)]
struct DeviceCode {
    device_code: String,
    verification_uri_complete: String,
    expires_in: u64,
    interval: u64,
}

#[tauri::command]
async fn sign_in() -> Result<(), String> {
    let client = client()?;
    let response = client
        .post(format!("{API}/api/auth/device/code"))
        .json(&json!({"client_id": CLIENT_ID}))
        .send()
        .await
        .map_err(|_| "Сервер недоступен. Проверьте Tailscale.")?;
    let code: DeviceCode = response
        .error_for_status()
        .map_err(|_| "Не удалось начать вход.")?
        .json()
        .await
        .map_err(|_| "Не удалось прочитать код входа.")?;
    let verification = reqwest::Url::parse(&code.verification_uri_complete)
        .map_err(|_| "Неверный адрес входа.")?;
    let base = reqwest::Url::parse(API).map_err(|_| "Неверный адрес сервера.")?;
    if verification.origin() != base.origin() || verification.path() != "/device" {
        return Err("Неверный адрес входа.".into());
    }
    open::that(verification.as_str()).map_err(|_| "Не удалось открыть браузер.")?;
    let deadline = tokio::time::Instant::now() + Duration::from_secs(code.expires_in.min(600));
    let mut interval = code.interval.max(5);
    while tokio::time::Instant::now() < deadline {
        tokio::time::sleep(Duration::from_secs(interval)).await;
        let response = client.post(format!("{API}/api/auth/device/token")).json(&json!({"client_id": CLIENT_ID,"device_code": code.device_code,"grant_type": "urn:ietf:params:oauth:grant-type:device_code"})).send().await.map_err(|_| "Соединение прервано. Повторите вход.")?;
        let successful = response.status().is_success();
        let result: Value = response
            .json()
            .await
            .map_err(|_| "Не удалось прочитать ответ входа.")?;
        if successful {
            let token = result["access_token"]
                .as_str()
                .filter(|s| !s.is_empty())
                .ok_or("Сервер не вернул сессию.")?;
            set_generic_password(SERVICE, API, token.as_bytes())
                .map_err(|_| "Не удалось сохранить сессию в Связке ключей.")?;
            return Ok(());
        }
        match result["error"].as_str() {
            Some("authorization_pending") => {}
            Some("slow_down") => interval += 5,
            Some("access_denied") => return Err("Вход отклонён в браузере.".into()),
            _ => return Err("Код входа истёк. Начните вход заново.".into()),
        }
    }
    Err("Время ожидания истекло. Начните вход заново.".into())
}

#[tauri::command]
async fn sign_out() -> Result<(), String> {
    if let Some(token) = token()? {
        client()?
            .post(format!("{API}/api/auth/sign-out"))
            .bearer_auth(token)
            .json(&json!({}))
            .send()
            .await
            .map_err(|_| "Не удалось выйти. Проверьте соединение.")?
            .error_for_status()
            .map_err(|_| "Не удалось завершить сессию.")?;
    }
    match delete_generic_password(SERVICE, API) {
        Ok(()) => Ok(()),
        Err(error) if error.code() == -25300 => Ok(()),
        Err(_) => Err("Не удалось удалить локальную сессию.".into()),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![api_request, sign_in, sign_out])
        .run(tauri::generate_context!())
        .expect("Polydays desktop failed");
}

#[cfg(test)]
mod tests {
    use super::allowed_path;
    #[test]
    fn restricts_native_transport_to_application_endpoints() {
        assert!(allowed_path("/trpc/sync?batch=1"));
        assert!(!allowed_path("//evil.example/trpc/sync"));
        assert!(!allowed_path("/api/auth/device/token"));
        assert!(!allowed_path("/trpc/sync/../other"));
    }
}
