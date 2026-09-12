import { invoke } from "@tauri-apps/api/core";

export interface TokenMetadata {
  algorithm?: string | null;
  token_type?: string | null;
  key_id?: string | null;

  total_size: number;
  header_size: number;
  payload_size: number;
  signature_size: number;
}

export interface ClaimsAnalysis {
  issuer?: string | null;
  subject?: string | null;
  audience: string[];

  expiration?: number | null;
  issued_at?: number | null;
  not_before?: number | null;
  jwt_id?: string | null;

  scopes: string[];
  roles: string[];
  permissions: string[];
}

export type TokenStatus =
  | "active"
  | "expired"
  | "not_active_yet"
  | "unknown";

export interface TokenTimeline {
  issued_at?: number | null;
  not_before?: number | null;
  expires_at?: number | null;

  age_seconds?: number | null;
  remaining_seconds?: number | null;
  lifetime_seconds?: number | null;

  status: TokenStatus;
}

export interface JwtInspectionResult {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;

  header_raw: string;
  payload_raw: string;

  metadata: TokenMetadata;
  claims: ClaimsAnalysis;
  timeline: TokenTimeline;
}

export interface AppError {
  code: string;
  message: string;
}

export type VerificationStatus = "verified" | "failed";

export interface VerificationRequest {
  token: string;
  secret: string;
}

export interface JwksVerificationRequest {
  token: string;
  jwks_url: string;
}

export interface OidcVerificationRequest {
  token: string;
  issuer_url: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  algorithm: string;
  message: string;
}

export async function inspectToken(
  token: string
): Promise<JwtInspectionResult> {
  return await invoke<JwtInspectionResult>(
    "inspect_token",
    {
      token,
    }
  );
}

export async function verifyToken(
  request: VerificationRequest
): Promise<VerificationResult> {
  return await invoke<VerificationResult>("verify_token", { request });
}

export async function verifyTokenWithJwks(
  request: JwksVerificationRequest
): Promise<VerificationResult> {
  return await invoke<VerificationResult>("verify_token_with_jwks", { request });
}

export async function verifyTokenWithOidc(
  request: OidcVerificationRequest
): Promise<VerificationResult> {
  return await invoke<VerificationResult>("verify_token_with_oidc", { request });
}
