use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use rsa::{
    pkcs1::DecodeRsaPublicKey, pkcs1v15, pkcs8::DecodePublicKey, signature::Verifier, RsaPublicKey,
};
use serde_json::Value;
use sha2::{Sha256, Sha384, Sha512};

use super::helper::{decode_segment, normalize_token, parse_json, split_token};
use crate::error::AppError;
use crate::models::verification::{VerificationRequest, VerificationResult, VerificationStatus};

type HmacSha256 = Hmac<Sha256>;
type HmacSha384 = Hmac<Sha384>;
type HmacSha512 = Hmac<Sha512>;

#[tauri::command]
pub fn verify_token(request: VerificationRequest) -> Result<VerificationResult, AppError> {
    let token = normalize_token(&request.token)?;
    let secret = request.secret.trim();

    if secret.is_empty() {
        return Err(AppError::new("EMPTY_SECRET", "Secret cannot be empty"));
    }

    let parts = split_token(&token)?;

    let header_raw = decode_segment(&parts.header)?;
    let header = parse_json(&header_raw, "JWT header")?;

    let algorithm = header
        .get("alg")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::new("MISSING_ALGORITHM", "JWT header is missing alg"))?;

    let signature = URL_SAFE_NO_PAD
        .decode(&parts.signature)
        .map_err(|_| AppError::new("INVALID_BASE64URL", "Invalid JWT signature encoding"))?;

    let signing_input = format!("{}.{}", parts.header, parts.payload);

    let verified = match algorithm {
        "HS256" => {
            let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
                .map_err(|_| AppError::new("INVALID_SECRET", "Invalid HMAC secret"))?;
            mac.update(signing_input.as_bytes());
            mac.verify_slice(&signature).is_ok()
        }
        "HS384" => {
            let mut mac = HmacSha384::new_from_slice(secret.as_bytes())
                .map_err(|_| AppError::new("INVALID_SECRET", "Invalid HMAC secret"))?;
            mac.update(signing_input.as_bytes());
            mac.verify_slice(&signature).is_ok()
        }
        "HS512" => {
            let mut mac = HmacSha512::new_from_slice(secret.as_bytes())
                .map_err(|_| AppError::new("INVALID_SECRET", "Invalid HMAC secret"))?;
            mac.update(signing_input.as_bytes());
            mac.verify_slice(&signature).is_ok()
        }
        "RS256" => verify_rsa::<Sha256>(secret, signing_input.as_bytes(), &signature)?,
        "RS384" => verify_rsa::<Sha384>(secret, signing_input.as_bytes(), &signature)?,
        "RS512" => verify_rsa::<Sha512>(secret, signing_input.as_bytes(), &signature)?,
        _ => {
            return Err(AppError::new(
                "UNSUPPORTED_ALGORITHM",
                format!(
                    "Only HS256, HS384, HS512, RS256, RS384, and RS512 are supported right now, got {algorithm}"
                ),
            ))
        }
    };

    let status = if verified {
        VerificationStatus::Verified
    } else {
        VerificationStatus::Failed
    };

    let message = match status {
        VerificationStatus::Verified => "Signature verified",
        VerificationStatus::Failed => "Signature does not match",
    };

    Ok(VerificationResult {
        status,
        algorithm: algorithm.to_string(),
        message: message.to_string(),
    })
}

fn verify_rsa<D>(
    public_key_pem: &str,
    signing_input: &[u8],
    signature: &[u8],
) -> Result<bool, AppError>
where
    D: sha2::Digest + rsa::pkcs8::AssociatedOid,
{
    let public_key = RsaPublicKey::from_public_key_pem(public_key_pem)
        .or_else(|_| RsaPublicKey::from_pkcs1_pem(public_key_pem))
        .map_err(|_| AppError::new("INVALID_PUBLIC_KEY", "Invalid RSA public key PEM"))?;

    let signature = pkcs1v15::Signature::try_from(signature)
        .map_err(|_| AppError::new("INVALID_SIGNATURE", "Invalid RSA signature"))?;

    Ok(pkcs1v15::VerifyingKey::<D>::new(public_key)
        .verify(signing_input, &signature)
        .is_ok())
}

#[cfg(test)]
mod tests {
    use super::verify_token;
    use crate::models::verification::{VerificationRequest, VerificationStatus};

    const HS256_TOKEN: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXRlc3Qta2V5In0.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.SUX74p4p5tBV_MWKlwxUBFZkL2Z8UyIfxgD3qh68x_A";
    const HS384_TOKEN: &str = "eyJhbGciOiJIUzM4NCIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXRlc3Qta2V5In0.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.YoiUwHY8DOfog5qQsZSlnS2wKlUf9x9pF0_JodP5n-orvujYOgCoIegR9sqqaYeF";
    const HS512_TOKEN: &str = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXRlc3Qta2V5In0.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.0nhxupKJa727730JhhBbsqO_HdbQbPGNQNrODXMlbbY3HJZc4VFf_PSRLo1gEF9AKAKq3T4P92SO23lZpnyTgA";
    const RS256_TOKEN: &str = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS10ZXN0LWtleSJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.lywkYq7he9M16BZR703N91AoW4S7QdibX92dlYq8Db21IX962j6IkPucm0Sx57KcniEeYqSxln7hpDMcsogQd7NoBtUQa0eGfeoyMq1obG4-ekKEwXEIKtE4UvoA_O13gK4XKW56SzQCNiBLP1dalxs_7ssM4B7l5RhBJEApz7SPCPOBBr26pd660vbtbBmDq013UZ_DFRa3ABr6H1eMdZDg1IgnbWNC0ATCTBbUzJnOZzHEt09EmbuioPzJ7ZcgWCaMmfwVZB7N_VbE75WBeVikPVIt_vYXcnRGPxDn9Y9VdN6yrHMc2IzGeOYg_hu1pisNkBU_mcYXKbxkpceu_g";
    const RS384_TOKEN: &str = "eyJhbGciOiJSUzM4NCIsInR5cCI6IkpXVCIsImtpZCI6InJzYS10ZXN0LWtleSJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.NQ906p4KEmoUG6hyI6JBVhPchFjl6Dn5WMFeA1xVlMe1mbVnyj8TgT2RDiT2zlc1u7nxRH5qaMAuSBrptvdpG14V_CPSPyhxebNgRhaXvJ0ikYjkUusB8EQWXuJpMrvVPu7M-KyXWhOJ80C8rATFiclqI8ublQXfYXxQzrPxv9IbA4FaeatlFYDYszd1dQb7avd26mdOjWw27CtdqWmyAV2jsfjcwoCfSzp6cH8ZjwiQYdhD0--FaP09WuK5yNEMHssGBiVDM9Ee68QXmPL9MiAZbFuqDMKTfQhs9F-ujBqlyOdsaL9qI9EcQFXXw9gopt4qukoR4db8fF6-Ryy0TA";
    const RS512_TOKEN: &str = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6InJzYS10ZXN0LWtleSJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJMZW8gVGVzdGVyIiwicm9sZXMiOlsiYWRtaW4iLCJkZXZlbG9wZXIiXSwic2NvcGUiOiJyZWFkOndyaXRlIGp3dDp0ZXN0IiwiZXhwIjoyMDAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImlzcyI6ImwzMC1kZXYiLCJhdWQiOiJsMzAtand0LWRlc2sifQ.QOm0Ugx8yuuNNcrAxZUpyjmKlG6Vh41xVK5Ll4bWuzVongKM2OVplgrBUd4dZOC9eF04P-Xmi5VhqcRa2mzX1djPgXNH9NVJ9cxthgLMO3qx96BOlCR_GQoF9EylV0dKcus0R4bcGJhM13bBHzEJE86gXj7_nx11VVoutPamF9yhWZ5R9tNXIpUHfhUiK66ppLSwdq4J-vqkG7aCnPnr-L5Oiy_DXduIkPS9SRXYxgRn1L1xbkAMnEs6AhUDRibIeUY2Nutzhlq6kiaDuvcEFd6onlnWOafbRcKBpw4twLx9uNKuX10URPyRINIoZs3YHuDFWe80EbYpyP0OcEXMcA";
    const PUBLIC_KEY: &str = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtqK50jNk7wBkrEan/pBo\nyUFsR2rOH9kxnZ/e/LypdKq+d7ZL1Rf00CNhX92SL8R92x3qu+CZfSP4rSXZDL8c\ncZPS76WheXXrSD7J7wrCTsugKiwlKYlyiM0gHgW8W3Z23lfijtEbNrloQgSk9MIX\nShuDeteJU3BgPJvZGnDv56cYKQuAAmK+4s98gYK2l/96RXbKaCk1nqMQQgWSAehj\n9BNQohjSUhT8ZUBSwKnLX3mbF9LOzjY/0dQ2fRpf5kRBeE2i85aU6FydBNMenylp\ngKaQc7y2cOu74BLqYx1So1zSs3FkqSb2V9KNPapH+pvPp0U0cloKi3ivdSZ6b7N5\nDwIDAQAB\n-----END PUBLIC KEY-----";

    #[test]
    fn verifies_hs256_with_correct_secret() {
        let result = verify_token(VerificationRequest {
            token: HS256_TOKEN.to_string(),
            secret: "secret123".to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }

    #[test]
    fn fails_hs256_with_wrong_secret() {
        let result = verify_token(VerificationRequest {
            token: HS256_TOKEN.to_string(),
            secret: "wrong-secret".to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Failed);
    }

    #[test]
    fn verifies_hs384_with_correct_secret() {
        let result = verify_token(VerificationRequest {
            token: HS384_TOKEN.to_string(),
            secret: "secret123".to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }

    #[test]
    fn verifies_hs512_with_correct_secret() {
        let result = verify_token(VerificationRequest {
            token: HS512_TOKEN.to_string(),
            secret: "secret123".to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }

    #[test]
    fn verifies_rs256_with_public_key() {
        let result = verify_token(VerificationRequest {
            token: RS256_TOKEN.to_string(),
            secret: PUBLIC_KEY.to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }

    #[test]
    fn verifies_rs384_with_public_key() {
        let result = verify_token(VerificationRequest {
            token: RS384_TOKEN.to_string(),
            secret: PUBLIC_KEY.to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }

    #[test]
    fn verifies_rs512_with_public_key() {
        let result = verify_token(VerificationRequest {
            token: RS512_TOKEN.to_string(),
            secret: PUBLIC_KEY.to_string(),
        })
        .unwrap();

        assert_eq!(result.status, VerificationStatus::Verified);
    }
}
