import { HAIR_TYPES, AVATAR_COLORS } from "../config/roster.js";
import { PxField, PxButton, Swatch, Portrait } from "../atoms/index.jsx";

const SPEEDS = [["Thorough", 1.3], ["Normal", 1], ["Fast", 0.7]];

export default function AgentForm({ draft, setDraft, onSave, onCancel, saveLabel }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const ok = draft.name?.trim() && draft.role?.trim();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        <Portrait color={draft.color} hair={draft.hair} hairColor="#4a3020" size={56} />
        <div className="flex-1 flex flex-col gap-2">
          <PxField label="Name" value={draft.name} onChange={set("name")} maxLength={40} placeholder="e.g. Priya" />
          <PxField label="Role / type" value={draft.role} onChange={set("role")} maxLength={60} placeholder="e.g. Data Scientist" />
        </div>
      </div>
      <PxField label="Work (comma-separated — powers routing)" value={draft.handles} onChange={set("handles")} maxLength={200} placeholder="sql, dashboards, reporting" />
      <PxField label="Personality / working-style prompt" multiline rows={2} value={draft.prompt} onChange={set("prompt")} maxLength={400} placeholder="Meticulous, double-checks edge cases." />
      <div><span className="block text-[13px] text-ink5 mb-1">Shirt color</span>
        <div className="flex flex-wrap gap-1.5">{AVATAR_COLORS.map((c) => <Swatch key={c} color={c} selected={draft.color === c} onClick={() => setDraft({ ...draft, color: c })} />)}</div></div>
      <div className="flex gap-4 flex-wrap">
        <div><span className="block text-[13px] text-ink5 mb-1">Hair</span>
          <div className="flex gap-1">{HAIR_TYPES.map((h) => <PxButton key={h} className={draft.hair === h ? "on" : ""} onClick={() => setDraft({ ...draft, hair: h })}>{h}</PxButton>)}</div></div>
        <div><span className="block text-[13px] text-ink5 mb-1">Work speed</span>
          <div className="flex gap-1">{SPEEDS.map(([l, v]) => <PxButton key={l} className={draft.speed === v ? "on" : ""} onClick={() => setDraft({ ...draft, speed: v })}>{l}</PxButton>)}</div></div>
      </div>
      <div className="flex gap-2 mt-1">
        <PxButton variant="primary" disabled={!ok} onClick={onSave} className="flex-1">{saveLabel}</PxButton>
        <PxButton onClick={onCancel}>Cancel</PxButton>
      </div>
    </div>
  );
}
