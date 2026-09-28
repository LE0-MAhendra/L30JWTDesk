# Microsoft Store Listing

This page contains ready-to-paste metadata and submission links for
L30JWTDesk.

## Product details

- **Product name:** L30JWTDesk
- **Category:** Developer tools
- **Pricing:** Free
- **Website:** https://github.com/LE0-MAhendra/L30JWTDesk
- **Privacy policy:** https://github.com/LE0-MAhendra/L30JWTDesk/blob/master/PRIVACY.md
- **Support:** https://github.com/LE0-MAhendra/L30JWTDesk/blob/master/SUPPORT.md
- **License terms:** https://github.com/LE0-MAhendra/L30JWTDesk/blob/master/LICENSE

## Short description

Inspect, create, verify, compare, and debug JSON Web Tokens locally with a
fast, privacy-focused desktop workspace.

## Description

L30JWTDesk is a local-first workspace for developers who work with JSON Web
Tokens. Decode token structure, inspect claims and expiry information, create
signed tokens, verify signatures, compare claims, and review common security
concerns from one focused desktop application.

Token parsing and analysis happen on your device. Network access is used only
when you request JWKS or OIDC discovery, or when the application checks GitHub
Releases for updates. L30JWTDesk has no accounts, advertisements, analytics,
or hosted application backend.

The application is free and open source under the MIT License.

## Features

Enter these as separate features in Partner Center:

- Inspect JWT headers, payloads, claims, lifetime, and size
- Create HMAC and RSA signed tokens locally
- Verify signatures using secrets, public keys, JWKS, or OIDC discovery
- Compare claims between two tokens
- Review common token security findings
- Generate redacted diagnostic reports
- Use light and dark themes with keyboard shortcuts
- Keep token processing local by default

## Search terms

- JWT
- JSON Web Token
- token inspector
- token debugger
- developer tools
- JWT security
- OIDC

## Screenshots

Upload the PNG files in this order:

1. `screenshots/l301.png` — Inspect a JWT locally
2. `screenshots/l302.png` — Create and sign a JWT
3. `screenshots/l303.png` — Verify a JWT signature
4. `screenshots/l304.png` — Review JWT security findings
5. `screenshots/l305.png` — Compare JWT claims

Use `src-tauri/icons/icon.png` as the square Store logo.

## What's new

Initial Microsoft Store release with local JWT inspection, creation, signature
verification, security analysis, claim comparison, and diagnostic tools.

## Submission notes

- Supported input: compact JWT, Bearer token, or Authorization header.
- Core token processing works locally without an account.
- Internet access is used for updates and only for user-requested JWKS or OIDC
  endpoints.
- The application does not include advertising, purchases, or subscriptions.
- Complete the Partner Center age-rating questionnaire using the app's actual
  content declarations.
- Use a versioned HTTPS URL for the signed offline MSI or EXE. Do not replace
  the binary at that URL after submission.
- The installer and included executable files must be Authenticode-signed with
  a certificate trusted by Windows before an MSI/EXE Store submission.
- Confirm that the submitted installer supports silent, offline installation
  and clean uninstallation before certification.
