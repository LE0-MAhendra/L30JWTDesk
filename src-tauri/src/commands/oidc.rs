use reqwest::Url;

use crate::{
    commands::jwks::{validate_http_url, verify_token_with_jwks},
    error::AppError,
    models::verification::{
        JwksVerificationRequest, OidcDiscoveryResponse, OidcVerificationRequest, VerificationResult,
    },
};

#[tauri::command]
pub async fn verify_token_with_oidc(
    request: OidcVerificationRequest,
) -> Result<VerificationResult, AppError> {
    let issuer_url = request.issuer_url.trim().trim_end_matches('/');

    if issuer_url.is_empty() {
        return Err(AppError::new(
            "EMPTY_ISSUER_URL",
            "OIDC issuer URL cannot be empty",
        ));
    }

    validate_oidc_issuer_url(issuer_url)?;

    let discovery_url = format!("{issuer_url}/.well-known/openid-configuration");
    let discovery: OidcDiscoveryResponse = reqwest::get(&discovery_url)
        .await
        .map_err(|_| AppError::new("OIDC_DISCOVERY_FAILED", "Failed to fetch OIDC discovery"))?
        .json()
        .await
        .map_err(|_| AppError::new("INVALID_OIDC_DISCOVERY", "OIDC discovery is not valid JSON"))?;

    verify_token_with_jwks(JwksVerificationRequest {
        token: request.token,
        jwks_url: discovery.jwks_uri,
    })
    .await
}

fn validate_oidc_issuer_url(value: &str) -> Result<(), AppError> {
    validate_http_url(value, "OIDC issuer URL")?;

    let url = Url::parse(value).map_err(|_| {
        AppError::new(
            "INVALID_URL",
            "OIDC issuer URL must be a valid http or https URL",
        )
    })?;

    if url.query().is_some() || url.fragment().is_some() {
        return Err(AppError::new(
            "INVALID_URL",
            "OIDC issuer URL must not include a query string or fragment",
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_oidc_issuer_url;

    #[test]
    fn accepts_base_issuer_url() {
        assert!(validate_oidc_issuer_url("https://issuer.example.com").is_ok());
    }

    #[test]
    fn rejects_issuer_url_with_query() {
        assert!(validate_oidc_issuer_url("https://issuer.example.com?x=1").is_err());
    }
}
