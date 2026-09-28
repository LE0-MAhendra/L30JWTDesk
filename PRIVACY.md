# Privacy Policy

Effective date: September 28, 2026

L30JWTDesk is a local-first JSON Web Token utility. This policy explains what
the application processes and when it accesses the network.

## Data processed on your device

JWTs, claims, secrets, public keys, generated keys, and diagnostic reports are
processed locally. The project does not operate an account system, analytics
service, advertising service, or application backend, and the developer does
not receive this content.

If you choose to save a token, the token and interface preferences are stored
in application storage on your device. Secrets entered for signature
verification are kept in memory and are not intentionally persisted.

## Network access

The application accesses the network only for these features:

- checking GitHub Releases for application updates;
- fetching a JWKS document from a URL you provide; and
- fetching OIDC discovery information from an issuer URL you provide.

Those requests disclose ordinary connection information, such as your IP
address and user agent, to GitHub or to the endpoint operator. Their own
privacy policies apply to data they receive.

## Retention and deletion

Unsaved data remains in memory until it is cleared or the application closes.
Saved tokens and preferences remain on the device until you delete them, clear
the application's sensitive data or storage, or uninstall the application.

## Security

JWT payloads are encoded, not encrypted. Avoid using production secrets or
sensitive personal information unless you understand the risk. No software can
guarantee absolute security.

## Children's privacy

L30JWTDesk is a developer utility and is not directed to children. The project
does not knowingly collect personal information from children.

## Changes

Material changes to this policy will be published in this repository with an
updated effective date.

## Contact

For privacy questions, use the public [support page](SUPPORT.md). Report a
security vulnerability privately through
[GitHub Security Advisories](https://github.com/LE0-MAhendra/L30JWTDesk/security/advisories/new).
