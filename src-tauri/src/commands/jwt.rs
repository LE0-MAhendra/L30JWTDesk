use chrono::Utc;
use serde_json::Value;

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::{
    error::AppError,
    models::jwt::{ClaimsAnalysis, JwtInspectionResult, TokenMetadata, TokenStatus, TokenTimeline},
};

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

#[cfg(test)]
mod tests {
    use super::inspect_token_internal;

    const TOKEN: &str =
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MjAwMDAwMDAwMH0.fake-signature";

    #[test]
    fn accepts_bearer_token_input() {
        assert!(inspect_token_internal(&format!("Bearer {TOKEN}")).is_ok());
    }

    #[test]
    fn accepts_authorization_bearer_input() {
        assert!(inspect_token_internal(&format!("Authorization: Bearer {TOKEN}")).is_ok());
    }
}
