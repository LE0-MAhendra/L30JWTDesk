use crate::{
    commands::jwks::verify_token_with_jwks,
    error::AppError,
    models::verification::{
        JwksVerificationRequest, OidcDiscoveryResponse, OidcVerificationRequest,
        VerificationResult,
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
