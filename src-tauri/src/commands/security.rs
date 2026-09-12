use chrono::Utc;
use serde_json::Value;

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::{
    error::AppError,
    models::security::{
        ClaimValidationRequest, ClaimValidationResult, ClaimValidationState, ClaimValidationStep,
        SecurityAnalysisRequest, SecurityFinding,
    },
};

#[tauri::command]
pub fn analyze_security_findings(
    request: SecurityAnalysisRequest,
) -> Result<Vec<SecurityFinding>, AppError> {
    let token = normalize_token(&request.token)?;
    let parts = split_token(&token)?;
    let header = parse_json(&decode_segment(&parts.header)?, "JWT header")?;
    let payload = parse_json(&decode_segment(&parts.payload)?, "JWT payload")?;
    let mut findings = Vec::new();

    match header.get("alg").and_then(Value::as_str) {
        Some("none") => findings.push(finding(
            "alg-none",
            "critical",
            "Unsigned token",
            "The token uses alg none.",
            "Reject unsigned tokens.",
        )),
        Some(alg) if alg.starts_with("HS") => findings.push(finding(
            "symmetric-alg",
            "warning",
            "Shared-secret algorithm",
            "HMAC verification requires the verifier to know the signing secret.",
            "Prefer RS256/JWKS for multi-service production systems.",
        )),
        Some(alg) if alg.starts_with("RS") => findings.push(finding(
            "rsa-alg",
            "passed",
            "Asymmetric signing algorithm",
            "RSA lets services verify tokens with a public key.",
            "Keep the private signing key isolated.",
        )),
        Some(alg) => findings.push(finding(
            "unknown-alg",
            "warning",
            "Less common algorithm",
            format!("Token uses {alg}."),
            "Confirm this algorithm is expected and supported.",
        )),
        None => findings.push(finding(
            "missing-alg",
            "high",
            "Missing algorithm",
            "The header has no alg value.",
            "Reject tokens without an explicit algorithm.",
        )),
    }

    if payload.get("exp").is_some() {
        findings.push(finding(
            "exp-present",
            "passed",
            "Expiration is present",
            "The token has a bounded validity window.",
            "No action required.",
        ));
    } else {
        findings.push(finding(
            "missing-exp",
            "high",
            "Missing expiration",
            "The token has no exp claim.",
            "Require exp for bearer tokens.",
        ));
    }

    if let (Some(iat), Some(exp)) = (
        payload.get("iat").and_then(Value::as_i64),
        payload.get("exp").and_then(Value::as_i64),
    ) {
        let minutes = (exp - iat) / 60;
        if minutes > 60 {
            findings.push(finding(
                "long-lifetime",
                "warning",
                "Long token lifetime",
                format!("The token lifetime is about {minutes} minutes."),
                "Use the shortest lifetime that fits the user flow.",
            ));
        }
    }

    if payload.get("email").is_some() || payload.get("phone").is_some() {
        findings.push(finding(
            "personal-data",
            "warning",
            "Payload contains personal data",
            "JWT payloads are encoded, not encrypted.",
            "Do not put sensitive personal data in bearer tokens.",
        ));
    }

    if has_admin_role(&payload) {
        findings.push(finding(
            "admin-role",
            "high",
            "Administrative role",
            "The token contains an admin role.",
            "Issue narrow tokens for routine API access.",
        ));
    }

    Ok(findings)
}

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

fn has_admin_role(payload: &Value) -> bool {
    payload
        .get("roles")
        .and_then(Value::as_array)
        .is_some_and(|roles| roles.iter().any(|role| role.as_str() == Some("admin")))
}

fn finding(
    id: impl Into<String>,
    severity: impl Into<String>,
    title: impl Into<String>,
    summary: impl Into<String>,
    recommendation: impl Into<String>,
) -> SecurityFinding {
    SecurityFinding {
        id: id.into(),
        severity: severity.into(),
        title: title.into(),
        summary: summary.into(),
        recommendation: recommendation.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::{analyze_security_findings, validate_token_claims};
    use crate::models::security::{
        ClaimValidationRequest, ClaimValidationState, SecurityAnalysisRequest,
    };

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

    #[test]
    fn reports_admin_role_and_expiration() {
        let findings = analyze_security_findings(SecurityAnalysisRequest {
            token: TOKEN.to_string(),
        })
        .unwrap();

        assert!(findings.iter().any(|finding| finding.id == "admin-role"));
        assert!(findings.iter().any(|finding| finding.id == "exp-present"));
    }
}
