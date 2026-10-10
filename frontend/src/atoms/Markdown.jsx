import { useState } from "react";

function CodeBlock({ lang, code }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } };
  return (
    <div className="border-2 border-ink bg-ink text-cream my-1">
      <div className="flex justify-between items-center px-2 py-0.5 bg-ink7 text-[12px]">
        <span>{lang || "code"}</span>
        <button type="button" onClick={copy} className="px-btn !py-0 !text-[12px] !shadow-none">{done ? "copied ✓" : "copy code"}</button>
      </div>
      <pre className="px-mono p-2 overflow-x-auto whitespace-pre m-0">{code}</pre>
    </div>
  );
}

function Inline({ text }) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("`") && p.endsWith("`") && p.length > 2 ? <code key={i} className="bg-cream3 px-1 border border-ink/40">{p.slice(1, -1)}</code>
      : p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>);
}

// Tiny, safe Markdown view: fenced code blocks (with a copy button), headings, inline code/bold.
export default function Markdown({ text = "", className = "" }) {
  const parts = []; const re = /```([\w+-]*)\n?([\s\S]*?)```/g; let last = 0, m;
  while ((m = re.exec(text))) { if (m.index > last) parts.push({ t: text.slice(last, m.index) }); parts.push({ lang: m[1], code: m[2].replace(/\n$/, "") }); last = re.lastIndex; }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return (
    <div className={`px-mono ${className}`}>
      {parts.map((p, i) => p.code !== undefined ? <CodeBlock key={i} lang={p.lang} code={p.code} /> : (
        <div key={i} className="whitespace-pre-wrap">{p.t.trim() && p.t.split("\n").map((ln, j) => /^#{1,3}\s/.test(ln) ? <div key={j} className="font-bold text-brick">{ln.replace(/^#+\s/, "")}</div> : <div key={j}><Inline text={ln} /></div>)}</div>
      ))}
    </div>
  );
}
