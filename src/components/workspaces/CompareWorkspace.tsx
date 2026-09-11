import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Copy } from "lucide-react";
import { SAMPLE_TOKEN } from "../../services";
import { StatusPill, copyText } from "../common";

export function CompareWorkspace({ notify }: { notify: (message: string) => void }) {
  const [a, setA] = useState(SAMPLE_TOKEN);
  const [b, setB] = useState(
    SAMPLE_TOKEN.replace("college-api", "college-web"),
  );
  const [filter, setFilter] = useState("Changed");
  const rows = [
    { key: "aud", status: "MODIFIED", a: "college-api", b: "college-web" },
    { key: "roles", status: "MODIFIED", a: "admin, reviewer", b: "reviewer" },
    { key: "azp", status: "ADDED", a: "—", b: "web-client" },
    { key: "sub", status: "SAME", a: "user_2841", b: "user_2841" },
  ];
  const visible =
    filter === "All"
      ? rows
      : rows.filter(
          (row) =>
            row.status === filter.toUpperCase().replace("CHANGED", "MODIFIED"),
        );
  return (
    <div className="workspace-scroll workspace-pad">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Claim-level comparison</span>
          <h2>Compare tokens</h2>
          <p>
            Review structural and semantic differences without exposing tokens
            to a network.
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() =>
            copyText(
              visible.map((r) => `${r.key}: ${r.a} → ${r.b}`).join("\n"),
              notify,
            )
          }
        >
          <Copy />
          Copy diff
        </button>
      </div>
      <div className="compare-editors">
        <section className="panel">
          <div className="panel-toolbar">
            <span className="eyebrow">Token A</span>
            <span className="toolbar-meta">RS256 · 2.84 KB</span>
          </div>
          <CodeMirror value={a} onChange={setA} height="130px" theme="dark" />
        </section>
        <section className="panel">
          <div className="panel-toolbar">
            <span className="eyebrow">Token B</span>
            <span className="toolbar-meta">RS256 · 2.81 KB</span>
          </div>
          <CodeMirror value={b} onChange={setB} height="130px" theme="dark" />
        </section>
      </div>
      <section className="panel diff-panel">
        <div className="diff-toolbar">
          <div className="section-heading">
            <span>Claim diff</span>
            <span>3 changes</span>
          </div>
          <div className="filter-tabs">
            {["All", "Changed", "Added", "Removed", "Same"].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="diff-header">
          <span>Claim</span>
          <span>Token A</span>
          <span>Token B</span>
          <span>Status</span>
        </div>
        {visible.map((row) => (
          <div
            className={`diff-row diff-${row.status.toLowerCase()}`}
            key={row.key}
          >
            <code>{row.key}</code>
            <span>{row.a}</span>
            <span>{row.b}</span>
            <StatusPill state={row.status} />
          </div>
        ))}
        {!visible.length && (
          <div className="empty-row">No {filter.toLowerCase()} claims.</div>
        )}
      </section>
    </div>
  );
}

