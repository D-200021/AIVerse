import { Portrait, PxBar, StatusChip, STATUS_META, PxButton } from "../atoms/index.jsx";

function AgentCard({ a, selected, onSelect }) {
  const m = STATUS_META[a.status] || STATUS_META.idle;
  return (
    <button type="button" onClick={onSelect} className={`px-panel shrink-0 w-[210px] text-left p-2 flex gap-2 ${selected ? "!border-brick" : ""}`} style={selected ? { outline: "3px solid #ffd93d" } : undefined}>
      <Portrait color={a.color} hair={a.hair} hairColor={a.hairColor} ceo={a.isCeo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="px-title !text-[8px] truncate">{a.name.toUpperCase().slice(0, 9)}</span>
          {a.isCeo ? <span className="px-chip !bg-gold !text-[11px]">GOD</span> : <StatusChip status={a.status} />}
        </div>
        <div className="text-[13px] text-ink5 truncate">{a.isCeo ? "runs the floor" : a.task ? `${a.line}` : a.line}</div>
        {!a.isCeo && <div className="mt-1"><PxBar value={a.task ? a.progress : a.ctx} color={m.color} /></div>}
      </div>
    </button>
  );
}

export default function AgentStrip({ snap, selectedId, onSelect, onAdd }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2 border-t-4 border-ink bg-cream2 shrink-0">
      <AgentCard a={snap.ceo} selected={selectedId === "ceo"} onSelect={() => onSelect("ceo")} />
      {snap.agents.map((a) => <AgentCard key={a.id} a={a} selected={selectedId === a.id} onSelect={() => onSelect(a.id)} />)}
      <PxButton onClick={onAdd} className="shrink-0 w-[110px]" disabled={snap.agents.length >= snap.maxAgents}>+ hire agent</PxButton>
    </div>
  );
}
