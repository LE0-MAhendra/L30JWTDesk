use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationRequest {
    pub token: String,
    pub secret: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VerificationStatus {
    Verified,
    Failed,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationResult {
    pub status: VerificationStatus,
    pub algorithm: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JwksVerificationRequest {
    pub token: String,
    pub jwks_url: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OidcVerificationRequest {
    pub token: String,
    pub issuer_url: String,
}

#[derive(Debug, Deserialize)]
pub struct OidcDiscoveryResponse {
    pub jwks_uri: String,
}

#[derive(Debug, Deserialize)]
pub struct JwksResponse {
    pub keys: Vec<JwkKey>,
}

#[derive(Debug, Deserialize)]
pub struct JwkKey {
    pub kid: Option<String>,
    pub kty: String,
    pub n: String,
    pub e: String,
}
