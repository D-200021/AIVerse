import { useState } from "react";
import { PxField, PxButton } from "../../atoms/index.jsx";

export default function MemoryTab({ snap, engine }) {
  const [q, setQ] = useState("");
  const list = snap.memory.filter((m) => !q || (m.text + m.agent).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
      <PxField placeholder="Search memory…" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-[13px] text-ink5">Agents write a note after every approved task and recall matching notes when briefed.</p>
      {!list.length && <p className="text-ink3">No notes yet.</p>}
      {list.map((m) => (
        <div key={m.id} className="px-inset p-2">
          <div className="flex justify-between text-[12px] text-ink5"><span>{m.agent} · {m.time}</span><PxButton className="!px-1 !text-[12px]" onClick={() => engine.forget(m.id)}>forget</PxButton></div>
          <div className="px-mono">{m.text}</div>
        </div>
      ))}
    </div>
  );
}
