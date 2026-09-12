use chrono::Utc;
use serde_json::Value;

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::{
    error::AppError,
    models::security::{
        ClaimValidationRequest, ClaimValidationResult, ClaimValidationState, ClaimValidationStep,
    },
};

#[tauri::command]
pub fn validate_token_claims(
    request: ClaimValidationRequest,
) -> Result<ClaimValidationResult, AppError> {
    let token = normalize_token(&request.token)?;
    let parts = split_token(&token)?;
    let payload_raw = decode_segment(&parts.payload)?;
    let payload = parse_json(&payload_raw, "JWT payload")?;
    let now = Utc::now().timestamp();
    let skew = request.clock_skew_seconds.unwrap_or(0).max(0);
    let mut steps = Vec::new();

    steps.push(validate_exp(&payload, now, skew));
    steps.push(validate_nbf(&payload, now, skew));

    if let Some(expected) = clean_optional(request.expected_issuer) {
        steps.push(validate_issuer(&payload, &expected));
    }

    if let Some(expected) = clean_optional(request.expected_audience) {
        steps.push(validate_audience(&payload, &expected));
    }

    let primary_failure = steps
        .iter()
        .find(|step| step.state == ClaimValidationState::Fail)
        .map(|step| step.label.clone());

    Ok(ClaimValidationResult {
        decision: if primary_failure.is_some() {
            ClaimValidationState::Fail
        } else {
            ClaimValidationState::Pass
        },
        primary_failure,
        steps,
    })
}

fn validate_exp(payload: &Value, now: i64, skew: i64) -> ClaimValidationStep {
    match payload.get("exp").and_then(Value::as_i64) {
        Some(exp) if exp + skew >= now => step(
            "Expiration",
            ClaimValidationState::Pass,
            "Token is not expired",
        ),
        Some(_) => step("Expiration", ClaimValidationState::Fail, "Token is expired"),
        None => step(
            "Expiration",
            ClaimValidationState::Warning,
            "Token has no exp claim",
        ),
    }
}

fn validate_nbf(payload: &Value, now: i64, skew: i64) -> ClaimValidationStep {
    match payload.get("nbf").and_then(Value::as_i64) {
        Some(nbf) if nbf - skew <= now => step(
            "Not before",
            ClaimValidationState::Pass,
            "Token is active now",
        ),
        Some(_) => step(
            "Not before",
            ClaimValidationState::Fail,
            "Token is not active yet",
        ),
        None => step(
            "Not before",
            ClaimValidationState::Warning,
            "Token has no nbf claim",
        ),
    }
}

fn validate_issuer(payload: &Value, expected: &str) -> ClaimValidationStep {
    match payload.get("iss").and_then(Value::as_str) {
        Some(actual) if actual == expected => {
            step("Issuer", ClaimValidationState::Pass, "Issuer matches")
        }
        Some(actual) => step(
            "Issuer",
            ClaimValidationState::Fail,
            format!("Expected {expected} · received {actual}"),
        ),
        None => step(
            "Issuer",
            ClaimValidationState::Fail,
            "Token has no iss claim",
        ),
    }
}

fn validate_audience(payload: &Value, expected: &str) -> ClaimValidationStep {
    let matches = match payload.get("aud") {
        Some(Value::String(actual)) => actual == expected,
        Some(Value::Array(values)) => values.iter().any(|value| value.as_str() == Some(expected)),
        _ => false,
    };

    if matches {
        step("Audience", ClaimValidationState::Pass, "Audience matches")
    } else {
        step(
            "Audience",
            ClaimValidationState::Fail,
            format!("Expected audience {expected}"),
        )
    }
}

fn clean_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn step(
    label: impl Into<String>,
    state: ClaimValidationState,
    detail: impl Into<String>,
) -> ClaimValidationStep {
    ClaimValidationStep {
        label: label.into(),
        state,
        detail: detail.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::validate_token_claims;
    use crate::models::security::{ClaimValidationRequest, ClaimValidationState};

    const TOKEN: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXRlc3Qta2V5In0.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.SUX74p4p5tBV_MWKlwxUBFZkL2Z8UyIfxgD3qh68x_A";

    #[test]
    fn passes_matching_claims() {
        let result = validate_token_claims(ClaimValidationRequest {
            token: TOKEN.to_string(),
            expected_issuer: Some("l30-dev".to_string()),
            expected_audience: Some("l30-jwt-desk".to_string()),
            clock_skew_seconds: Some(60),
        })
        .unwrap();

        assert_eq!(result.decision, ClaimValidationState::Pass);
    }

    #[test]
    fn fails_wrong_audience() {
        let result = validate_token_claims(ClaimValidationRequest {
            token: TOKEN.to_string(),
            expected_issuer: Some("l30-dev".to_string()),
            expected_audience: Some("wrong-audience".to_string()),
            clock_skew_seconds: Some(60),
        })
        .unwrap();

        assert_eq!(result.decision, ClaimValidationState::Fail);
        assert_eq!(result.primary_failure.as_deref(), Some("Audience"));
    }
}
