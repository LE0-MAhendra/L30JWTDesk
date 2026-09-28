# L30JWTDesk

![License: MIT](https://img.shields.io/badge/License-MIT-7c83ff.svg)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24c8db.svg)

**L30JWTDesk** is a local-first, cross-platform workspace for inspecting,
creating, verifying, comparing, and debugging JSON Web Tokens (JWTs).

The app runs on desktop and Android. Token parsing, claim analysis, and
signature checks happen locally; network access is used only when you choose
JWKS or OIDC verification.

> JWT payloads are encoded, not encrypted. Do not paste production secrets or
> sensitive personal data unless you understand the risk.

## Features

- Inspect JWT headers, payloads, standard claims, token lifetime, and size.
- Create HMAC and RSA JWTs locally.
- Verify HMAC and RSA signatures with local keys, JWKS, or OIDC discovery.
- Compare token claims, assess common security risks, and generate redacted
  diagnostic reports.
- Store tokens and interface preferences only on the current device.
- Supports light/dark themes, keyboard shortcuts, reduced motion, phone
  portrait mode, and landscape mode.

## Install

Download the signed asset for your device from
[GitHub Releases](https://github.com/LE0-MAhendra/L30JWTDesk/releases).

- **Windows:** MSI or NSIS EXE.
- **Linux:** AppImage, DEB, or RPM.
- **macOS:** DMG for Apple Silicon or Intel.
- **Android:** install the signed ARM64 APK. Android may ask you to allow
  installs from the app used to open the download.

Never install files ending in `-unsigned.apk`; Android will reject them.

## How to use

1. Open **Inspect** and paste a compact JWT, `Bearer <token>`, or an
   `Authorization: Bearer <token>` value.
2. Review the decoded header, payload, timeline, and claim overview.
3. Send the active token to **Verify**, **Security**, **Compare**, or
   **Debug**.
4. Use a local secret/public key, JWKS URL, or OIDC issuer only when needed.
5. Copy or save a redacted report before sharing diagnostics.

## Privacy

Sensitive material stays in memory. Saved tokens and appearance preferences
use local device storage. The app does not include analytics or a backend.

## Development

Requirements: Node.js 20+, Rust, and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run tauri dev
```

Browser-only UI development:

```bash
npm run dev
```

Run checks:

```bash
npm run build
cd src-tauri && cargo test
```

## Builds and releases

```bash
# Linux packages
npm run tauri build -- --bundles appimage,deb,rpm

# Android APK/AAB builds
npm run tauri android build --apk --aab --split-per-abi --ci
```

GitHub Actions runs quality, security, desktop release, and Android release
workflows. Tagged releases include Tauri-signed updater artifacts and
Android-keystore-signed mobile artifacts.

### Release secrets

Keep private signing material out of this public repository. Configure these
GitHub Actions secrets before publishing a release:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (if the updater key is protected)
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The Tauri updater checks GitHub Releases after startup and installs a verified
desktop update when available. Android updates should be distributed through a
signed APK release or an app store.

Windows Authenticode and macOS Developer ID signing require your own vendor
certificates; do not add those certificates to this public repository.

## Contributing

Issues and pull requests are welcome. Keep changes focused, add or update
tests when behavior changes, and run the checks above before opening a PR.
Never commit JWTs, private keys, keystores, or other secrets.

## Security

Please report vulnerabilities privately to the repository owner rather than
opening a public issue with exploit details.

## License

MIT. See [LICENSE](LICENSE).
