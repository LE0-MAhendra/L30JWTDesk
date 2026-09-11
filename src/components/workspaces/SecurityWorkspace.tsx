import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Fingerprint,
} from "lucide-react";
import { securityFindings } from "../../services";
import type { SecurityFinding } from "../../types";
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
  const listRef = useRef<HTMLDivElement>(null);
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
  return (
    <div className="workspace-scroll workspace-pad">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Contextual analysis</span>
          <h2>Security findings</h2>
          <p>Evidence-based observations without an arbitrary risk score.</p>
        </div>
      </div>
      <div className="security-summary">
        <div>
          <span className="severity-line high" />
          <strong>1</strong>
          <small>High</small>
        </div>
        <div>
          <span className="severity-line warning" />
          <strong>2</strong>
          <small>Warnings</small>
        </div>
        <div>
          <span className="severity-line passed" />
          <strong>2</strong>
          <small>Passed</small>
        </div>
      </div>
      <div className="security-layout">
        <section ref={listRef} className="panel findings-list">
          <div className="section-heading">
            <span>Findings</span>
            <span>5 checks</span>
          </div>
          {securityFindings.map((finding) => (
            <FindingRow finding={finding} key={finding.id} />
          ))}
        </section>
        <aside className="security-aside">
          <section className="panel exposure">
            <div className="section-heading">
              <span>Payload exposure</span>
              <Fingerprint />
            </div>
            <p>JWT payload data is encoded, not encrypted.</p>
            <div className="exposure-row">
              <span>Email</span>
              <code>alex@example.test</code>
            </div>
            <div className="exposure-row">
              <span>User ID</span>
              <code>user_2841</code>
            </div>
            <div className="exposure-row">
              <span>Roles</span>
              <code>admin, reviewer</code>
            </div>
          </section>
          <section className="panel size-panel">
            <div className="section-heading">
              <span>Token size</span>
              <strong>2.84 KB</strong>
            </div>
            {[
              ["Header", 52, 18],
              ["Payload", 1910, 67],
              ["Signature", 342, 15],
            ].map(([label, bytes, width]) => (
              <div className="size-row" key={label}>
                <span>{label}</span>
                <div>
                  <i style={{ width: `${width}%` }} />
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

