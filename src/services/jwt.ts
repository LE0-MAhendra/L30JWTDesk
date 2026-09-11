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
