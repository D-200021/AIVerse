import { useState } from "react";
import { PxButton, PxChip, Portrait } from "../../atoms/index.jsx";
import Markdown from "../../atoms/Markdown.jsx";

const STATE = { "user-review": ["#ff6b6b", "needs your OK"], "ceo-review": ["#6c8ef5", "CEO reviewing"], done: ["#6bcf7f", "approved"], "in-progress": ["#ffd93d", "revising"] };

export default function OutputsTab({ snap }) {
  const [open, setOpen] = useState(null);
  const [copied, setCopied] = useState(null);
  const [filter, setFilter] = useState("all");
  const list = snap.tasks
    
    .filter((t) => (t.output || t.status === "ceo-review") && (filter === "all" || t.assignee === filter))
    .sort((a, b) => Number(b.id.slice(1)) - Number(a.id.slice(1)));
  const text = (t, a) => `# ${t.title}\n\nBy: ${a?.name || "team"}\nStatus: ${(STATE[t.status] || [, t.status])[1]}\n\n${t.output || ""}\n${t.ceoFeedback ? `\nCEO feedback: ${t.ceoFeedback}\n` : ""}`;
  const copy = async (t, a) => { try { await navigator.clipboard.writeText(text(t, a)); setCopied(t.id); setTimeout(() => setCopied(null), 1500); } catch { /* clipboard blocked */ } };
  const download = (t, a) => {
    const url = URL.createObjectURL(new Blob([text(t, a)], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: `${t.title.replace(/\W+/g, "-").slice(0, 40)}.md` }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
      <div className="flex gap-1 flex-wrap">
        <PxButton className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>all</PxButton>
        {snap.agents.map((a) => <PxButton key={a.id} className={filter === a.id ? "on" : ""} onClick={() => setFilter(a.id)}>{a.name}</PxButton>)}
      </div>
      {!list.length && <p className="text-ink5 p-2">No outputs yet. When an agent submits work, its result shows up here — even before you approve it.</p>}
      {list.map((t) => {
        const a = snap.agents.find((x) => x.id === t.assignee);
        const [col, lbl] = STATE[t.status] || ["#a899b5", t.status];
        const isOpen = open === t.id;
        return (
          <div key={t.id} className="px-inset p-2 flex flex-col gap-1.5">
            <button type="button" className="flex gap-2 items-center text-left" onClick={() => setOpen(isOpen ? null : t.id)}>
              {a && <Portrait color={a.color} hair={a.hair} hairColor={a.hairColor} size={30} />}
              <div className="min-w-0 flex-1"><div className="truncate">{t.title}</div><div className="text-[12px] text-ink5">{a?.name || "former agent"}{t.source === "gemini" ? " · via Gemini" : ""}</div></div>
              <PxChip color={col}>{lbl}</PxChip>
            </button>
            <div className={`bg-cream2 border-2 border-ink p-2 ${isOpen ? "" : "max-h-28 overflow-hidden"}`}><Markdown text={t.output || "Output is being prepared — the CEO is reviewing it…"} /></div>
            {t.ceoFeedback && isOpen && <div className="text-[13px] text-ink5">CEO: “{t.ceoFeedback}”</div>}
            <div className="flex gap-1">
              <PxButton onClick={() => setOpen(isOpen ? null : t.id)}>{isOpen ? "collapse" : "read full"}</PxButton>
              <PxButton onClick={() => copy(t, a)}>{copied === t.id ? "copied ✓" : "copy all"}</PxButton>
              <PxButton onClick={() => download(t, a)}>.md</PxButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
