import { useMemo, useState } from "react";
import { Copy, Eye, Save, Send } from "lucide-react";
import { useAppStore } from "../../store";
import { copyText } from "../common";

const encode = (value: string) =>
  btoa(unescape(encodeURIComponent(value)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const encodeBytes = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

async function signHs256(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return encodeBytes(new Uint8Array(signature));
}

async function createRsaKey() {
  return crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
}

async function signRs256(input: string, key: CryptoKey) {
  return encodeBytes(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input))));
}

export function CreateWorkspace({ notify }: { notify: (message: string) => void }) {
  const setToken = useAppStore((state) => state.setToken);
  const setWorkspace = useAppStore((state) => state.setWorkspace);
  const [name, setName] = useState("Local test token");
  const [secret, setSecret] = useState("secret123");
  const [algorithm, setAlgorithm] = useState<"HS256" | "RS256">("HS256");
  const [header, setHeader] = useState('{"alg":"HS256","typ":"JWT"}');
  const [payload, setPayload] = useState('{"sub":"user_123","role":"admin","iat":1700000000}');
  const [token, setCreatedToken] = useState("");
  const [saved, setSaved] = useState<string[]>(() => JSON.parse(localStorage.getItem("l30-saved-tokens") ?? "[]"));
  const [error, setError] = useState("");
  const [rsaKey, setRsaKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState("");

  const canGenerate = useMemo(() => Boolean(secret.trim() && header.trim() && payload.trim()), [secret, header, payload]);
  const generate = async () => {
    try {
      const parsedHeader = JSON.parse(header);
      const parsedPayload = JSON.parse(payload);
      if (parsedHeader.alg !== algorithm) throw new Error(`Header alg must match ${algorithm}.`);
      const body = `${encode(JSON.stringify(parsedHeader))}.${encode(JSON.stringify(parsedPayload))}`;
      const created = `${body}.${algorithm === "HS256" ? await signHs256(body, secret) : await signRs256(body, rsaKey!)}`;
      setCreatedToken(created);
      setToken(created);
      setError("");
      notify("HS256 token created");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Header and payload must be valid JSON.");
    }
  };
  const save = () => {
    if (!token) return;
    const next = [...saved.filter((item) => !item.startsWith(`${name}:`)), `${name}:${token}`];
    setSaved(next);
    localStorage.setItem("l30-saved-tokens", JSON.stringify(next));
    notify("Token saved locally");
  };
  const useToken = () => { setToken(token); setWorkspace("inspect"); };

  return <div className="workspace-scroll workspace-pad">
    <div className="workspace-heading"><div><span className="eyebrow">Token lab</span><h2>Create a token</h2><p>Generate, save, and send a signed token into the existing workspaces.</p></div><button className="primary-button" onClick={generate} disabled={!canGenerate || (algorithm === "RS256" && !rsaKey)}>Generate {algorithm}</button></div>
    <div className="compare-editors">
      <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Token details</span></div><label className="field-label">Algorithm<select value={algorithm} onChange={(event) => { const next = event.target.value as "HS256" | "RS256"; setAlgorithm(next); setHeader(JSON.stringify({ alg: next, typ: "JWT" })); setCreatedToken(""); }}>{["HS256", "RS256"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Saved name<input value={name} onChange={(event) => setName(event.target.value)} /></label>{algorithm === "HS256" ? <label className="field-label">HMAC secret<input value={secret} onChange={(event) => setSecret(event.target.value)} /></label> : <button className="secondary-button" onClick={async () => { const pair = await createRsaKey(); setRsaKey(pair.privateKey); setPublicKey("Generated RSA-2048 key pair"); notify("RSA key pair generated"); }}>Generate RSA key pair</button>}<label className="field-label">Header JSON<textarea value={header} onChange={(event) => setHeader(event.target.value)} /></label><label className="field-label">Payload JSON<textarea value={payload} onChange={(event) => setPayload(event.target.value)} /></label>{publicKey && <div className="toolbar-meta">{publicKey}</div>}{error && <div className="error-text">{error}</div>}</section>
      <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Generated token</span><span className="toolbar-meta">{token ? "HS256" : "Waiting"}</span></div><textarea className="token-output" value={token} readOnly placeholder="Generate a token to preview it" />{token && <div className="button-row"><button className="secondary-button" onClick={() => copyText(token, notify)}><Copy />Copy</button><button className="secondary-button" onClick={save}><Save />Save</button><button className="secondary-button" onClick={useToken}><Send />Inspect</button></div>}</section>
    </div>
    <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Saved locally</span><span className="toolbar-meta">{saved.length} token{saved.length === 1 ? "" : "s"}</span></div>{saved.length ? saved.map((item) => { const [label, value] = item.split(":"); return <div className="diff-row" key={item}><code>{label}</code><span>{value.slice(0, 46)}…</span><button className="icon-button" onClick={() => { setCreatedToken(value); setToken(value); }}><Eye /></button></div>; }) : <div className="empty-row">Saved tokens stay on this device.</div>}</section>
  </div>;
}
