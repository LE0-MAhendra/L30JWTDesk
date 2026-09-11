import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  Eye,
  EyeOff,
  FileKey2,
  KeyRound,
  Network,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { IconButton, StatusPill } from "../common";
import { verifyToken, type VerificationResult } from "../../services/jwt";
import { useAppStore } from "../../store";

export function VerifyWorkspace({ notify }: { notify: (message: string) => void }) {
  const token = useAppStore((state) => state.token);
  const [mode, setMode] = useState<"secret" | "public" | "jwks" | "oidc">(
    "secret",
  );
  const [value, setValue] = useState("");
  const [revealSecret, setRevealSecret] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (mode === "jwks" || mode === "oidc") {
      notify("JWKS and OIDC are not connected yet");
      return;
    }

    if (!token.trim()) {
      notify("Paste and inspect a JWT first");
      return;
    }

    if (!value.trim()) {
      notify(mode === "secret" ? "Enter the HMAC secret" : "Paste the RSA public key");
      return;
    }

    setRunning(true);
    setResult(null);
    setError("");

    try {
      const verification = await verifyToken({ token, secret: value });
      setResult(verification);
      notify(verification.message);
    } catch (caught) {
      const message =
        typeof caught === "object" &&
        caught !== null &&
        "message" in caught &&
        typeof caught.message === "string"
          ? caught.message
          : "Verification failed";
      setError(message);
      notify(message);
    } finally {
      setRunning(false);
    }
  };

  const titles = {
    secret: "HMAC secret",
    public: "Public key",
    jwks: "JWKS URL",
    oidc: "OIDC issuer",
  };
  const statusLabel = result
    ? result.status === "verified"
      ? "VERIFIED"
      : "FAILED"
    : "UNVERIFIED";
  const pipeline =
    mode === "oidc"
      ? ["Issuer", "Discovery", "Metadata", "JWKS", "Key", "Verify"]
      : mode === "jwks"
        ? ["Token", "kid", "JWKS", "Key match", "Verification"]
        : ["Token", "Key material", "Algorithm", "Verification"];
  return (
    <div className="workspace-scroll workspace-pad">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Cryptographic verification</span>
          <h2>Verify signature</h2>
          <p>
            Inspection is local. Network access occurs only when you request
            JWKS or OIDC discovery.
          </p>
        </div>
        <StatusPill state={statusLabel} />
      </div>
      <div className="segmented-control">
        {(["secret", "public", "jwks", "oidc"] as const).map((item) => (
          <button
            key={item}
            className={mode === item ? "active" : ""}
            onClick={() => {
              setMode(item);
              setResult(null);
              setError("");
              setValue(
                item === "jwks"
                  ? "https://auth.example.com/.well-known/jwks.json"
                  : item === "oidc"
                    ? "https://auth.example.com"
                    : "",
              );
            }}
          >
            {item === "secret" ? (
              <KeyRound />
            ) : item === "public" ? (
              <FileKey2 />
            ) : item === "jwks" ? (
              <Network />
            ) : (
              <Wifi />
            )}
            {item.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="verify-grid">
        <section className="panel form-panel">
          <div className="panel-toolbar">
            <span className="eyebrow">{titles[mode]}</span>
            {(mode === "jwks" || mode === "oidc") && (
              <span className="network-badge">
                <Wifi />
                Network operation
              </span>
            )}
          </div>
          <label htmlFor="verify-value">{titles[mode]}</label>
          {mode === "public" ? (
            <CodeMirror
              value={value}
              onChange={setValue}
              height="220px"
              theme="dark"
              placeholder="-----BEGIN PUBLIC KEY-----"
            />
          ) : mode === "secret" ? (
            <div className="secret-field">
              <input
                id="verify-value"
                type={revealSecret ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter secret (never persisted)"
                autoComplete="off"
              />
              <IconButton
                label={revealSecret ? "Hide secret" : "Show secret"}
                onClick={() => setRevealSecret(!revealSecret)}
                pressed={revealSecret}
              >
                {revealSecret ? <EyeOff /> : <Eye />}
              </IconButton>
            </div>
          ) : (
            <input
              id="verify-value"
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={titles[mode]}
              autoComplete="off"
            />
          )}
          <div className="form-hint">
            {mode === "secret"
              ? "Secret values remain in memory and are never logged or persisted."
              : mode === "public"
                ? "Paste an RSA public key PEM for RS256, RS384, or RS512."
                : "The requested endpoint will be visible in the verification trace."}
          </div>
          <button
            className="primary-button verify-action"
            disabled={!value || running || !token || mode === "jwks" || mode === "oidc"}
            onClick={run}
          >
            <ShieldCheck />
            {running ? "Verifying…" : "Verify signature"}
          </button>
        </section>
        <section className="panel pipeline-panel">
          <div className="section-heading">
            <span>Verification trace</span>
            <span>{result ? result.algorithm : error ? "Error" : "Ready"}</span>
          </div>
          <div className={`pipeline ${running ? "running" : ""}`}>
            {pipeline.map((step, index) => (
              <div
                className="pipeline-row"
                key={step}
                style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{step}</strong>
                  <small>
                    {result
                      ? step === "Token"
                        ? "Loaded from Inspect"
                        : step === "Key material"
                          ? mode === "secret"
                            ? "Secret provided"
                            : "Public key provided"
                          : step === "Algorithm"
                            ? result.algorithm
                            : result.message
                      : error || "Pending"}
                  </small>
                </div>
                {result && <ShieldCheck />}
              </div>
            ))}
          </div>
          {result && (
            <div
              className={`verification-result ${
                result.status === "failed" ? "verification-result-failed" : ""
              }`}
            >
              <ShieldCheck />
              <div>
                <strong>{result.message}</strong>
                <span>
                  {result.algorithm} · local{" "}
                  {result.algorithm.startsWith("HS") ? "HMAC" : "RSA"} verification
                </span>
              </div>
            </div>
          )}
          {error && <div className="form-hint">{error}</div>}
        </section>
      </div>
    </div>
  );
}
