use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use serde_json::Value;

use crate::{error::AppError, models::jwt::JwtParts};

pub(super) fn normalize_token(input: &str) -> Result<String, AppError> {
    let mut value = input.trim();

    if value.is_empty() {
        return Err(AppError::new("EMPTY_TOKEN", "Token cannot be Empty"));
    }

    if value.to_ascii_lowercase().starts_with("authorization:") {
        value = value
            .split_once(':')
            .map(|(_, token)| token.trim())
            .ok_or_else(|| AppError::new("INVALID_AUTH_TOKEN", "Invalid Authorization Token"))?;
    }

    let mut bearer_parts = value.splitn(2, char::is_whitespace);
    if bearer_parts
        .next()
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("bearer"))
    {
        value = bearer_parts.next().unwrap_or("").trim();
    }

    if value.is_empty() {
        return Err(AppError::new(
            "EMPTY_TOKEN",
            "No JWT was found in the input",
        ));
    }

    Ok(value.to_string())
}

pub(super) fn split_token(token: &str) -> Result<JwtParts, AppError> {
    let parts: Vec<&str> = token.split('.').collect();

    if parts.len() != 3 {
        return Err(AppError::new(
            "INVALID_TOKEN_STRUCTURE",
            format!("Expected 3 JWT segments but found {}", parts.len()),
        ));
    }

    Ok(JwtParts {
        header: parts[0].to_string(),
        payload: parts[1].to_string(),
        signature: parts[2].to_string(),
    })
}

pub(super) fn decode_segment(segment: &str) -> Result<String, AppError> {
    let decoded = URL_SAFE_NO_PAD
        .decode(segment)
        .map_err(|_| AppError::new("INVALID_BASE64URL", "Failed to decode JWT segment"))?;

    String::from_utf8(decoded)
        .map_err(|_| AppError::new("INVALID_UTF8", "Decoded JWT segment is not valid UTF-8"))
}

pub(super) fn parse_json(input: &str, part: &str) -> Result<Value, AppError> {
    serde_json::from_str(input)
        .map_err(|_| AppError::new("INVALID_JSON", format!("{part} is not valid JSON")))
}
