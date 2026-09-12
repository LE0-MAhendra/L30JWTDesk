use std::collections::BTreeSet;

use serde_json::Value;

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::{
    error::AppError,
    models::compare::{CompareTokensRequest, TokenDiffRow},
};

#[tauri::command]
pub fn compare_tokens(request: CompareTokensRequest) -> Result<Vec<TokenDiffRow>, AppError> {
    let payload_a = payload_json(&request.token_a, "Token A")?;
    let payload_b = payload_json(&request.token_b, "Token B")?;
    let object_a = payload_a
        .as_object()
        .ok_or_else(|| AppError::new("INVALID_PAYLOAD", "Token A payload is not a JSON object"))?;
    let object_b = payload_b
        .as_object()
        .ok_or_else(|| AppError::new("INVALID_PAYLOAD", "Token B payload is not a JSON object"))?;

    let keys: BTreeSet<&String> = object_a.keys().chain(object_b.keys()).collect();

    Ok(keys
        .into_iter()
        .map(|key| {
            let a = object_a.get(key);
            let b = object_b.get(key);
            TokenDiffRow {
                key: key.clone(),
                status: match (a, b) {
                    (Some(left), Some(right)) if left == right => "SAME",
                    (Some(_), Some(_)) => "MODIFIED",
                    (Some(_), None) => "REMOVED",
                    (None, Some(_)) => "ADDED",
                    (None, None) => "SAME",
                }
                .to_string(),
                a: a.map(display_value).unwrap_or_else(|| "—".to_string()),
                b: b.map(display_value).unwrap_or_else(|| "—".to_string()),
            }
        })
        .collect())
}

fn payload_json(input: &str, label: &str) -> Result<Value, AppError> {
    let token = normalize_token(input)?;
    let parts = split_token(&token)?;
    parse_json(
        &decode_segment(&parts.payload)?,
        &format!("{label} payload"),
    )
}

fn display_value(value: &Value) -> String {
    match value {
        Value::String(value) => value.clone(),
        Value::Array(values) => values
            .iter()
            .map(display_value)
            .collect::<Vec<_>>()
            .join(", "),
        _ => value.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::compare_tokens;
    use crate::models::compare::CompareTokensRequest;

    const TOKEN_A: &str = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImF1ZCI6ImFwaSIsInJvbGVzIjpbImFkbWluIl19.fake";
    const TOKEN_B: &str =
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImF1ZCI6IndlYiIsInNjb3BlIjoicmVhZCJ9.fake";

    #[test]
    fn compares_payload_claims() {
        let rows = compare_tokens(CompareTokensRequest {
            token_a: TOKEN_A.to_string(),
            token_b: TOKEN_B.to_string(),
        })
        .unwrap();

        assert!(rows
            .iter()
            .any(|row| row.key == "aud" && row.status == "MODIFIED"));
        assert!(rows
            .iter()
            .any(|row| row.key == "roles" && row.status == "REMOVED"));
        assert!(rows
            .iter()
            .any(|row| row.key == "scope" && row.status == "ADDED"));
    }
}
