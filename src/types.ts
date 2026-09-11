export type Workspace = 'inspect' | 'verify' | 'security' | 'compare' | 'debug' | 'settings' | 'about';
export type Theme = 'dark' | 'light' | 'system';

export interface Claim {
  key: string;
  name: string;
  value: string | string[];
  group: 'Identity' | 'Timing' | 'Authorization' | 'Token Metadata' | 'Custom Claims';
  hint?: string;
}

export interface TokenInspection {
  header: Record<string, string>;
  payload: Record<string, string | number | string[]>;
  claims: Claim[];
  status: 'ACTIVE' | 'EXPIRED' | 'NOT ACTIVE' | 'INVALID';
  algorithm: string;
  type: string;
  keyId: string;
  bytes: number;
  issuedAt: number;
  expiresAt: number;
  notBefore: number;
  lifetimeMinutes: number;
}

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'warning' | 'info' | 'passed';
  title: string;
  summary: string;
  recommendation: string;
}

export interface ValidationStep {
  label: string;
  state: 'pass' | 'warning' | 'fail';
  detail: string;
}
