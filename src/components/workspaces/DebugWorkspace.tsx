import React, { useState } from "react";
import { Activity, Check, Clipboard, Copy, X, Zap } from "lucide-react";
import { validateTokenClaims, type ClaimValidationResult, type ClaimValidationStep } from "../../services/jwt";
import { useAppStore } from "../../store";
import { StatusPill, copyText, saveText } from "../common";

export function DebugWorkspace({ notify }: { notify: (message: string) => void }) {
  const token = useAppStore((state) => state.token);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClaimValidationResult | null>(null);
  const [expectedIssuer, setExpectedIssuer] = useState("");
  const [expectedAudience, setExpectedAudience] = useState("");
  const [reportMode, setReportMode] = useState<"Summary" | "Redacted" | "Full">(
    "Redacted",
  );
  const run = async () => {
    if (!token.trim()) {
      notify("Paste and inspect a JWT first");
      return;
    }

    setRunning(true);
    try {
      const validation = await validateTokenClaims({
        token,
        expected_issuer: expectedIssuer,
        expected_audience: expectedAudience,
        clock_skew_seconds: 60,
      });
      setResult(validation);
      notify(validation.decision === "fail" ? "Validation failed" : "Validation passed");
    } catch (caught) {
      const message =
        typeof caught === "object" &&
        caught !== null &&
        "message" in caught &&
        typeof caught.message === "string"
          ? caught.message
          : "Validation failed";
      notify(message);
    } finally {
      setRunning(false);
    }
  };
  const decision = result?.decision === "fail" ? "Reject" : result ? "Accept" : "Not run";
  const report = `L30JWTDesk diagnostic report
Decision: ${decision}
Primary failure: ${result?.primary_failure ?? "None"}
${result?.steps.map((step) => `${step.label}: ${step.state.toUpperCase()} - ${
    reportMode === "Full" ? step.detail : step.detail.replace(/received .*/i, "received [redacted]")
  }`).join("\n") ?? "Run validation to generate report."}`;
  return (
    <div className="workspace-scroll workspace-pad">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Authentication diagnostics</span>
          <h2>Why was this token rejected?</h2>
          <p>
            Validate each policy stage and isolate the first actionable failure.
          </p>
        </div>
        <button className="primary-button" onClick={run} disabled={running}>
          <Zap />
          {running ? "Running…" : "Run validation"}
        </button>
      </div>
      <div className="debug-grid">
        <section className="panel decision-panel">
          <span className="eyebrow">Authentication</span>
          <div className="reject">
            {result?.decision === "fail" ? <X /> : <Check />}
            {decision}
          </div>
          <span className="decision-label">Primary failure</span>
          <h3>{result?.primary_failure ?? "None"}</h3>
          <div className="expected-grid">
            <div>
              <span>Expected issuer</span>
              <input
                value={expectedIssuer}
                onChange={(event) => setExpectedIssuer(event.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <span>Expected audience</span>
              <input
                value={expectedAudience}
                onChange={(event) => setExpectedAudience(event.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
        </section>
        <section
          className={`panel validation-panel ${running ? "running" : ""}`}
        >
          <div className="section-heading">
            <span>Validation pipeline</span>
            <span>{running ? "Evaluating…" : result?.primary_failure ?? "Ready"}</span>
          </div>
          {(result?.steps ?? []).map((step, index) => (
            <ValidationRow
              step={step}
              key={step.label}
              delay={index * 65}
              pending={running}
            />
          ))}
          {!result && !running && <div className="empty-row">Run validation to check exp, nbf, iss, and aud.</div>}
        </section>
      </div>
      <section className="panel report-panel">
        <div className="report-toolbar">
          <div className="section-heading">
            <span>Diagnostic report</span>
            <span>Secrets and private keys excluded</span>
          </div>
          <div className="filter-tabs">
            {(["Summary", "Redacted", "Full"] as const).map((mode) => (
              <button
                className={reportMode === mode ? "active" : ""}
                onClick={() => setReportMode(mode)}
                key={mode}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => copyText(report, notify)}
          >
            <Copy />
            Copy report
          </button>
          <button
            className="text-button"
            onClick={() => {
              saveText(report, "l30-diagnostic-report.txt");
              notify("Report saved");
            }}
          >
            <Clipboard />
            Save report
          </button>
        </div>
        <pre>{report}</pre>
      </section>
    </div>
  );
}

function ValidationRow({
  step,
  delay,
  pending,
}: {
  step: ClaimValidationStep;
  delay: number;
  pending: boolean;
}) {
  return (
    <div
      className={`validation-row ${pending ? "pending" : step.state}`}
      style={{ "--delay": `${delay}ms` } as React.CSSProperties}
    >
      <span className="validation-icon">
        {pending ? <Activity /> : step.state === "pass" ? <Check /> : <X />}
      </span>
      <div>
        <strong>{step.label}</strong>
        <span>{pending ? "Checking…" : step.detail}</span>
      </div>
      <StatusPill state={pending ? "PENDING" : step.state} />
    </div>
  );
}
