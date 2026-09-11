import type { SecurityFinding, TokenInspection, ValidationStep } from './types';

// Frontend fixture boundary: replace these exports with typed Tauri invoke calls;
// token decoding and cryptographic logic intentionally do not live in TypeScript.

export const SAMPLE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImF1dGgta2V5LTIwMjYifQ.eyJzdWIiOiJ1c2VyXzI4NDEiLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJjb2xsZWdlLWFwaSIsImlhdCI6MTc4OTEyMDkyMCwiZXhwIjoxNzg5MTI0NTIwLCJuYmYiOjE3ODkxMjA5MjAsInJvbGVzIjpbImFkbWluIiwicmV2aWV3ZXIiXSwic2NvcGUiOiJ1c2VyczpyZWFkIHVzZXJzOndyaXRlIHByb2ZpbGUifQ.ZmljdGlvbmFsLXNpZ25hdHVyZS1mb3ItdWktZGV2ZWxvcG1lbnQ';

const now = Math.floor(Date.now() / 1000);

export const mockInspection = (): TokenInspection => ({
  header: { alg: 'RS256', typ: 'JWT', kid: 'auth-key-2026' },
  payload: {
    sub: 'user_2841',
    iss: 'https://auth.example.com',
    aud: 'college-api',
    iat: now - 37 * 60,
    exp: now + 23 * 60,
    nbf: now - 37 * 60,
    roles: ['admin', 'reviewer'],
    scope: 'users:read users:write profile',
    email: 'alex@example.test',
  },
  claims: [
    { key: 'iss', name: 'Issuer', value: 'https://auth.example.com', group: 'Identity', hint: 'Identifies who issued the token.' },
    { key: 'sub', name: 'Subject', value: 'user_2841', group: 'Identity', hint: 'Identifies the principal represented by the token.' },
    { key: 'aud', name: 'Audience', value: 'college-api', group: 'Identity', hint: 'Identifies the intended recipient.' },
    { key: 'iat', name: 'Issued At', value: 'Today, 10:02', group: 'Timing' },
    { key: 'exp', name: 'Expiration', value: 'Today, 11:02', group: 'Timing' },
    { key: 'scope', name: 'Scopes', value: ['users:read', 'users:write', 'profile'], group: 'Authorization' },
    { key: 'roles', name: 'Roles', value: ['admin', 'reviewer'], group: 'Authorization' },
    { key: 'email', name: 'Email', value: 'alex@example.test', group: 'Custom Claims' },
  ],
  status: 'ACTIVE', algorithm: 'RS256', type: 'JWT', keyId: 'auth-key-2026', bytes: 2840,
  issuedAt: now - 37 * 60, expiresAt: now + 23 * 60, notBefore: now - 37 * 60, lifetimeMinutes: 60,
});

export const securityFindings: SecurityFinding[] = [
  { id: '1', severity: 'high', title: 'Broad administrative role', summary: 'The token grants an administrative role alongside write access.', recommendation: 'Issue a narrower token for routine API operations.' },
  { id: '2', severity: 'warning', title: 'Payload contains personal data', summary: 'The email claim is encoded, not encrypted.', recommendation: 'Remove personal claims that the recipient does not require.' },
  { id: '3', severity: 'warning', title: 'One-hour token lifetime', summary: 'The token remains valid for 60 minutes.', recommendation: 'Confirm this lifetime matches the application risk profile.' },
  { id: '4', severity: 'passed', title: 'Asymmetric signing algorithm', summary: 'RS256 avoids sharing a signing secret with verifiers.', recommendation: 'Keep private signing keys isolated.' },
  { id: '5', severity: 'passed', title: 'Expiration is present', summary: 'The token has a bounded validity window.', recommendation: 'No action required.' },
];

export const validationSteps: ValidationStep[] = [
  { label: 'Token structure', state: 'pass', detail: 'Three compact JWS segments' },
  { label: 'Signature', state: 'pass', detail: 'RS256 signature is valid' },
  { label: 'Expiration', state: 'pass', detail: '23 minutes remaining' },
  { label: 'Not before', state: 'pass', detail: 'Token is currently active' },
  { label: 'Issuer', state: 'pass', detail: 'Issuer matches policy' },
  { label: 'Audience', state: 'fail', detail: 'Expected college-api · received college-web' },
];
