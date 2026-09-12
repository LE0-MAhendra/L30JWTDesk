import React, { useLayoutEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { gsap } from "gsap";
import {
  Braces,
  Clipboard,
  Code2,
  Copy,
  Database,
  Fingerprint,
  Play,
  ShieldQuestion,
  Sparkles,
  Trash2,
} from "lucide-react";
import { SAMPLE_TOKEN } from "../services";
import { inspectToken } from "../services/jwt";
import { useAppStore } from "../store";
import type { Claim, TokenInspection } from "../types";
import {
  Countdown,
  IconButton,
  Logo,
  StatusPill,
  Tip,
  copyText,
} from "./common";

const knownClaims = new Set([
  "iss",
  "sub",
  "aud",
  "exp",
  "iat",
  "nbf",
  "jti",
  "scope",
  "scp",
  "roles",
  "permissions",
]);

function claimValue(value: unknown): string | string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function timeValue(value?: number | null): string {
  return value
    ? new Date(value * 1000).toLocaleString()
    : "Missing";
}

function mapInspection(
  result: Awaited<ReturnType<typeof inspectToken>>,
): TokenInspection {
  const claims: Claim[] = [];

  if (result.claims.issuer) {
    claims.push({
      key: "iss",
      name: "Issuer",
      value: result.claims.issuer,
      group: "Identity",
    });
  }

  if (result.claims.subject) {
    claims.push({
      key: "sub",
      name: "Subject",
      value: result.claims.subject,
      group: "Identity",
    });
  }
  if (result.claims.jwt_id) {
    claims.push({
      key: "jti",
      name: "JWT ID",
      value: result.claims.jwt_id,
      group: "Identity",
    });
  }

  if (result.claims.audience.length) {
    claims.push({
      key: "aud",
      name: "Audience",
      value: result.claims.audience,
      group: "Identity",
    });
  }

  claims.push(
    {
      key: "iat",
      name: "Issued At",
      value: timeValue(result.claims.issued_at),
      group: "Timing",
    },
    {
      key: "exp",
      name: "Expiration",
      value: timeValue(result.claims.expiration),
      group: "Timing",
    },
    {
      key: "nbf",
      name: "Not Before",
      value: timeValue(result.claims.not_before),
      group: "Timing",
    },
  );

  if (result.claims.scopes.length) {
    claims.push({
      key: "scope",
      name: "Scopes",
      value: result.claims.scopes,
      group: "Authorization",
    });
  }

  if (result.claims.roles.length) {
    claims.push({
      key: "roles",
      name: "Roles",
      value: result.claims.roles,
      group: "Authorization",
    });
  }
  if (result.claims.permissions.length) {
    claims.push({
      key: "permissions",
      name: "Permissions",
      value: result.claims.permissions,
      group: "Authorization",
    });
  }
  for (const [key, value] of Object.entries(result.payload)) {
    if (!knownClaims.has(key)) {
      claims.push({
        key,
        name: key,
        value: claimValue(value),
        group: "Custom Claims",
      });
    }
  }

  return {
    header: result.header as Record<string, string>,
    payload: result.payload as Record<string, string | number | string[]>,
    claims,
    status: mapStatus(result.timeline.status),
    algorithm: result.metadata.algorithm ?? "Unknown",
    type: result.metadata.token_type ?? "JWT",
    keyId: result.metadata.key_id ?? "None",
    bytes: result.metadata.total_size,
    issuedAt: result.timeline.issued_at ?? 0,
    expiresAt: result.timeline.expires_at ?? 0,
    notBefore: result.timeline.not_before ?? 0,
    lifetimeMinutes: Math.round((result.timeline.lifetime_seconds ?? 0) / 60),
  };
}
function mapStatus(status: string) {
  if (status === "active") return "ACTIVE";
  if (status === "expired") return "EXPIRED";
  if (status === "not_active_yet") return "NOT ACTIVE";
  return "INVALID";
}

function TokenEditor({
  onInspect,
  notify,
}: {
  onInspect: () => void | Promise<void>;
  notify: (message: string) => void;
}) {
  const { token, setToken, setInspection } = useAppStore();
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const bytes = new TextEncoder().encode(token).length;
  const format = token.trim().toLowerCase().startsWith("bearer ")
    ? "Bearer"
    : token.split(".").length === 3
      ? "JWT"
      : token
        ? "Text"
        : "Awaiting token";

  const paste = async () => {
    try {
      setToken(await navigator.clipboard.readText());
      notify("Pasted from clipboard");
    } catch {
      notify("Clipboard access is unavailable");
    }
  };
  const clear = () => {
    setToken("");
    setInspection(null);
  };

  return (
    <section
      className="token-editor panel"
      onContextMenu={(event) => {
        event.preventDefault();
        setContext({ x: event.clientX, y: event.clientY });
      }}
    >
      <div className="panel-toolbar">
        <div>
          <span className="eyebrow">Token input</span>
          <span className="toolbar-meta">
            {format} · {bytes ? `${(bytes / 1024).toFixed(2)} KB` : "0 B"} ·{" "}
            {token.length.toLocaleString()} chars
          </span>
        </div>
        <div className="toolbar-actions">
          <button className="text-button" onClick={() => void paste()}>
            <Clipboard />
            Paste
          </button>
          <button className="text-button" onClick={clear}>
            <Trash2 />
            Clear
          </button>
          <button
            className="primary-button"
            disabled={!token.trim()}
            onClick={onInspect}
          >
            <Play />
            Inspect <kbd>⌘↵</kbd>
          </button>
        </div>
      </div>
      <CodeMirror
        value={token}
        height="112px"
        theme={
          document.documentElement.dataset.theme === "light" ? "light" : "dark"
        }
        onChange={setToken}
        extensions={[
          EditorView.lineWrapping,
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                if (useAppStore.getState().token.trim()) void onInspect();
                return true;
              },
            },
          ]),
        ]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
        }}
        placeholder="Paste a JWT, Bearer token, or Authorization header…"
        aria-label="JWT token input"
      />
      {context && (
        <div
          className="context-menu"
          style={{ left: context.x, top: context.y }}
          onMouseLeave={() => setContext(null)}
        >
          <button
            onClick={() => {
              copyText(token, notify);
              setContext(null);
            }}
          >
            <Copy />
            Copy token
          </button>
          <button
            onClick={() => {
              clear();
              setContext(null);
            }}
          >
            <Trash2 />
            Clear
          </button>
        </div>
      )}
    </section>
  );
}

function TokenSegments({
  onSelect,
}: {
  onSelect: (tab: "payload" | "header" | "raw") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(
        () =>
          gsap.from(".segment", {
            scaleX: 0.86,
            opacity: 0,
            duration: 0.28,
            stagger: 0.07,
            ease: "power3.out",
          }),
        ref,
      );
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="segments" aria-label="Token segments">
      <button
        className="segment segment-header"
        onClick={() => onSelect("header")}
      >
        <span>Header</span>
        <strong>ALGORITHM + TYPE</strong>
      </button>
      <span className="segment-dot">.</span>
      <button
        className="segment segment-payload"
        onClick={() => onSelect("payload")}
      >
        <span>Payload</span>
        <strong>CLAIMS + IDENTITY</strong>
      </button>
      <span className="segment-dot">.</span>
      <button
        className="segment segment-signature"
        onClick={() => onSelect("raw")}
      >
        <span>Signature</span>
        <strong>256 BYTES</strong>
      </button>
    </div>
  );
}

function ClaimsView({ notify }: { notify: (message: string) => void }) {
  const inspection = useAppStore((s) => s.inspection)!;
  const groups = [
    "Identity",
    "Timing",
    "Authorization",
    "Custom Claims",
  ] as const;
  return (
    <div className="claims-view">
      {groups.map((group) => {
        const claims = inspection.claims.filter(
          (claim) => claim.group === group,
        );
        if (!claims.length) return null;
        return (
          <section key={group} className="claim-group">
            <h3>{group}</h3>
            {claims.map((claim) => (
              <div className="claim-row" key={claim.key}>
                <Tip label={claim.hint ?? claim.name}>
                  <code>{claim.key}</code>
                </Tip>
                <div>
                  <span className="claim-name">{claim.name}</span>
                  {Array.isArray(claim.value) ? (
                    <div className="chips">
                      {claim.value.map((value) => (
                        <span key={value}>{value}</span>
                      ))}
                    </div>
                  ) : (
                    <strong>{claim.value}</strong>
                  )}
                </div>
                <IconButton
                  label={`Copy ${claim.name}`}
                  onClick={() =>
                    copyText(
                      Array.isArray(claim.value)
                        ? claim.value.join(" ")
                        : claim.value,
                      notify,
                    )
                  }
                >
                  <Copy />
                </IconButton>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function Timeline() {
  const inspection = useAppStore((s) => s.inspection)!;
  const now = Math.floor(Date.now() / 1000);
  const progress = Math.max(
    0,
    Math.min(
      112,
      ((now - inspection.issuedAt) /
        (inspection.expiresAt - inspection.issuedAt)) *
        100,
    ),
  );
  const format = (seconds: number) =>
    new Date(seconds * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <section className="timeline-section">
      <div className="section-heading">
        <span>Token timeline</span>
        <span>{inspection.lifetimeMinutes} minute lifetime</span>
      </div>
      <div className="timeline-labels">
        <span>Issued</span>
        <span>Now</span>
        <span>Expires</span>
      </div>
      <div className="timeline-track">
        <span
          className="timeline-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        <i className="timeline-marker start" />
        <i
          className="timeline-marker now"
          style={{ left: `${Math.min(progress, 100)}%` }}
        />
        <i className="timeline-marker end" />
      </div>
      <div className="timeline-values">
        <span>{format(inspection.issuedAt)}</span>
        <span>{format(now)}</span>
        <span>{format(inspection.expiresAt)}</span>
      </div>
      <div className="remaining">
        <span>Expires in</span>
        <Countdown expiresAt={inspection.expiresAt} />
      </div>
    </section>
  );
}

function Overview() {
  const inspection = useAppStore((s) => s.inspection)!;
  const facts = [
    ["Algorithm", inspection.algorithm],
    ["Type", inspection.type],
    ["Key ID", inspection.keyId],
    ["Size", `${(inspection.bytes / 1000).toFixed(2)} KB`],
    ["Lifetime", `${inspection.lifetimeMinutes} minutes`],
  ];
  return (
    <aside className="overview">
      <div className="overview-head">
        <span className="eyebrow">Status</span>
        <StatusPill state={inspection.status} />
      </div>
      <div className="fact-list">
        {facts.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <Timeline />
      <div className="trust-note">
        <ShieldQuestion />
        <div>
          <strong>Signature unverified</strong>
          <span>Inspecting claims does not establish trust.</span>
        </div>
      </div>
    </aside>
  );
}

export function InspectionWorkspace({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const { token, inspection, setInspection, setToken } = useAppStore();
  const [tab, setTab] = useState<"payload" | "header" | "claims" | "raw">(
    "payload",
  );
  const [leftWidth, setLeftWidth] = useState(
    () => Number(localStorage.getItem("l30-pane")) || 70,
  );
  const paneRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const inspect = async () => {
    if (!token.trim()) return;

    try {
      const result = await inspectToken(token);

      setInspection(mapInspection(result));

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }, 20);
    }  catch (error) {
      console.error(error);

      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        notify(error.message);
        return;
      }

      notify("Token inspection failed");
    }
  };
  const loadSample = async () => {
    setToken(SAMPLE_TOKEN);
    try {
      const result = await inspectToken(SAMPLE_TOKEN);
      setInspection(mapInspection(result));
      notify("Sample token loaded");
    } catch (error) {
      console.error(error);
      notify("Sample token inspection failed");
    }
  };
  const resize = (event: React.PointerEvent) => {
    const pane = paneRef.current;
    if (!pane) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = pane.getBoundingClientRect();
      setLeftWidth(
        Math.max(
          48,
          Math.min(78, ((moveEvent.clientX - rect.left) / rect.width) * 100),
        ),
      );
    };
    const up = () => {
      localStorage.setItem("l30-pane", String(leftWidth));
      window.removeEventListener("pointermove", move);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  return (
    <div className="workspace-scroll inspect-workspace">
      {!inspection && (
        <div className="inspect-intro">
          <Logo size={34} />
          <div>
            <h2>Inspect your first token</h2>
            <p>
              Paste a JWT, Bearer token, or Authorization header. Everything is
              processed locally.
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={loadSample}
          >
            <Sparkles />
            Load sample
          </button>
        </div>
      )}
      <TokenEditor onInspect={inspect} notify={notify} />
      {inspection && (
        <div ref={resultsRef} className="inspection-results">
          <TokenSegments onSelect={(selected) => setTab(selected)} />
          <div ref={paneRef} className="inspector-split">
            <section
              className="inspector-main panel"
              style={{ width: `${leftWidth}%` }}
            >
              <div className="editor-tabs" role="tablist">
                {(["payload", "header", "claims", "raw"] as const).map(
                  (item) => (
                    <button
                      key={item}
                      role="tab"
                      aria-selected={tab === item}
                      className={tab === item ? "active" : ""}
                      onClick={() => setTab(item)}
                    >
                      {item === "payload" ? (
                        <Braces />
                      ) : item === "header" ? (
                        <Code2 />
                      ) : item === "claims" ? (
                        <Database />
                      ) : (
                        <Fingerprint />
                      )}
                      {item}
                    </button>
                  ),
                )}
              </div>
              <div className="tab-content">
                {tab === "claims" ? (
                  <ClaimsView notify={notify} />
                ) : (
                  <CodeMirror
                    value={
                      tab === "raw"
                        ? token
                        : JSON.stringify(
                            tab === "header"
                              ? inspection.header
                              : inspection.payload,
                            null,
                            2,
                          )
                    }
                    height="100%"
                    theme={
                      document.documentElement.dataset.theme === "light"
                        ? "light"
                        : "dark"
                    }
                    extensions={[json()]}
                    readOnly
                    basicSetup={{
                      highlightActiveLine: false,
                      highlightActiveLineGutter: false,
                    }}
                  />
                )}
              </div>
            </section>
            <div
              className="resizer"
              role="separator"
              aria-label="Resize inspector panels"
              tabIndex={0}
              onPointerDown={resize}
              onDoubleClick={() => setLeftWidth(70)}
            />
            <Overview />
          </div>
        </div>
      )}
    </div>
  );
}
