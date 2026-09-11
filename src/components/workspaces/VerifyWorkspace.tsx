import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
  Check,
  Eye,
  EyeOff,
  FileKey2,
  KeyRound,
  Network,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { IconButton, StatusPill } from "../common";

export function VerifyWorkspace({ notify }: { notify: (message: string) => void }) {
  const [mode, setMode] = useState<"secret" | "public" | "jwks" | "oidc">(
    "jwks",
  );
  const [value, setValue] = useState(
    "https://auth.example.com/.well-known/jwks.json",
  );
  const [revealSecret, setRevealSecret] = useState(false);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const run = () => {
    setRunning(true);
    setComplete(false);
    window.setTimeout(() => {
      setRunning(false);
      setComplete(true);
      notify("Verification complete");
    }, 650);
  };
  const titles = {
    secret: "HMAC secret",
    public: "Public key",
    jwks: "JWKS URL",
    oidc: "OIDC issuer",
  };
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
        <StatusPill state={complete ? "VERIFIED" : "UNVERIFIED"} />
      </div>
      <div className="segmented-control">
        {(["secret", "public", "jwks", "oidc"] as const).map((item) => (
          <button
            key={item}
            className={mode === item ? "active" : ""}
            onClick={() => {
              setMode(item);
              setComplete(false);
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
                ? "PEM public keys and X.509 certificates are supported by the backend integration point."
                : "The requested endpoint will be visible in the verification trace."}
          </div>
          <button
            className="primary-button verify-action"
            disabled={!value || running}
            onClick={run}
          >
            <ShieldCheck />
            {running ? "Verifying…" : "Verify signature"}
          </button>
        </section>
        <section className="panel pipeline-panel">
          <div className="section-heading">
            <span>Verification trace</span>
            <span>{complete ? "Completed in 184 ms" : "Ready"}</span>
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
                    {complete
                      ? step === "JWKS"
                        ? "3 keys fetched"
                        : step === "Key match" || step === "Key"
                          ? "kid auth-key-2026"
                          : "Resolved"
                      : "Pending"}
                  </small>
                </div>
                {complete && <Check />}
              </div>
            ))}
          </div>
          {complete && (
            <div className="verification-result">
              <ShieldCheck />
              <div>
                <strong>Signature verified</strong>
                <span>RS256 · auth-key-2026 · key use: sig</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

