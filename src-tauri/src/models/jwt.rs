use serde::{Deserialize, Serialize};
use serde_json::Value;

// Represents the three raw parts of a JWT.
//
// A normal signed JWT has exactly:
//
// header.payload.signature
//
// We keep the original encoded strings because they are useful later
// for verification and comparison.
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtParts {
    pub header: String,
    pub payload: String,
    pub signature: String,
}

// Stores useful metadata about the token.
//
// These values are mostly extracted from the JWT header
// or calculated from the raw token.
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenMetadata {
    // JWT signing algorithm.
    //
    // Examples:
    // HS256
    // RS256
    // ES256
    pub algorithm: Option<String>,

    // Token type from the "typ" header field.
    //
    // Common value:
    // JWT
    pub token_type: Option<String>,

    // Key ID from the "kid" header field.
    //
    // This becomes important later when we implement JWKS.
    pub key_id: Option<String>,

    // Total size of the JWT.
    pub total_size: usize,

    // Size of the encoded header segment.
    pub header_size: usize,

    // Size of the encoded payload segment.
    pub payload_size: usize,

    // Size of the encoded signature segment.
    pub signature_size: usize,
}

// Stores the standard JWT claims after we extract them
// from the payload.
//
// We keep this separate from the raw JSON payload because JWTs
// can also contain many custom claims.
#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimsAnalysis {
    // "iss" - Issuer.
    //
    // Identifies who created/issued the token.
    pub issuer: Option<String>,

    // "sub" - Subject.
    //
    // Usually identifies the user or entity represented by the token.
    pub subject: Option<String>,

    // "aud" - Audience.
    //
    // Audience may be either:
    //
    // "aud": "college-api"
    //
    // or:
    //
    // "aud": ["college-api", "college-web"]
    //
    // We normalize both cases into Vec<String>.
    pub audience: Vec<String>,

    // "exp" - Expiration time.
    //
    // Stored as a Unix timestamp.
    pub expiration: Option<i64>,

    // "iat" - Issued-at time.
    //
    // Stored as a Unix timestamp.
    pub issued_at: Option<i64>,

    // "nbf" - Not-before time.
    //
    // The token should not be accepted before this timestamp.
    pub not_before: Option<i64>,

    // "jti" - JWT ID.
    //
    // Usually a unique identifier for the token.
    pub jwt_id: Option<String>,

    // Authorization scopes extracted from claims such as:
    //
    // scope
    // scp
    pub scopes: Vec<String>,

    // Application roles.
    //
    // Example:
    //
    // ["admin", "editor"]
    pub roles: Vec<String>,

    // Explicit permissions.
    //
    // Example:
    //
    // ["users:read", "users:write"]
    pub permissions: Vec<String>,
}

// Represents the current time-based state of the token.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenStatus {
    // Token is currently usable based on its timing claims.
    Active,

    // exp is earlier than the current time.
    Expired,

    // nbf is later than the current time.
    NotActiveYet,

    // We cannot confidently determine the state,
    // usually because timing claims are missing.
    Unknown,
}

// Contains derived timing information.
//
// This powers the timeline UI and live expiry display.
#[derive(Debug, Serialize, Deserialize)]
pub struct TokenTimeline {
    // Original iat value.
    pub issued_at: Option<i64>,

    // Original nbf value.
    pub not_before: Option<i64>,

    // Original exp value.
    pub expires_at: Option<i64>,

    // How many seconds have passed since iat.
    pub age_seconds: Option<i64>,

    // How many seconds remain until exp.
    //
    // This may become negative for an expired token.
    pub remaining_seconds: Option<i64>,

    // Total intended lifetime:
    //
    // exp - iat
    pub lifetime_seconds: Option<i64>,

    // Current calculated token state.
    pub status: TokenStatus,
}

// Main response returned by the JWT inspection command.
//
// This is the object the frontend will receive after the user
// pastes a JWT and clicks Inspect.
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtInspectionResult {
    // Parsed JWT header as generic JSON.
    //
    // We use serde_json::Value because headers may contain
    // custom fields beyond alg, typ and kid.
    pub header: Value,

    // Parsed JWT payload as generic JSON.
    //
    // This allows us to preserve arbitrary custom claims.
    pub payload: Value,

    // Decoded header JSON as the original string.
    //
    // Useful for raw views in the frontend.
    pub header_raw: String,

    // Decoded payload JSON as the original string.
    pub payload_raw: String,

    // Extracted token metadata.
    pub metadata: TokenMetadata,

    // Interpreted standard/auth-related claims.
    pub claims: ClaimsAnalysis,

    // Derived timing information.
    pub timeline: TokenTimeline,
}
