import { ShieldCheck } from "lucide-react";
import { Logo } from "../common";

export function AboutWorkspace() {
  return (
    <div className="about-page">
      <Logo size={72} />
      <span className="eyebrow">Version 0.1.0</span>
      <h2>L30JWTDesk</h2>
      <p>Inspect. Verify. Understand your tokens.</p>
      <div className="about-local">
        <ShieldCheck />
        <div>
          <strong>Local-first by design</strong>
          <span>
            JWT inspection stays on this device. Network activity is explicit.
          </span>
        </div>
      </div>
      <small>Built for developers debugging real authentication systems.</small>
    </div>
  );
}

