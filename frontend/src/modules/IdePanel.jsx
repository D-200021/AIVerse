import { useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import "../ide/monacoSetup.js";
import { runJavaScript } from "../ide/runJs.js";
import { languageOf } from "../lib/codeBlocks.js";
import { PxButton } from "../atoms/index.jsx";

const download = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
};

// Right-hand code editor (Monaco). `session` = { title, files:[{name,language,content,original}], active }.
export default function IdePanel({ session, onChange, onClose }) {
  const { files, active } = session;
  const file = files[active] || files[0];
  const [out, setOut] = useState(null); const [running, setRunning] = useState(false); const [copied, setCopied] = useState(false);
  const editorRef = useRef(null);
  const canRun = file && file.language === "javascript";
  const update = (next, a = active) => onChange({ ...session, files: next, active: a });
  const edit = (value) => update(files.map((f, i) => (i === active ? { ...f, content: value ?? "" } : f)));

  const run = async () => { setRunning(true); setOut(null); setOut(await runJavaScript(file.content)); setRunning(false); };
  const copy = async () => { try { await navigator.clipboard.writeText(file.content); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ } };
  const addFile = () => {
    let n = 1; const names = new Set(files.map((f) => f.name)); while (names.has(`untitled${n}.js`)) n++;
    update([...files, { name: `untitled${n}.js`, language: "javascript", content: "", original: "" }], files.length);
  };
  const closeTab = (i) => { if (files.length === 1) return; const next = files.filter((_, j) => j !== i); update(next, Math.min(active >= i && active > 0 ? active - 1 : active, next.length - 1)); };
  const rename = () => {
    const name = prompt("File name", file.name)?.trim();
    if (name && !files.some((f, i) => i !== active && f.name === name)) update(files.map((f, i) => (i === active ? { ...f, name, language: languageOf(name) } : f)));
  };
  const dirty = useMemo(() => file && file.content !== file.original, [file]);

  return (
    <aside className="fixed top-0 right-0 bottom-0 z-40 w-[min(720px,100vw)] px-panel flex flex-col" aria-label="Code editor">
      <header className="flex items-center gap-2 px-3 py-2 border-b-2 border-ink bg-gradient-to-b from-cream to-cream2">
        <h2 className="px-title flex-1 truncate">IDE · {session.title || "scratch"}</h2>
        {canRun && <PxButton variant="mint" onClick={run} disabled={running}>{running ? "running…" : "▶ run"}</PxButton>}
        <PxButton onClick={copy}>{copied ? "copied ✓" : "copy"}</PxButton>
        <PxButton onClick={() => download(file.name, file.content)}>download</PxButton>
        <PxButton variant="coral" onClick={onClose} aria-label="Close IDE">✕</PxButton>
      </header>

      <div className="flex items-end gap-1 px-2 pt-2 overflow-x-auto border-b-2 border-ink bg-cream2" role="tablist">
        {files.map((f, i) => (
          <div key={f.name + i} role="tab" aria-selected={i === active} className={`flex items-center gap-1 border-2 border-b-0 border-ink px-2 py-0.5 text-[14px] cursor-pointer ${i === active ? "bg-paper" : "bg-cream3"}`} onClick={() => update(files, i)}>
            <span>{f.name}{f.content !== f.original ? " •" : ""}</span>
            {files.length > 1 && <button type="button" aria-label={`Close ${f.name}`} className="text-ink5 hover:text-brick" onClick={(e) => { e.stopPropagation(); closeTab(i); }}>×</button>}
          </div>
        ))}
        <button type="button" className="px-btn !py-0 mb-0.5" onClick={addFile} aria-label="New file">+</button>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%" theme="aiverse" path={`${session.id || "scratch"}/${file.name}`} language={file.language} value={file.content} onChange={edit}
          onMount={(ed) => { editorRef.current = ed; }}
          options={{ fontSize: 14, fontFamily: "'VT323', 'Courier New', monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: "on", padding: { top: 8 } }}
        />
      </div>

      <footer className="border-t-2 border-ink bg-paper max-h-[34%] min-h-[34px] overflow-y-auto">
        <div className="flex items-center gap-2 px-2 py-1 bg-cream2 border-b-2 border-ink text-[13px]">
          <b>console</b>
          <span className="text-ink5 flex-1">{file.language}{dirty ? " · edited" : ""}</span>
          <PxButton className="!py-0" onClick={rename}>rename</PxButton>
          <PxButton className="!py-0" disabled={!dirty} onClick={() => update(files.map((f, i) => (i === active ? { ...f, content: f.original } : f)))}>reset</PxButton>
          {out && <PxButton className="!py-0" onClick={() => setOut(null)}>clear</PxButton>}
        </div>
        <div className="px-mono p-2 whitespace-pre-wrap" aria-live="polite">
          {!out && <span className="text-ink5">{canRun ? "Press ▶ run to execute this JavaScript in a sandbox." : "Running is available for JavaScript files."}</span>}
          {out?.logs.map((l, i) => <div key={i} className={l.level === "error" ? "text-brick" : l.level === "warn" ? "text-[#b45f06]" : ""}>{l.text}</div>)}
          {out?.error && <div className="text-brick">{out.error}</div>}
          {out && !out.logs.length && !out.error && <span className="text-ink5">(no output)</span>}
        </div>
      </footer>
    </aside>
  );
}
