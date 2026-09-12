# L30JWTDesk

Local-first desktop app for inspecting, verifying, comparing, and debugging JWTs.

Built with Tauri 2, Rust, React, TypeScript, Vite, and CodeMirror.

## Start the desktop app

```bash
npm install
npm run tauri dev
```

Use `npm run dev` only when you want the browser-only Vite frontend. Tauri commands need `npm run tauri dev`.

## Checks

```bash
npm run build
cd src-tauri && cargo test
```

## What works now

- Inspect JWT header, payload, claims, metadata, and timeline.
- Verify HS256/HS384/HS512 tokens with a shared secret.
- Verify RS256/RS384/RS512 tokens with a pasted RSA public key.
- Verify RS tokens from a JWKS URL.
- Verify RS tokens through OIDC issuer discovery.
- Validate expected issuer, audience, subject, and allowed algorithms.
- Analyze token security findings.
- Compare two token payloads.
- Generate redacted diagnostic reports.

## Quick HS256 test

Token:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXRlc3Qta2V5In0.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.SUX74p4p5tBV_MWKlwxUBFZkL2Z8UyIfxgD3qh68x_A
```

Secret:

```text
secret123
```

Expected issuer:

```text
l30-dev
```

Expected audience:

```text
l30-jwt-desk
```

## Local JWKS test

Start the local JWKS server:

```bash
npm run jwks:test
```

Use this JWKS URL in Verify:

```text
http://127.0.0.1:8787/.well-known/jwks.json
```

Use this RS256 token:

```text
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS10ZXN0LWtleSJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.lywkYq7he9M16BZR703N91AoW4S7QdibX92dlYq8Db21IX962j6IkPucm0Sx57KcniEeYqSxln7hpDMcsogQd7NoBtUQa0eGfeoyMq1obG4-ekKEwXEIKtE4UvoA_O13gK4XKW56SzQCNiBLP1dalxs_7ssM4B7l5RhBJEApz7SPCPOBBr26pd660vbtbBmDq013UZ_DFRa3ABr6H1eMdZDg1IgnbWNC0ATCTBbUzJnOZzHEt09EmbuioPzJ7ZcgWCaMmfwVZB7N_VbE75WBeVikPVIt_vYXcnRGPxDn9Y9VdN6yrHMc2IzGeOYg_hu1pisNkBU_mcYXKbxkpceu_g
```

## Project layout

- `src/` — React desktop frontend.
- `src/services/jwt.ts` — frontend calls into Tauri commands.
- `src-tauri/src/commands/` — Rust command handlers.
- `src-tauri/src/models/` — shared Rust request/response models.
- `scripts/jwks-server.mjs` — local JWKS server for manual testing.
