mod commands;
mod error;
mod models;

use commands::jwks::verify_token_with_jwks;
use commands::jwt::inspect_token;
use commands::oidc::verify_token_with_oidc;
use commands::security::{analyze_security_findings, validate_token_claims};
use commands::verify::verify_token;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            inspect_token,
            verify_token,
            verify_token_with_jwks,
            verify_token_with_oidc,
            validate_token_claims,
            analyze_security_findings
        ])
        .run(tauri::generate_context!())
        .expect("error while running L30JWTDesk");
}
