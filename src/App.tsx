import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import * as Tooltip from '@radix-ui/react-tooltip';
import { gsap } from 'gsap';
import {
  Activity, AlertTriangle, AppWindow, Braces, Check, ChevronDown, ChevronRight,
  Clipboard, Clock3, Code2, Columns2, Copy, Database, FileKey2, Fingerprint,
  GitCompareArrows, Info, KeyRound, LayoutPanelLeft, Menu, Minimize2, Moon,
  Network, PanelLeftClose, PanelLeftOpen, Play, RotateCcw, Search, Settings,
  ShieldCheck, ShieldQuestion, Sparkles, Sun, TerminalSquare, Trash2, Wifi, Eye, EyeOff,
  X, Zap,
} from 'lucide-react';
import { useAppStore } from './store';
import { mockInspection, SAMPLE_TOKEN, securityFindings, validationSteps } from './services';
import type { SecurityFinding, Theme, ValidationStep, Workspace } from './types';

const DURATIONS = { micro: 0.14, control: 0.2, panel: 0.26 };
const easing = 'power2.out';

const navItems: Array<{ id: Workspace; label: string; icon: typeof Search; shortcut?: string }> = [
  { id: 'inspect', label: 'Inspect', icon: Search, shortcut: '⌘1' },
  { id: 'verify', label: 'Verify', icon: ShieldCheck, shortcut: '⌘2' },
  { id: 'security', label: 'Security', icon: Fingerprint, shortcut: '⌘3' },
  { id: 'compare', label: 'Compare', icon: GitCompareArrows, shortcut: '⌘4' },
  { id: 'debug', label: 'Debug', icon: TerminalSquare, shortcut: '⌘5' },
];

const workspaceLabels: Record<Workspace, string> = {
  inspect: 'Inspect', verify: 'Verify', security: 'Security', compare: 'Compare',
  debug: 'Debug', settings: 'Settings', about: 'About',
};

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 28 28" fill="none" aria-label="L30 logo" role="img">
      <path d="M14 2.2 24.2 8v12L14 25.8 3.8 20V8L14 2.2Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 9.4h11.6M8.2 14h7.5M8.2 18.6h11.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18.8" cy="14" r="2.2" fill="var(--accent)" stroke="var(--background)" />
    </svg>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip.Root delayDuration={450}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={7}>{label}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content></Tooltip.Portal>
    </Tooltip.Root>
  );
}

function IconButton({ label, onClick, children, pressed }: { label: string; onClick?: () => void; children: React.ReactNode; pressed?: boolean }) {
  return <Tip label={label}><button className="icon-button" type="button" aria-label={label} aria-pressed={pressed} onClick={onClick}>{children}</button></Tip>;
}

function copyText(text: string, notify: (message: string) => void) {
  void navigator.clipboard.writeText(text).then(() => notify('Copied to clipboard'));
}

function saveText(text: string, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function Countdown({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const id = window.setInterval(() => setRemaining(Math.max(0, expiresAt - Math.floor(Date.now() / 1000))), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return <span className="countdown">{minutes}m {String(seconds).padStart(2, '0')}s</span>;
}

function StatusPill({ state, label }: { state: string; label?: string }) {
  return <span className={`status status-${state.toLowerCase().replace(' ', '-')}`}><span className="status-dot" />{label ?? state}</span>;
}

function WindowControls() {
  const act = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow()[action]();
    } catch { /* Browser preview has no native window. */ }
  };
  return (
    <div className="window-controls">
      <button aria-label="Minimize window" onClick={() => void act('minimize')}><Minimize2 /></button>
      <button aria-label="Maximize window" onClick={() => void act('toggleMaximize')}><AppWindow /></button>
      <button className="window-close" aria-label="Close window" onClick={() => void act('close')}><X /></button>
    </div>
  );
}

function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, workspace, setWorkspace } = useAppStore();
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(ref.current, { width: sidebarCollapsed ? 56 : 212, duration: DURATIONS.control, ease: easing });
      gsap.to('.nav-label, .nav-shortcut, .sidebar-section-label', { opacity: sidebarCollapsed ? 0 : 1, x: sidebarCollapsed ? -5 : 0, duration: DURATIONS.micro, ease: easing });
    }, ref);
    return () => ctx.revert();
  }, [sidebarCollapsed]);

  const navButton = ({ id, label, icon: Icon, shortcut }: (typeof navItems)[number]) => (
    <Tip key={id} label={sidebarCollapsed ? label : `${label}${shortcut ? ` · ${shortcut}` : ''}`}>
      <button className={`nav-item ${workspace === id ? 'active' : ''}`} aria-current={workspace === id ? 'page' : undefined} onClick={() => setWorkspace(id)}>
        <Icon aria-hidden="true" /><span className="nav-label">{label}</span>{shortcut && <span className="nav-shortcut">{shortcut}</span>}
      </button>
    </Tip>
  );

  return (
    <aside ref={ref} className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="collapse-button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleSidebar}>
          {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span className="nav-label">Workspaces</span>
        </button>
        <span className="sidebar-section-label">Workspace</span>
        <nav>{navItems.map(navButton)}</nav>
      </div>
      <nav className="sidebar-bottom">
        {navButton({ id: 'settings', label: 'Settings', icon: Settings })}
        {navButton({ id: 'about', label: 'About', icon: Info })}
      </nav>
    </aside>
  );
}

function TokenEditor({ onInspect, notify }: { onInspect: () => void; notify: (message: string) => void }) {
  const { token, setToken, setInspection } = useAppStore();
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const bytes = new TextEncoder().encode(token).length;
  const format = token.trim().toLowerCase().startsWith('bearer ') ? 'Bearer' : token.split('.').length === 3 ? 'JWT' : token ? 'Text' : 'Awaiting token';

  const paste = async () => {
    try { setToken(await navigator.clipboard.readText()); notify('Pasted from clipboard'); }
    catch { notify('Clipboard access is unavailable'); }
  };
  const clear = () => { setToken(''); setInspection(null); };

  return (
    <section className="token-editor panel" onContextMenu={(event) => { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }); }}>
      <div className="panel-toolbar">
        <div><span className="eyebrow">Token input</span><span className="toolbar-meta">{format} · {bytes ? `${(bytes / 1024).toFixed(2)} KB` : '0 B'} · {token.length.toLocaleString()} chars</span></div>
        <div className="toolbar-actions">
          <button className="text-button" onClick={() => void paste()}><Clipboard />Paste</button>
          <button className="text-button" onClick={clear}><Trash2 />Clear</button>
          <button className="primary-button" disabled={!token.trim()} onClick={onInspect}><Play />Inspect <kbd>⌘↵</kbd></button>
        </div>
      </div>
      <CodeMirror
        value={token}
        height="112px"
        theme={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'}
        onChange={setToken}
        extensions={[EditorView.lineWrapping]}
        basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
        placeholder="Paste a JWT, Bearer token, or Authorization header…"
        aria-label="JWT token input"
      />
      {context && <div className="context-menu" style={{ left: context.x, top: context.y }} onMouseLeave={() => setContext(null)}>
        <button onClick={() => { copyText(token, notify); setContext(null); }}><Copy />Copy token</button>
        <button onClick={() => { clear(); setContext(null); }}><Trash2 />Clear</button>
      </div>}
    </section>
  );
}

function TokenSegments({ onSelect }: { onSelect: (tab: 'payload' | 'header' | 'raw') => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => gsap.from('.segment', { scaleX: 0.86, opacity: 0, duration: 0.28, stagger: 0.07, ease: 'power3.out' }), ref);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="segments" aria-label="Token segments">
      <button className="segment segment-header" onClick={() => onSelect('header')}><span>Header</span><strong>ALGORITHM + TYPE</strong></button>
      <span className="segment-dot">.</span>
      <button className="segment segment-payload" onClick={() => onSelect('payload')}><span>Payload</span><strong>CLAIMS + IDENTITY</strong></button>
      <span className="segment-dot">.</span>
      <button className="segment segment-signature" onClick={() => onSelect('raw')}><span>Signature</span><strong>256 BYTES</strong></button>
    </div>
  );
}

function ClaimsView({ notify }: { notify: (message: string) => void }) {
  const inspection = useAppStore((s) => s.inspection)!;
  const groups = ['Identity', 'Timing', 'Authorization', 'Custom Claims'] as const;
  return <div className="claims-view">{groups.map((group) => {
    const claims = inspection.claims.filter((claim) => claim.group === group);
    if (!claims.length) return null;
    return <section key={group} className="claim-group"><h3>{group}</h3>{claims.map((claim) => (
      <div className="claim-row" key={claim.key}>
        <Tip label={claim.hint ?? claim.name}><code>{claim.key}</code></Tip>
        <div><span className="claim-name">{claim.name}</span>{Array.isArray(claim.value) ? <div className="chips">{claim.value.map((value) => <span key={value}>{value}</span>)}</div> : <strong>{claim.value}</strong>}</div>
        <IconButton label={`Copy ${claim.name}`} onClick={() => copyText(Array.isArray(claim.value) ? claim.value.join(' ') : claim.value, notify)}><Copy /></IconButton>
      </div>
    ))}</section>;
  })}</div>;
}

function Timeline() {
  const inspection = useAppStore((s) => s.inspection)!;
  const now = Math.floor(Date.now() / 1000);
  const progress = Math.max(0, Math.min(112, ((now - inspection.issuedAt) / (inspection.expiresAt - inspection.issuedAt)) * 100));
  const format = (seconds: number) => new Date(seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <section className="timeline-section">
      <div className="section-heading"><span>Token timeline</span><span>{inspection.lifetimeMinutes} minute lifetime</span></div>
      <div className="timeline-labels"><span>Issued</span><span>Now</span><span>Expires</span></div>
      <div className="timeline-track"><span className="timeline-fill" style={{ width: `${Math.min(progress, 100)}%` }} /><i className="timeline-marker start" /><i className="timeline-marker now" style={{ left: `${Math.min(progress, 100)}%` }} /><i className="timeline-marker end" /></div>
      <div className="timeline-values"><span>{format(inspection.issuedAt)}</span><span>{format(now)}</span><span>{format(inspection.expiresAt)}</span></div>
      <div className="remaining"><span>Expires in</span><Countdown expiresAt={inspection.expiresAt} /></div>
    </section>
  );
}

function Overview() {
  const inspection = useAppStore((s) => s.inspection)!;
  const facts = [
    ['Algorithm', inspection.algorithm], ['Type', inspection.type], ['Key ID', inspection.keyId],
    ['Size', `${(inspection.bytes / 1000).toFixed(2)} KB`], ['Lifetime', `${inspection.lifetimeMinutes} minutes`],
  ];
  return <aside className="overview"><div className="overview-head"><span className="eyebrow">Status</span><StatusPill state={inspection.status} /></div>
    <div className="fact-list">{facts.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><Timeline />
    <div className="trust-note"><ShieldQuestion /><div><strong>Signature unverified</strong><span>Inspecting claims does not establish trust.</span></div></div>
  </aside>;
}

function InspectionWorkspace({ notify }: { notify: (message: string) => void }) {
  const { token, inspection, setInspection, setToken } = useAppStore();
  const [tab, setTab] = useState<'payload' | 'header' | 'claims' | 'raw'>('payload');
  const [leftWidth, setLeftWidth] = useState(() => Number(localStorage.getItem('l30-pane')) || 70);
  const paneRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const inspect = () => {
    if (!token.trim()) return;
    setInspection(mockInspection());
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 20);
  };
  const resize = (event: React.PointerEvent) => {
    const pane = paneRef.current;
    if (!pane) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = pane.getBoundingClientRect();
      setLeftWidth(Math.max(48, Math.min(78, ((moveEvent.clientX - rect.left) / rect.width) * 100)));
    };
    const up = () => { localStorage.setItem('l30-pane', String(leftWidth)); window.removeEventListener('pointermove', move); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
  };

  return <div className="workspace-scroll inspect-workspace">
    {!inspection && <div className="inspect-intro"><Logo size={34} /><div><h2>Inspect your first token</h2><p>Paste a JWT, Bearer token, or Authorization header. Everything is processed locally.</p></div><button className="secondary-button" onClick={() => { setToken(SAMPLE_TOKEN); setInspection(mockInspection()); }}><Sparkles />Load sample</button></div>}
    <TokenEditor onInspect={inspect} notify={notify} />
    {inspection && <div ref={resultsRef} className="inspection-results">
      <TokenSegments onSelect={(selected) => setTab(selected)} />
      <div ref={paneRef} className="inspector-split">
        <section className="inspector-main panel" style={{ width: `${leftWidth}%` }}>
          <div className="editor-tabs" role="tablist">{(['payload', 'header', 'claims', 'raw'] as const).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'payload' ? <Braces /> : item === 'header' ? <Code2 /> : item === 'claims' ? <Database /> : <Fingerprint />}{item}</button>)}</div>
          <div className="tab-content">
            {tab === 'claims' ? <ClaimsView notify={notify} /> : <CodeMirror value={tab === 'raw' ? token : JSON.stringify(tab === 'header' ? inspection.header : inspection.payload, null, 2)} height="100%" theme={document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'} extensions={[json()]} readOnly basicSetup={{ highlightActiveLine: false, highlightActiveLineGutter: false }} />}
          </div>
        </section>
        <div className="resizer" role="separator" aria-label="Resize inspector panels" tabIndex={0} onPointerDown={resize} onDoubleClick={() => setLeftWidth(70)} />
        <Overview />
      </div>
    </div>}
  </div>;
}

function VerifyWorkspace({ notify }: { notify: (message: string) => void }) {
  const [mode, setMode] = useState<'secret' | 'public' | 'jwks' | 'oidc'>('jwks');
  const [value, setValue] = useState('https://auth.example.com/.well-known/jwks.json');
  const [revealSecret, setRevealSecret] = useState(false);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const run = () => { setRunning(true); setComplete(false); window.setTimeout(() => { setRunning(false); setComplete(true); notify('Verification complete'); }, 650); };
  const titles = { secret: 'HMAC secret', public: 'Public key', jwks: 'JWKS URL', oidc: 'OIDC issuer' };
  const pipeline = mode === 'oidc' ? ['Issuer', 'Discovery', 'Metadata', 'JWKS', 'Key', 'Verify'] : mode === 'jwks' ? ['Token', 'kid', 'JWKS', 'Key match', 'Verification'] : ['Token', 'Key material', 'Algorithm', 'Verification'];
  return <div className="workspace-scroll workspace-pad">
    <div className="workspace-heading"><div><span className="eyebrow">Cryptographic verification</span><h2>Verify signature</h2><p>Inspection is local. Network access occurs only when you request JWKS or OIDC discovery.</p></div><StatusPill state={complete ? 'VERIFIED' : 'UNVERIFIED'} /></div>
    <div className="segmented-control">{(['secret', 'public', 'jwks', 'oidc'] as const).map((item) => <button key={item} className={mode === item ? 'active' : ''} onClick={() => { setMode(item); setComplete(false); setValue(item === 'jwks' ? 'https://auth.example.com/.well-known/jwks.json' : item === 'oidc' ? 'https://auth.example.com' : ''); }}>{item === 'secret' ? <KeyRound /> : item === 'public' ? <FileKey2 /> : item === 'jwks' ? <Network /> : <Wifi />}{item.toUpperCase()}</button>)}</div>
    <div className="verify-grid">
      <section className="panel form-panel"><div className="panel-toolbar"><span className="eyebrow">{titles[mode]}</span>{(mode === 'jwks' || mode === 'oidc') && <span className="network-badge"><Wifi />Network operation</span>}</div>
        <label htmlFor="verify-value">{titles[mode]}</label>
        {mode === 'public' ? <CodeMirror value={value} onChange={setValue} height="220px" theme="dark" placeholder="-----BEGIN PUBLIC KEY-----" /> : mode === 'secret' ? <div className="secret-field"><input id="verify-value" type={revealSecret ? 'text' : 'password'} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter secret (never persisted)" autoComplete="off" /><IconButton label={revealSecret ? 'Hide secret' : 'Show secret'} onClick={() => setRevealSecret(!revealSecret)} pressed={revealSecret}>{revealSecret ? <EyeOff /> : <Eye />}</IconButton></div> : <input id="verify-value" type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder={titles[mode]} autoComplete="off" />}
        <div className="form-hint">{mode === 'secret' ? 'Secret values remain in memory and are never logged or persisted.' : mode === 'public' ? 'PEM public keys and X.509 certificates are supported by the backend integration point.' : 'The requested endpoint will be visible in the verification trace.'}</div>
        <button className="primary-button verify-action" disabled={!value || running} onClick={run}><ShieldCheck />{running ? 'Verifying…' : 'Verify signature'}</button>
      </section>
      <section className="panel pipeline-panel"><div className="section-heading"><span>Verification trace</span><span>{complete ? 'Completed in 184 ms' : 'Ready'}</span></div>
        <div className={`pipeline ${running ? 'running' : ''}`}>{pipeline.map((step, index) => <div className="pipeline-row" key={step} style={{ '--delay': `${index * 70}ms` } as React.CSSProperties}><span>{index + 1}</span><div><strong>{step}</strong><small>{complete ? (step === 'JWKS' ? '3 keys fetched' : step === 'Key match' || step === 'Key' ? 'kid auth-key-2026' : 'Resolved') : 'Pending'}</small></div>{complete && <Check />}</div>)}</div>
        {complete && <div className="verification-result"><ShieldCheck /><div><strong>Signature verified</strong><span>RS256 · auth-key-2026 · key use: sig</span></div></div>}
      </section>
    </div>
  </div>;
}

function FindingRow({ finding }: { finding: SecurityFinding }) {
  const [open, setOpen] = useState(false);
  return <div className={`finding severity-${finding.severity}`}><button aria-expanded={open} onClick={() => setOpen(!open)}><span className="finding-icon">{finding.severity === 'passed' ? <Check /> : <AlertTriangle />}</span><StatusPill state={finding.severity} /><div><strong>{finding.title}</strong><span>{finding.summary}</span></div>{open ? <ChevronDown /> : <ChevronRight />}</button>{open && <div className="finding-detail"><span>Recommendation</span><p>{finding.recommendation}</p><code>finding.{finding.id} · claim context safe to display</code></div>}</div>;
}

function SecurityWorkspace() {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => gsap.from('.finding', { opacity: 0, y: 6, duration: 0.22, stagger: 0.04, ease: easing }), listRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return <div className="workspace-scroll workspace-pad"><div className="workspace-heading"><div><span className="eyebrow">Contextual analysis</span><h2>Security findings</h2><p>Evidence-based observations without an arbitrary risk score.</p></div></div>
    <div className="security-summary"><div><span className="severity-line high" /><strong>1</strong><small>High</small></div><div><span className="severity-line warning" /><strong>2</strong><small>Warnings</small></div><div><span className="severity-line passed" /><strong>2</strong><small>Passed</small></div></div>
    <div className="security-layout"><section ref={listRef} className="panel findings-list"><div className="section-heading"><span>Findings</span><span>5 checks</span></div>{securityFindings.map((finding) => <FindingRow finding={finding} key={finding.id} />)}</section>
      <aside className="security-aside"><section className="panel exposure"><div className="section-heading"><span>Payload exposure</span><Fingerprint /></div><p>JWT payload data is encoded, not encrypted.</p><div className="exposure-row"><span>Email</span><code>alex@example.test</code></div><div className="exposure-row"><span>User ID</span><code>user_2841</code></div><div className="exposure-row"><span>Roles</span><code>admin, reviewer</code></div></section>
      <section className="panel size-panel"><div className="section-heading"><span>Token size</span><strong>2.84 KB</strong></div>{[['Header', 52, 18], ['Payload', 1910, 67], ['Signature', 342, 15]].map(([label, bytes, width]) => <div className="size-row" key={label}><span>{label}</span><div><i style={{ width: `${width}%` }} /></div><code>{bytes} B</code></div>)}</section></aside>
    </div></div>;
}

function CompareWorkspace({ notify }: { notify: (message: string) => void }) {
  const [a, setA] = useState(SAMPLE_TOKEN);
  const [b, setB] = useState(SAMPLE_TOKEN.replace('college-api', 'college-web'));
  const [filter, setFilter] = useState('Changed');
  const rows = [
    { key: 'aud', status: 'MODIFIED', a: 'college-api', b: 'college-web' },
    { key: 'roles', status: 'MODIFIED', a: 'admin, reviewer', b: 'reviewer' },
    { key: 'azp', status: 'ADDED', a: '—', b: 'web-client' },
    { key: 'sub', status: 'SAME', a: 'user_2841', b: 'user_2841' },
  ];
  const visible = filter === 'All' ? rows : rows.filter((row) => row.status === filter.toUpperCase().replace('CHANGED', 'MODIFIED'));
  return <div className="workspace-scroll workspace-pad"><div className="workspace-heading"><div><span className="eyebrow">Claim-level comparison</span><h2>Compare tokens</h2><p>Review structural and semantic differences without exposing tokens to a network.</p></div><button className="secondary-button" onClick={() => copyText(visible.map((r) => `${r.key}: ${r.a} → ${r.b}`).join('\n'), notify)}><Copy />Copy diff</button></div>
    <div className="compare-editors"><section className="panel"><div className="panel-toolbar"><span className="eyebrow">Token A</span><span className="toolbar-meta">RS256 · 2.84 KB</span></div><CodeMirror value={a} onChange={setA} height="130px" theme="dark" /></section><section className="panel"><div className="panel-toolbar"><span className="eyebrow">Token B</span><span className="toolbar-meta">RS256 · 2.81 KB</span></div><CodeMirror value={b} onChange={setB} height="130px" theme="dark" /></section></div>
    <section className="panel diff-panel"><div className="diff-toolbar"><div className="section-heading"><span>Claim diff</span><span>3 changes</span></div><div className="filter-tabs">{['All', 'Changed', 'Added', 'Removed', 'Same'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <div className="diff-header"><span>Claim</span><span>Token A</span><span>Token B</span><span>Status</span></div>{visible.map((row) => <div className={`diff-row diff-${row.status.toLowerCase()}`} key={row.key}><code>{row.key}</code><span>{row.a}</span><span>{row.b}</span><StatusPill state={row.status} /></div>)}{!visible.length && <div className="empty-row">No {filter.toLowerCase()} claims.</div>}
    </section></div>;
}

function DebugWorkspace({ notify }: { notify: (message: string) => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(true);
  const [reportMode, setReportMode] = useState<'Summary' | 'Redacted' | 'Full'>('Redacted');
  const run = () => { setRunning(true); setDone(false); window.setTimeout(() => { setRunning(false); setDone(true); }, 620); };
  const report = `L30JWTDesk diagnostic report\nDecision: REJECT\nPrimary failure: Audience mismatch\nExpected: college-api\nReceived: ${reportMode === 'Full' ? 'college-web' : '[redacted]'}\nSignature: PASS (RS256)\nTiming: PASS (23m remaining)`;
  return <div className="workspace-scroll workspace-pad"><div className="workspace-heading"><div><span className="eyebrow">Authentication diagnostics</span><h2>Why was this token rejected?</h2><p>Validate each policy stage and isolate the first actionable failure.</p></div><button className="primary-button" onClick={run} disabled={running}><Zap />{running ? 'Running…' : 'Run validation'}</button></div>
    <div className="debug-grid"><section className="panel decision-panel"><span className="eyebrow">Authentication</span><div className="reject"><X />Reject</div><span className="decision-label">Primary failure</span><h3>Audience mismatch</h3><div className="expected-grid"><div><span>Expected</span><code>college-api</code></div><div><span>Received</span><code>college-web</code></div></div></section>
      <section className={`panel validation-panel ${running ? 'running' : ''}`}><div className="section-heading"><span>Validation pipeline</span><span>{done ? '1 failure' : 'Evaluating…'}</span></div>{validationSteps.map((step, index) => <ValidationRow step={step} key={step.label} delay={index * 65} pending={!done} />)}</section></div>
    <section className="panel report-panel"><div className="report-toolbar"><div className="section-heading"><span>Diagnostic report</span><span>Secrets and private keys excluded</span></div><div className="filter-tabs">{(['Summary', 'Redacted', 'Full'] as const).map((mode) => <button className={reportMode === mode ? 'active' : ''} onClick={() => setReportMode(mode)} key={mode}>{mode}</button>)}</div><button className="text-button" onClick={() => copyText(report, notify)}><Copy />Copy report</button><button className="text-button" onClick={() => { saveText(report, 'l30-diagnostic-report.txt'); notify('Report saved'); }}><Clipboard />Save report</button></div><pre>{report}</pre></section>
  </div>;
}

function ValidationRow({ step, delay, pending }: { step: ValidationStep; delay: number; pending: boolean }) {
  return <div className={`validation-row ${pending ? 'pending' : step.state}`} style={{ '--delay': `${delay}ms` } as React.CSSProperties}><span className="validation-icon">{pending ? <Activity /> : step.state === 'pass' ? <Check /> : <X />}</span><div><strong>{step.label}</strong><span>{pending ? 'Checking…' : step.detail}</span></div><StatusPill state={pending ? 'PENDING' : step.state} /></div>;
}

function SettingsWorkspace() {
  const { theme, setTheme } = useAppStore();
  const [density, setDensity] = useState(localStorage.getItem('l30-density') ?? 'Compact');
  const [reduced, setReduced] = useState(localStorage.getItem('l30-reduced') === 'true');
  const sections = [
    { title: 'Behavior', items: [['Clear sensitive data when leaving view', true], ['Remember panel layout', true], ['Clear data when app closes', false]] },
    { title: 'Security', items: [['Redact diagnostics by default', true], ['Auto-clear verification secrets', true]] },
    { title: 'Network', items: [['Show every JWKS / OIDC request', true], ['Allow redirects during discovery', false]] },
  ];
  return <div className="workspace-scroll settings-page"><div className="workspace-heading"><div><span className="eyebrow">Preferences</span><h2>Settings</h2><p>Control appearance, privacy, network visibility, and keyboard behavior.</p></div></div>
    <section className="settings-section"><h3>Appearance</h3><div className="settings-row"><div><strong>Theme</strong><span>Use a dark, light, or system-matched interface.</span></div><div className="segmented-control compact">{(['dark', 'light', 'system'] as Theme[]).map((item) => <button className={theme === item ? 'active' : ''} key={item} onClick={() => setTheme(item)}>{item === 'dark' ? <Moon /> : item === 'light' ? <Sun /> : <LayoutPanelLeft />}{item}</button>)}</div></div><div className="settings-row"><div><strong>UI density</strong><span>Adjust workspace spacing without reducing information.</span></div><select aria-label="UI density" value={density} onChange={(e) => { setDensity(e.target.value); localStorage.setItem('l30-density', e.target.value); document.documentElement.dataset.density = e.target.value.toLowerCase(); }}><option>Compact</option><option>Comfortable</option></select></div><div className="settings-row"><div><strong>Reduce motion</strong><span>Replace coordinated transitions with immediate state changes.</span></div><Toggle checked={reduced} onChange={(checked) => { setReduced(checked); localStorage.setItem('l30-reduced', String(checked)); document.documentElement.classList.toggle('reduce-motion', checked); }} /></div></section>
    {sections.map((section) => <section className="settings-section" key={section.title}><h3>{section.title}</h3>{section.items.map(([label, initial]) => <SettingToggle key={String(label)} label={String(label)} initial={Boolean(initial)} />)}</section>)}
    <section className="settings-section shortcut-section"><h3>Keyboard</h3>{[['Command palette', '⌘ K'], ['Inspect token', '⌘ Enter'], ['Clear current token', '⌘ L'], ['Copy diagnostic report', '⌘ ⇧ C'], ['Settings', '⌘ ,']].map(([label, keys]) => <div className="shortcut-row" key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}</section>
  </div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}><span /></button>;
}

function SettingToggle({ label, initial }: { label: string; initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  return <div className="settings-row"><div><strong>{label}</strong></div><Toggle checked={checked} onChange={setChecked} /></div>;
}

function AboutWorkspace() {
  return <div className="about-page"><Logo size={72} /><span className="eyebrow">Version 0.1.0</span><h2>L30JWTDesk</h2><p>Inspect. Verify. Understand your tokens.</p><div className="about-local"><ShieldCheck /><div><strong>Local-first by design</strong><span>JWT inspection stays on this device. Network activity is explicit.</span></div></div><small>Built for developers debugging real authentication systems.</small></div>;
}

interface PaletteCommand { label: string; shortcut?: string; icon: typeof Search; action: () => void }

function CommandPalette({ open, onClose, notify }: { open: boolean; onClose: () => void; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setTheme = useAppStore((s) => s.setTheme);
  const clearSensitive = useAppStore((s) => s.clearSensitive);
  const paletteRef = useRef<HTMLDivElement>(null);
  const commands: PaletteCommand[] = [
    ...navItems.map((item) => ({ label: `Open ${item.label}`, shortcut: item.shortcut, icon: item.icon, action: () => setWorkspace(item.id) })),
    { label: 'Clear sensitive data', shortcut: '⌘L', icon: Trash2, action: () => { clearSensitive(); notify('Sensitive data cleared'); } },
    { label: 'Toggle sidebar', icon: Menu, action: toggleSidebar },
    { label: 'Use dark theme', icon: Moon, action: () => setTheme('dark') },
    { label: 'Use light theme', icon: Sun, action: () => setTheme('light') },
    { label: 'Open Settings', shortcut: '⌘,', icon: Settings, action: () => setWorkspace('settings') },
  ];
  const visible = commands.filter((command) => command.label.toLowerCase().split(' ').every((word) => !query || command.label.toLowerCase().includes(query.toLowerCase()) || word.startsWith(query.toLowerCase())));
  useLayoutEffect(() => {
    if (!open) return;
    setQuery('');
    const ctx = gsap.context(() => gsap.fromTo(paletteRef.current, { opacity: 0, y: -8, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: DURATIONS.micro, ease: easing }), paletteRef);
    return () => ctx.revert();
  }, [open]);
  if (!open) return null;
  return <div className="palette-backdrop" role="presentation" onMouseDown={onClose}><div ref={paletteRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}><div className="palette-search"><Search /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command…" /><kbd>ESC</kbd></div><div className="palette-list"><span className="eyebrow">Commands</span>{visible.map((command) => { const Icon = command.icon; return <button key={command.label} onClick={() => { command.action(); onClose(); }}><Icon /><span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button>; })}{!visible.length && <div className="palette-empty">No matching commands</div>}</div></div></div>;
}

function App() {
  const { workspace, theme, sidebarCollapsed, inspection, setWorkspace, clearSensitive } = useAppStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };

  useEffect(() => {
    const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
    document.documentElement.dataset.theme = resolved;
  }, [theme]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === 'Escape') setPaletteOpen(false);
      if (mod && event.key === ',') { event.preventDefault(); setWorkspace('settings'); }
      if (mod && /^[1-5]$/.test(event.key)) { event.preventDefault(); setWorkspace(navItems[Number(event.key) - 1].id); }
      if (mod && event.key.toLowerCase() === 'l') { event.preventDefault(); clearSensitive(); notify('Sensitive data cleared'); }
      if (mod && event.key === 'Enter') { const state = useAppStore.getState(); if (state.token.trim()) state.setInspection(mockInspection()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSensitive, setWorkspace]);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => gsap.fromTo(mainRef.current, { opacity: 0, x: 6 }, { opacity: 1, x: 0, duration: DURATIONS.panel, ease: easing }), mainRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [workspace]);

  const workspaceContent = useMemo(() => {
    if (workspace === 'inspect') return <InspectionWorkspace notify={notify} />;
    if (workspace === 'verify') return <VerifyWorkspace notify={notify} />;
    if (workspace === 'security') return <SecurityWorkspace />;
    if (workspace === 'compare') return <CompareWorkspace notify={notify} />;
    if (workspace === 'debug') return <DebugWorkspace notify={notify} />;
    if (workspace === 'settings') return <SettingsWorkspace />;
    return <AboutWorkspace />;
  }, [workspace]);

  return <Tooltip.Provider><div className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
    <header className="titlebar" data-tauri-drag-region><div className="brand" data-tauri-drag-region><Logo /><strong>L30JWTDesk</strong></div><div className="window-context" data-tauri-drag-region><span>{workspaceLabels[workspace]}</span><i /> <span>{inspection ? 'Token active' : 'No token loaded'}</span></div><WindowControls /></header>
    <Sidebar />
    <section className="workbench"><div className="command-strip"><div><h1>{workspaceLabels[workspace]}</h1>{workspace !== 'about' && <span className="local-indicator"><span />Local</span>}</div><button className="palette-trigger" onClick={() => setPaletteOpen(true)}><Search />Quick command<kbd>⌘ K</kbd></button></div>
      <main ref={mainRef}>{workspaceContent}</main>
    </section>
    <footer className="statusbar"><span><ShieldCheck />Local</span><i />{inspection ? <><span>{inspection.algorithm}</span><i /><span>{(inspection.bytes / 1000).toFixed(2)} KB</span><i /><span>Unverified</span></> : <span>No sensitive data persisted</span>}<span className="status-spacer" /><button onClick={() => { clearSensitive(); notify('Sensitive data cleared'); }}><Trash2 />Clear sensitive data</button></footer>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} notify={notify} />
    {toast && <div className="toast" role="status"><Check />{toast}</div>}
  </div></Tooltip.Provider>;
}

export default App;
