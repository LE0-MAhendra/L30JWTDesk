use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use num_bigint_dig::BigUint;
use reqwest::{Client, Url};
use rsa::RsaPublicKey;
use serde_json::Value;
use sha2::{Sha256, Sha384, Sha512};
use std::time::Duration;

use super::{
    helper::{decode_segment, normalize_token, parse_json, split_token},
    verify::verify_rsa_key,
};
use crate::{
    error::AppError,
    models::verification::{
        JwkKey, JwksResponse, JwksVerificationRequest, VerificationResult, VerificationStatus,
    },
};

#[tauri::command]
pub async fn verify_token_with_jwks(
    request: JwksVerificationRequest,
) -> Result<VerificationResult, AppError> {
    let token = normalize_token(&request.token)?;
    let jwks_url = request.jwks_url.trim();

    if jwks_url.is_empty() {
        return Err(AppError::new("EMPTY_JWKS_URL", "JWKS URL cannot be empty"));
    }

    validate_http_url(jwks_url, "JWKS URL")?;

    let parts = split_token(&token)?;
    let header_raw = decode_segment(&parts.header)?;
    let header = parse_json(&header_raw, "JWT header")?;

    let algorithm = header
        .get("alg")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new("MISSING_ALGORITHM", "JWT header is missing alg"))?;

    let kid = header
        .get("kid")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new("MISSING_KID", "JWT header is missing kid"))?;

    if !matches!(algorithm, "RS256" | "RS384" | "RS512") {
        return Err(AppError::new(
            "UNSUPPORTED_ALGORITHM",
            format!("JWKS verification only supports RS256, RS384, and RS512 right now, got {algorithm}"),
        ));
    }

    let jwks: JwksResponse = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|_| AppError::new("JWKS_FETCH_FAILED", "Failed to create JWKS client"))?
        .get(jwks_url)
        .send()
        .await
        .map_err(|_| AppError::new("JWKS_FETCH_FAILED", "Failed to fetch JWKS"))?
        .json()
        .await
        .map_err(|_| AppError::new("INVALID_JWKS", "JWKS response is not valid JSON"))?;

    let jwk = jwks
        .keys
        .iter()
        .find(|key| key.kid.as_deref() == Some(kid))
        .ok_or_else(|| AppError::new("KID_NOT_FOUND", "No matching key found in JWKS"))?;

    if jwk.kty != "RSA" {
        return Err(AppError::new(
            "UNSUPPORTED_JWK_KEY",
            "Only RSA JWK keys are supported",
        ));
    }

    let public_key = rsa_public_key_from_jwk(jwk)?;
    let signature = URL_SAFE_NO_PAD
        .decode(&parts.signature)
        .map_err(|_| AppError::new("INVALID_BASE64URL", "Invalid JWT signature encoding"))?;
    let signing_input = format!("{}.{}", parts.header, parts.payload);

    let verified = match algorithm {
        "RS256" => verify_rsa_key::<Sha256>(&public_key, signing_input.as_bytes(), &signature)?,
        "RS384" => verify_rsa_key::<Sha384>(&public_key, signing_input.as_bytes(), &signature)?,
        "RS512" => verify_rsa_key::<Sha512>(&public_key, signing_input.as_bytes(), &signature)?,
        _ => false,
    };

    Ok(VerificationResult {
        status: if verified {
            VerificationStatus::Verified
        } else {
            VerificationStatus::Failed
        },
        algorithm: algorithm.to_string(),
        message: if verified {
            "Signature verified".to_string()
        } else {
            "Signature does not match".to_string()
        },
    })
}

pub(super) fn validate_http_url(value: &str, label: &str) -> Result<(), AppError> {
    let url = Url::parse(value).map_err(|_| {
        AppError::new(
            "INVALID_URL",
            format!("{label} must be a valid http or https URL"),
        )
    })?;

    if !matches!(url.scheme(), "http" | "https") {
        return Err(AppError::new(
            "INVALID_URL",
            format!("{label} must use http or https"),
        ));
    }

    Ok(())
}

fn rsa_public_key_from_jwk(jwk: &JwkKey) -> Result<RsaPublicKey, AppError> {
    let n_bytes = URL_SAFE_NO_PAD
        .decode(&jwk.n)
        .map_err(|_| AppError::new("INVALID_JWK", "Invalid RSA modulus"))?;

    let e_bytes = URL_SAFE_NO_PAD
        .decode(&jwk.e)
        .map_err(|_| AppError::new("INVALID_JWK", "Invalid RSA exponent"))?;

    RsaPublicKey::new(
        BigUint::from_bytes_be(&n_bytes),
        BigUint::from_bytes_be(&e_bytes),
    )
    .map_err(|_| AppError::new("INVALID_JWK", "Invalid RSA public key"))
}

#[cfg(test)]
mod tests {
    use super::validate_http_url;

    #[test]
    fn accepts_http_urls() {
        assert!(
            validate_http_url("http://127.0.0.1:8787/.well-known/jwks.json", "JWKS URL").is_ok()
        );
    }

    #[test]
    fn rejects_non_http_urls() {
        assert!(validate_http_url("file:///tmp/jwks.json", "JWKS URL").is_err());
    }
}
