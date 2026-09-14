# L30JWTDesk

L30JWTDesk is a local-first desktop workspace for inspecting, creating,
verifying, comparing, and debugging JSON Web Tokens (JWTs).

It is built with [Tauri 2](https://tauri.app/), Rust, React, TypeScript,
Vite, CodeMirror, and Zustand.

> JWT payloads are encoded, not encrypted. Never paste production secrets or
> sensitive personal data into a token unless you understand the risk.

## Features

- **Inspect** JWT headers, payloads, standard claims, token status, lifetime,
  and encoded size.
- **Create** locally signed HS256, HS384, HS512, and RS256 tokens.
- **Verify** HMAC signatures with a shared secret and RSA signatures with a
  public PEM key.
- **Verify with JWKS** by fetching a matching RSA key using the token `kid`.
- **Verify with OIDC** by discovering the issuer metadata and JWKS endpoint.
- **Validate claims** including `exp`, `nbf`, optional `iss`, and optional
  `aud`, with 60 seconds of clock skew in the Debug workspace.
- **Analyze security findings** such as unsigned tokens, missing expiration,
  long lifetimes, embedded personal data, and administrative roles.
- **Compare** the payload claims of two JWTs and filter the diff.
- **Debug** rejected-token policy checks and copy or save summary, redacted,
  or full diagnostic reports.
- **Save tokens locally** for reuse, loading, editing, comparison, or deletion.
- **Customize** theme, sidebar state, UI density, and reduced motion.

## Requirements

- Node.js 18+ with npm
- Rust and Cargo
- Tauri 2 system prerequisites for your operating system

See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
for platform-specific dependencies.

## Development setup

Clone the repository, install the JavaScript dependencies, and start the
desktop app:

```bash
npm install
npm run tauri dev
```

The Tauri app starts Vite automatically. Use the browser-only frontend only
for UI work:

```bash
npm run dev
```

The browser-only mode cannot execute the Rust-backed inspect, verify,
security, compare, or debug commands.

## Checks and build

Run the frontend type-check/build and Rust tests:

```bash
npm run build
cd src-tauri && cargo test
```

Build installable desktop bundles with Tauri:

```bash
npm run tauri build
```

## Typical workflow

1. Open **Inspect** and paste a compact JWT, a `Bearer <token>` value, or an
   `Authorization: Bearer <token>` value.
2. Inspect the decoded header, payload, claims, and timeline.
3. Send the active token to **Verify**, **Security**, **Debug**, or **Compare**.
4. Choose the appropriate verification material or endpoint.
5. Copy or save a redacted diagnostic report when sharing results.

Inspection, comparison, security analysis, and claim validation are local.
Network access happens only when **JWKS** or **OIDC** verification is run.
Secrets and private RSA keys are kept in memory and are not persisted.
Saved tokens and appearance preferences use this device's local browser
storage.

## Local JWKS/OIDC test server

The repository includes a small local server with a fixed RSA test key:

```bash
npm run jwks:test
```

Use these values in **Verify**:

```text
JWKS URL:    http://127.0.0.1:8787/.well-known/jwks.json
OIDC issuer: http://127.0.0.1:8787
```

Set `JWKS_PORT` to use another local port:

```bash
JWKS_PORT=8788 npm run jwks:test
```

The local server provides only:

- `/.well-known/jwks.json`
- `/.well-known/openid-configuration`

## Keyboard shortcuts

Shortcuts use `⌘` on macOS and `Ctrl` on Windows/Linux.

| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + K` | Open command palette |
| `⌘/Ctrl + 1` | Inspect |
| `⌘/Ctrl + 2` | Verify |
| `⌘/Ctrl + 3` | Security |
| `⌘/Ctrl + 4` | Compare |
| `⌘/Ctrl + 5` | Debug |
| `⌘/Ctrl + 6` | Create |
| `⌘/Ctrl + ,` | Settings |
| `⌘/Ctrl + L` | Clear sensitive in-memory data |
| `⌘/Ctrl + Shift + C` | Copy the current diagnostic report |
| `⌘/Ctrl + Enter` | Inspect the current token |

## Project layout

```text
src/
├── App.tsx                         Application shell and workspace routing
├── components/                     React workspaces and shared UI
├── services/jwt.ts                 Typed frontend calls to Tauri commands
├── store.ts                        Active token and UI preferences
└── styles.css                      Application styles

src-tauri/
├── src/commands/                   Rust JWT, verification, security, and report logic
├── src/models/                     Rust request and response types
├── src/error.rs                    Shared command error type
└── tauri.conf.json                 Desktop window and bundle configuration

scripts/jwks-server.mjs             Local JWKS/OIDC test server
```

## Current scope

- RSA verification accepts RS256, RS384, and RS512 with RSA public PEM keys,
  JWKS, or OIDC discovery.
- The Create workspace generates RSA-2048 material for RS256 only.
- JWKS/OIDC verification requires an HTTP(S) URL and a matching RSA `kid`.
- This is a developer diagnostic tool, not a replacement for production JWT
  policy enforcement or key management.

## Contributing

Keep changes small and verify them with:

```bash
npm run build
cd src-tauri && cargo test
```

Please include a short description of the behavior changed and the checks you
ran. Do not commit real tokens, secrets, private keys, or generated local
reports.
