use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VerificationRequest {
    pub token: String,
    pub secret: String,
}

#[derive(Debug, Serialize, Deserialize)]
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
