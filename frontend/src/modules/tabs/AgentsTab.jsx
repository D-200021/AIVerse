import { useState } from "react";
import { Portrait, PxButton, StatusChip, PxField } from "../../atoms/index.jsx";

export default function AgentsTab({ engine, snap, selectedId, onEdit, onAdd, goTab }) {
  const [msg, setMsg] = useState({});
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
      <PxButton variant="primary" onClick={onAdd} disabled={snap.agents.length >= snap.maxAgents}>+ hire agent ({snap.agents.length}/{snap.maxAgents})</PxButton>
      {snap.agents.map((a) => (
        <div key={a.id} className={`px-inset p-2 flex flex-col gap-1.5 ${selectedId === a.id ? "outline-3 outline-lemon outline" : ""}`}>
          <div className="flex gap-2 items-center">
            <Portrait color={a.color} hair={a.hair} hairColor={a.hairColor} size={36} />
            <div className="min-w-0 flex-1"><div>{a.name} <span className="text-ink5 text-[13px]">· {a.role}</span></div><div className="text-[12px] text-ink5 truncate">{a.handles || "no skills listed"}</div></div>
            <StatusChip status={a.status} />
          </div>
          <div className="text-[12px] text-ink5">done: {a.completed} · ctx {a.ctx}%{a.prompt ? " · custom prompt" : ""}</div>
          <div className="flex gap-1">
            <PxField placeholder={`Give ${a.name} a task…`} value={msg[a.id] || ""} onChange={(e) => setMsg({ ...msg, [a.id]: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { engine.sendToAgent(a.id, msg[a.id] || ""); setMsg({ ...msg, [a.id]: "" }); goTab && goTab("outputs"); } }} />
            <PxButton onClick={() => onEdit(a)}>edit</PxButton>
            <PxButton variant="coral" disabled={snap.agents.length <= 1} onClick={() => { if (confirm(`Remove ${a.name}?`)) engine.removeEmployee(a.id); }}>✕</PxButton>
          </div>
        </div>
      ))}
    </div>
  );
}
