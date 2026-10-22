use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use serde_json::json;
pub fn calculate_exe_hash() -> Result<String, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut file = File::open(&exe_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    let result = hasher.finalize();
    Ok(hex::encode(result))
}

pub async fn verify_with_supabase(hash: &str) -> Result<bool, String> {
    let supabase_url = "https://qldjeysusithpblfrmtq.supabase.co/rest/v1/rpc/verify_binary_integrity_secure";
    // Reemplaza esta cadena con tu VITE_SUPABASE_ANON_KEY o clave anon del proyecto
    let anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZGpleXN1c2l0aHBibGZybXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDgxMzQsImV4cCI6MjA5NDkyNDEzNH0.7kjQa-swcnkPDHjgf3oilj4_loGIY7tSbj1yeXIfar4";

    let client = reqwest::Client::new();
    let response = client
        .post(supabase_url)
        .header("apikey", anon_key)
        .header("Authorization", format!("Bearer {}", anon_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "p_fingerprint": hash,
            "p_version": env!("CARGO_PKG_VERSION"),
            "p_platform": std::env::consts::OS
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let is_valid = body["valid"].as_bool().unwrap_or(false);
        let message = body["message"].as_str().unwrap_or("");
        eprintln!("[SECURITY] Verificación Supabase: {} ({})", is_valid, message);
        Ok(is_valid)
    } else {
        Err(format!("Error HTTP Supabase: {}", response.status()))
    }
}
