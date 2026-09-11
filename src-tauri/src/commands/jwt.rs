use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};

use chrono::Utc;
use serde_json::Value;

use crate::{
    error::AppError,
    models::jwt::{ClaimsAnalysis, JwtInspectionResult, JwtParts, TokenMetadata, TokenStatus},
};

// This function is responsible for cleaning the user input.
// It supports all of these:
// eyJhbGciOi...
// Bearer eyJhbGciOi...
// Authorization: Bearer eyJhbGciOi...
// The final result is always just the raw JWT.
fn normalize_token(input: &str) -> Result<String, AppError> {
    let mut value = input.trim();
    if value.is_empty() {
        return Err(AppError::new("EMPTY_TOKEN", "Token cannot be Empty"));
    }
    if value.to_ascii_lowercase().starts_with("authorization:") {
        value = value
            .split_one(':')
            .map(|(_, token)| token.trim()) // here we are headers=beaerer,token . so we remove the initialbefore, and use only token.
            .ok_or_else(|| AppError::new("INVALID_AUTH_TOKEN", "Invalid Authorization Token"))?;
    }

    if value.len() >= 7 && value[..7].eq_ignore_ascii_case("bearer") {
        value = value[7..].trim();
    }

    if value.is_empty() {
        return Err(AppError::new(
            "EMPTY_TOKEN",
            "No JWT was found in the input",
        ));
    }
    ok(value.to_string())
}

// A signed JWT normally looks like:
// HEADER.PAYLOAD.SIGNATURE
fn split_token(token: &str) -> Result<JwtParts, AppError> {
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

// This converts something like:
// eyJhbGciOiJIUzI1NiJ9

// into:

// {
//   "alg": "HS256"
// }
fn decode_segment(segment: &str) -> Result<String, AppError> {
    let decoded = URL_SAFE_NO_PAD
        .decode(segment)
        .map_err(|_| AppError::new("INVALID_BASE64URL", "Failed to decode JWT segment"))?;

    String::from_utf8(decoded)
        .map_err(|_| AppError::new("INVALID_UTF8", "Decoded JWT segment is not valid UTF-8"))
}

fn parse_json(input: &str, part: &str) -> Result<Value, AppError> {
    serde_json::from_str(input)
        .map_err(|_| AppError::new("INVALID_JSON", format!("{part} is not valid JSON")))
}

// This is needed because aud may be either:

// "aud": "college-api"

// or:

// "aud": [
//   "college-api",
//   "college-web"
// ]

// We normalize both into:

// Vec<String>
fn extract_audience(payload: &Value) -> Vec<String> {
    match payload.get("aud") {
        Some(Value::String(value)) => {
            vec![value.clone()]
        }

        Some(Value::Array(values)) => values
            .iter()
            .filter_map(|value| value.as_str().map(ToString::to_string))
            .collect(),

        _ => Vec::new(),
    }
}

// This works for claims such as:
// scope
// scp
// roles
// permissions

// For example:

// "scope": "openid profile users:read"

// becomes:

// vec![
//     "openid",
//     "profile",
//     "users:read",
// ]
fn extract_string_list(payload: &Value, key: &str) -> Vec<String> {
    match payload.get(key) {
        Some(Value::String(value)) => value.split_whitespace().map(ToString::to_string).collect(),

        Some(Value::Array(values)) => values
            .iter()
            .filter_map(|value| value.as_str().map(ToString::to_string))
            .collect(),

        _ => Vec::new(),
    }
}

fn analyze_claims(payload: &Value) -> ClaimsAnalysis {
    let mut scopes = extract_string_list(payload, "scope");

    if scopes.is_empty() {
        scopes = extract_string_list(payload, "scp");
    }

    ClaimsAnalysis {
        issuer: payload
            .get("iss")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        subject: payload
            .get("sub")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        audience: extract_audience(payload),

        expiration: payload.get("exp").and_then(Value::as_i64),

        issued_at: payload.get("iat").and_then(Value::as_i64),

        not_before: payload.get("nbf").and_then(Value::as_i64),

        jwt_id: payload
            .get("jti")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        scopes,

        roles: extract_string_list(payload, "roles"),

        permissions: extract_string_list(payload, "permissions"),
    }
}

fn analyze_timeline(claims: &ClaimsAnalysis) -> TokenTimeline {
    let now = Utc::now().timestamp();

    let status = if let Some(exp) = claims.expiration {
        if exp <= now {
            TokenStatus::Expired
        } else if let Some(nbf) = claims.not_before {
            if nbf > now {
                TokenStatus::NotActiveYet
            } else {
                TokenStatus::Active
            }
        } else {
            TokenStatus::Active
        }
    } else if let Some(nbf) = claims.not_before {
        if nbf > now {
            TokenStatus::NotActiveYet
        } else {
            TokenStatus::Active
        }
    } else {
        TokenStatus::Unknown
    };

    let age_seconds = claims.issued_at.map(|iat| now - iat);

    let remaining_seconds = claims.expiration.map(|exp| exp - now);

    let lifetime_seconds = match (claims.issued_at, claims.expiration) {
        (Some(iat), Some(exp)) => Some(exp - iat),

        _ => None,
    };

    TokenTimeline {
        issued_at: claims.issued_at,
        not_before: claims.not_before,
        expires_at: claims.expiration,

        age_seconds,
        remaining_seconds,
        lifetime_seconds,

        status,
    }
}

pub fn inspect_token_internal(input: &str) -> Result<JwtInspectionResult, AppError> {
    let token = normalize_token(input)?;

    let parts = split_token(&token)?;

    let header_raw = decode_segment(&parts.header)?;

    let payload_raw = decode_segment(&parts.payload)?;

    let header = parse_json(&header_raw, "JWT header")?;

    let payload = parse_json(&payload_raw, "JWT payload")?;

    let claims = analyze_claims(&payload);

    let timeline = analyze_timeline(&claims);

    let metadata = TokenMetadata {
        algorithm: header
            .get("alg")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        token_type: header
            .get("typ")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        key_id: header
            .get("kid")
            .and_then(Value::as_str)
            .map(ToString::to_string),

        total_size: token.len(),

        header_size: parts.header.len(),

        payload_size: parts.payload.len(),

        signature_size: parts.signature.len(),
    };

    Ok(JwtInspectionResult {
        header,
        payload,

        header_raw,
        payload_raw,

        metadata,
        claims,
        timeline,
    })
}

#[tauri::command]
pub fn inspect_token(token: String) -> Result<JwtInspectionResult, AppError> {
    inspect_token_internal(&token)
}
