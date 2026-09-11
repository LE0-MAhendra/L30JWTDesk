import React, { useState } from "react";
import { Activity, Check, Clipboard, Copy, X, Zap } from "lucide-react";
import { validationSteps } from "../../services";
import type { ValidationStep } from "../../types";
import { StatusPill, copyText, saveText } from "../common";

export function DebugWorkspace({ notify }: { notify: (message: string) => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(true);
  const [reportMode, setReportMode] = useState<"Summary" | "Redacted" | "Full">(
    "Redacted",
  );
  const run = () => {
    setRunning(true);
    setDone(false);
    window.setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, 620);
  };
  const report = `L30JWTDesk diagnostic report\nDecision: REJECT\nPrimary failure: Audience mismatch\nExpected: college-api\nReceived: ${reportMode === "Full" ? "college-web" : "[redacted]"}\nSignature: PASS (RS256)\nTiming: PASS (23m remaining)`;
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
            <X />
            Reject
          </div>
          <span className="decision-label">Primary failure</span>
          <h3>Audience mismatch</h3>
          <div className="expected-grid">
            <div>
              <span>Expected</span>
              <code>college-api</code>
            </div>
            <div>
              <span>Received</span>
              <code>college-web</code>
            </div>
          </div>
        </section>
        <section
          className={`panel validation-panel ${running ? "running" : ""}`}
        >
          <div className="section-heading">
            <span>Validation pipeline</span>
            <span>{done ? "1 failure" : "Evaluating…"}</span>
          </div>
          {validationSteps.map((step, index) => (
            <ValidationRow
              step={step}
              key={step.label}
              delay={index * 65}
              pending={!done}
            />
          ))}
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
  step: ValidationStep;
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

