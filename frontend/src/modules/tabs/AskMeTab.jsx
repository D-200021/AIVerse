import { useState } from "react";
import { PxButton, PxField, Portrait } from "../../atoms/index.jsx";
import Markdown from "../../atoms/Markdown.jsx";
import { hasCode } from "../../lib/codeBlocks.js";

export default function AskMeTab({ engine, snap, openIde }) {
  const items = snap.tasks.filter((t) => t.status === "user-review");
  const [notes, setNotes] = useState({});
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
      {!items.length && <p className="text-ink5 p-2">Nothing needs you. Finished work appears here after the CEO signs off.</p>}
      {items.map((t) => {
        const a = snap.agents.find((x) => x.id === t.assignee);
        return (
          <div key={t.id} className="px-inset p-2 flex flex-col gap-2" id={`ask-${t.id}`}>
            <div className="flex gap-2 items-center">{a && <Portrait color={a.color} hair={a.hair} hairColor={a.hairColor} size={32} />}
              <div className="min-w-0"><div className="truncate">{t.title}</div><div className="text-[12px] text-ink5">{a?.name} · CEO approved</div></div></div>
            <div className="bg-cream2 border-2 border-ink p-2 max-h-72 overflow-y-auto"><Markdown text={t.output} /></div>
            {hasCode(t.output) && <PxButton variant="primary" onClick={() => openIde(t)}>{"</>"} open in IDE</PxButton>}
            {t.ceoFeedback && <div className="text-[13px] text-ink5">CEO: “{t.ceoFeedback}”</div>}
            <PxField placeholder="Notes for a revision (optional)" value={notes[t.id] || ""} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} />
            <div className="flex gap-2">
              <PxButton id={`approve-${t.id}`} variant="mint" className="flex-1" onClick={() => engine.approve(t.id)}>✓ approve</PxButton>
              <PxButton id={`revise-${t.id}`} variant="coral" className="flex-1" onClick={() => { engine.revise(t.id, notes[t.id]); setNotes({ ...notes, [t.id]: "" }); }}>↺ revise</PxButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}
