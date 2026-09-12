import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { Copy, GitCompare } from "lucide-react";
import { SAMPLE_TOKEN } from "../../services";
import { compareTokens, type TokenDiffRow } from "../../services/jwt";
import { StatusPill, copyText } from "../common";
import { useAppStore } from "../../store";

function tokenMeta(token: string) {
  try {
    const header = JSON.parse(atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));
    const bytes = new TextEncoder().encode(token).length;
    return `${header.alg ?? "JWT"} · ${(bytes / 1024).toFixed(2)} KB`;
  } catch {
    return token.trim() ? "Text" : "Empty";
  }
}

export function CompareWorkspace({ notify }: { notify: (message: string) => void }) {
  const selectedToken = useAppStore((state) => state.token);
  const [a, setA] = useState(selectedToken || SAMPLE_TOKEN);
  const [b, setB] = useState(SAMPLE_TOKEN);
  const [filter, setFilter] = useState("Changed");
  const [rows, setRows] = useState<TokenDiffRow[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (selectedToken) setA(selectedToken);
  }, [selectedToken]);
  const run = async () => {
    setRunning(true);
    setError("");
    try {
      setRows(await compareTokens({ token_a: a, token_b: b }));
      notify("Token comparison complete");
    } catch (caught) {
      const message =
        typeof caught === "object" &&
        caught !== null &&
        "message" in caught &&
        typeof caught.message === "string"
          ? caught.message
          : "Token comparison failed";
      setError(message);
      notify(message);
    } finally {
      setRunning(false);
    }
  };
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
        <button className="primary-button" onClick={run} disabled={running}>
          <GitCompare />
          {running ? "Comparing…" : "Compare"}
        </button>
      </div>
      <div className="compare-editors">
        <section className="panel">
          <div className="panel-toolbar">
            <span className="eyebrow">Token A</span>
            <span className="toolbar-meta">{tokenMeta(a)}</span>
          </div>
          <CodeMirror value={a} onChange={setA} height="130px" theme="dark" />
        </section>
        <section className="panel">
          <div className="panel-toolbar">
            <span className="eyebrow">Token B</span>
            <span className="toolbar-meta">{tokenMeta(b)}</span>
          </div>
          <CodeMirror value={b} onChange={setB} height="130px" theme="dark" />
        </section>
      </div>
      <section className="panel diff-panel">
        <div className="diff-toolbar">
          <div className="section-heading">
            <span>Claim diff</span>
            <span>{rows.filter((row) => row.status !== "SAME").length} changes</span>
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
          <div className="empty-row">
            {error || `No ${filter.toLowerCase()} claims.`}
          </div>
        )}
      </section>
    </div>
  );
}
