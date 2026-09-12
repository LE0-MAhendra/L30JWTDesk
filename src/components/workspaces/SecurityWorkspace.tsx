import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Fingerprint,
} from "lucide-react";
import { analyzeSecurityFindings, type SecurityFinding } from "../../services/jwt";
import { useAppStore } from "../../store";
import { StatusPill, easing } from "../common";

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`finding severity-${finding.severity}`}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="finding-icon">
          {finding.severity === "passed" ? <Check /> : <AlertTriangle />}
        </span>
        <StatusPill state={finding.severity} />
        <div>
          <strong>{finding.title}</strong>
          <span>{finding.summary}</span>
        </div>
        {open ? <ChevronDown /> : <ChevronRight />}
      </button>
      {open && (
        <div className="finding-detail">
          <span>Recommendation</span>
          <p>{finding.recommendation}</p>
          <code>finding.{finding.id} · claim context safe to display</code>
        </div>
      )}
    </div>
  );
}

export function SecurityWorkspace() {
  const token = useAppStore((state) => state.token);
  const inspection = useAppStore((state) => state.inspection);
  const listRef = useRef<HTMLDivElement>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!token.trim()) {
      setError("Paste and inspect a JWT first.");
      return;
    }

    setRunning(true);
    setError("");
    try {
      setFindings(await analyzeSecurityFindings(token));
    } catch (caught) {
      setError(
        typeof caught === "object" &&
          caught !== null &&
          "message" in caught &&
          typeof caught.message === "string"
          ? caught.message
          : "Security analysis failed",
      );
    } finally {
      setRunning(false);
    }
  };

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(
        () =>
          gsap.from(".finding", {
            opacity: 0,
            y: 6,
            duration: 0.22,
            stagger: 0.04,
            ease: easing,
          }),
        listRef,
      );
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  const highCount = findings.filter((finding) =>
    ["critical", "high"].includes(finding.severity),
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const passedCount = findings.filter(
    (finding) => finding.severity === "passed",
  ).length;
  return (
    <div className="workspace-scroll workspace-pad">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Contextual analysis</span>
          <h2>Security findings</h2>
          <p>Evidence-based observations without an arbitrary risk score.</p>
        </div>
        <button className="primary-button" onClick={run} disabled={running}>
          <AlertTriangle />
          {running ? "Analyzing…" : "Analyze token"}
        </button>
      </div>
      <div className="security-summary">
        <div>
          <span className="severity-line high" />
          <strong>{highCount}</strong>
          <small>High</small>
        </div>
        <div>
          <span className="severity-line warning" />
          <strong>{warningCount}</strong>
          <small>Warnings</small>
        </div>
        <div>
          <span className="severity-line passed" />
          <strong>{passedCount}</strong>
          <small>Passed</small>
        </div>
      </div>
      <div className="security-layout">
        <section ref={listRef} className="panel findings-list">
          <div className="section-heading">
            <span>Findings</span>
            <span>{findings.length} checks</span>
          </div>
          {findings.map((finding) => (
            <FindingRow finding={finding} key={finding.id} />
          ))}
          {!findings.length && <div className="empty-row">{error || "Analyze a loaded token to see findings."}</div>}
        </section>
        <aside className="security-aside">
          <section className="panel exposure">
            <div className="section-heading">
              <span>Payload exposure</span>
              <Fingerprint />
            </div>
            <p>JWT payload data is encoded, not encrypted.</p>
            {inspection?.claims.slice(0, 3).map((claim) => (
              <div className="exposure-row" key={claim.key}>
                <span>{claim.name}</span>
                <code>
                  {Array.isArray(claim.value) ? claim.value.join(", ") : claim.value}
                </code>
              </div>
            ))}
            {!inspection && <div className="empty-row">No token loaded.</div>}
          </section>
          <section className="panel size-panel">
            <div className="section-heading">
              <span>Token size</span>
              <strong>{inspection ? `${(inspection.bytes / 1000).toFixed(2)} KB` : "—"}</strong>
            </div>
            {[
              ["Header", inspection?.header ? JSON.stringify(inspection.header).length : 0],
              ["Payload", inspection?.payload ? JSON.stringify(inspection.payload).length : 0],
              ["Signature", Math.max(token.split(".")[2]?.length ?? 0, 0)],
            ].map(([label, bytes]) => (
              <div className="size-row" key={label}>
                <span>{label}</span>
                <div>
                  <i
                    style={{
                      width: `${inspection ? Math.max(8, Math.min(100, Number(bytes) / 20)) : 0}%`,
                    }}
                  />
                </div>
                <code>{bytes} B</code>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
