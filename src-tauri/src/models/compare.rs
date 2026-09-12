use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CompareTokensRequest {
    pub token_a: String,
    pub token_b: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenDiffRow {
    pub key: String,
    pub status: String,
    pub a: String,
    pub b: String,
}
