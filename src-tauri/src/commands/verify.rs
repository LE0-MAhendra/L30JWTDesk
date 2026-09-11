use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::error::AppError;
use crate::models::verification::{VerificationRequest, VerificationResult, VerificationStatus};

type HmacSha256 = Hmac<Sha256>;

#[tauri::command]
pub fn verify_token(request: VerificationRequest) -> Result<VerificationResult, AppError> {
    let token = normalize_token(&request.token)?;
    let secret = request.secret.trim();

    if secret.is_empty() {
        return Err(AppError::new("EMPTY_SECRET", "Secret cannot be empty"));
    }

    let parts = split_token(&token)?;

    let header_raw = decode_segment(&parts.header)?;
    let header = parse_json(&header_raw, "JWT header")?;

    let algorithm = header
        .get("alg")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new("MISSING_ALGORITHM", "JWT header is missing alg"))?;

    if algorithm != "HS256" {
        return Err(AppError::new(
            "UNSUPPORTED_ALGORITHM",
            format!("Only HS256 is supported right now, got {algorithm}"),
        ));
    }

    let signature = URL_SAFE_NO_PAD
        .decode(&parts.signature)
        .map_err(|_| AppError::new("INVALID_BASE64URL", "Invalid JWT signature encoding"))?;

    let signing_input = format!("{}.{}", parts.header, parts.payload);

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| AppError::new("INVALID_SECRET", "Invalid HMAC secret"))?;

    mac.update(signing_input.as_bytes());

    let status = if mac.verify_slice(&signature).is_ok() {
        VerificationStatus::Verified
    } else {
        VerificationStatus::Failed
    };

    let message = match status {
        VerificationStatus::Verified => "Signature verified",
        VerificationStatus::Failed => "Signature does not match",
    };

    Ok(VerificationResult {
        status,
        algorithm: algorithm.to_string(),
        message: message.to_string(),
    })
}
