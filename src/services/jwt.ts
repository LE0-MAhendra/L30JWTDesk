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

export type ClaimValidationState = "pass" | "warning" | "fail";

export interface ClaimValidationRequest {
  token: string;
  expected_issuer?: string | null;
  expected_audience?: string | null;
  clock_skew_seconds?: number | null;
}

export interface ClaimValidationStep {
  label: string;
  state: ClaimValidationState;
  detail: string;
}

export interface ClaimValidationResult {
  decision: ClaimValidationState;
  primary_failure?: string | null;
  steps: ClaimValidationStep[];
}

export type ReportMode = "summary" | "redacted" | "full";

export interface DiagnosticReportRequest {
  validation: ClaimValidationResult;
  mode: ReportMode;
}

export interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "warning" | "info" | "passed";
  title: string;
  summary: string;
  recommendation: string;
}

export interface CompareTokensRequest {
  token_a: string;
  token_b: string;
}

export interface TokenDiffRow {
  key: string;
  status: "SAME" | "MODIFIED" | "ADDED" | "REMOVED";
  a: string;
  b: string;
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

export async function validateTokenClaims(
  request: ClaimValidationRequest
): Promise<ClaimValidationResult> {
  return await invoke<ClaimValidationResult>("validate_token_claims", { request });
}

export async function analyzeSecurityFindings(
  token: string
): Promise<SecurityFinding[]> {
  return await invoke<SecurityFinding[]>("analyze_security_findings", {
    request: { token },
  });
}

export async function compareTokens(
  request: CompareTokensRequest
): Promise<TokenDiffRow[]> {
  return await invoke<TokenDiffRow[]>("compare_tokens", { request });
}

export async function generateDiagnosticReport(
  request: DiagnosticReportRequest
): Promise<string> {
  return await invoke<string>("generate_diagnostic_report", { request });
}
