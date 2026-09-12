use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimValidationRequest {
    pub token: String,
    pub expected_issuer: Option<String>,
    pub expected_audience: Option<String>,
    pub clock_skew_seconds: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ClaimValidationState {
    Pass,
    Warning,
    Fail,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimValidationStep {
    pub label: String,
    pub state: ClaimValidationState,
    pub detail: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimValidationResult {
    pub decision: ClaimValidationState,
    pub primary_failure: Option<String>,
    pub steps: Vec<ClaimValidationStep>,
}
