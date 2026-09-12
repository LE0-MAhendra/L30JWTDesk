import { useMemo, useState } from "react";
import { Copy, Eye, Save, Send } from "lucide-react";
import { useAppStore } from "../../store";
import { copyText } from "../common";

const encode = (value: string) =>
  btoa(unescape(encodeURIComponent(value)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

async function signHs256(input: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return encode(String.fromCharCode(...new Uint8Array(signature)));
}

export function CreateWorkspace({ notify }: { notify: (message: string) => void }) {
  const setToken = useAppStore((state) => state.setToken);
  const setWorkspace = useAppStore((state) => state.setWorkspace);
  const [name, setName] = useState("Local test token");
  const [secret, setSecret] = useState("secret123");
  const [header, setHeader] = useState('{"alg":"HS256","typ":"JWT"}');
  const [payload, setPayload] = useState('{"sub":"user_123","role":"admin","iat":1700000000}');
  const [token, setCreatedToken] = useState("");
  const [saved, setSaved] = useState<string[]>(() => JSON.parse(localStorage.getItem("l30-saved-tokens") ?? "[]"));
  const [error, setError] = useState("");

  const canGenerate = useMemo(() => Boolean(secret.trim() && header.trim() && payload.trim()), [secret, header, payload]);
  const generate = async () => {
    try {
      const parsedHeader = JSON.parse(header);
      const parsedPayload = JSON.parse(payload);
      if (parsedHeader.alg !== "HS256") throw new Error("This first creator supports HS256 only.");
      const body = `${encode(JSON.stringify(parsedHeader))}.${encode(JSON.stringify(parsedPayload))}`;
      const created = `${body}.${await signHs256(body, secret)}`;
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
    <div className="workspace-heading"><div><span className="eyebrow">Token lab</span><h2>Create a token</h2><p>Generate, save, and send a signed token into the existing workspaces.</p></div><button className="primary-button" onClick={generate} disabled={!canGenerate}>Generate HS256</button></div>
    <div className="compare-editors">
      <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Token details</span></div><label className="field-label">Saved name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field-label">HMAC secret<input value={secret} onChange={(event) => setSecret(event.target.value)} /></label><label className="field-label">Header JSON<textarea value={header} onChange={(event) => setHeader(event.target.value)} /></label><label className="field-label">Payload JSON<textarea value={payload} onChange={(event) => setPayload(event.target.value)} /></label>{error && <div className="error-text">{error}</div>}</section>
      <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Generated token</span><span className="toolbar-meta">{token ? "HS256" : "Waiting"}</span></div><textarea className="token-output" value={token} readOnly placeholder="Generate a token to preview it" />{token && <div className="button-row"><button className="secondary-button" onClick={() => copyText(token, notify)}><Copy />Copy</button><button className="secondary-button" onClick={save}><Save />Save</button><button className="secondary-button" onClick={useToken}><Send />Inspect</button></div>}</section>
    </div>
    <section className="panel"><div className="panel-toolbar"><span className="eyebrow">Saved locally</span><span className="toolbar-meta">{saved.length} token{saved.length === 1 ? "" : "s"}</span></div>{saved.length ? saved.map((item) => { const [label, value] = item.split(":"); return <div className="diff-row" key={item}><code>{label}</code><span>{value.slice(0, 46)}…</span><button className="icon-button" onClick={() => { setCreatedToken(value); setToken(value); }}><Eye /></button></div>; }) : <div className="empty-row">Saved tokens stay on this device.</div>}</section>
  </div>;
}
