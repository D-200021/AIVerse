import { useState } from "react";
import AgentForm from "./AgentForm.jsx";
import { AVATAR_COLORS } from "../config/roster.js";

export default function AgentModal({ editing, onClose, engine }) {
  const [draft, setDraft] = useState(editing || { name: "", role: "", handles: "", prompt: "", color: AVATAR_COLORS[5], hair: "short", speed: 1 });
  const save = () => {
    if (editing) engine.updateEmployee(editing.id, { name: draft.name.trim(), role: draft.role.trim(), handles: draft.handles, prompt: draft.prompt, color: draft.color, hair: draft.hair, speed: draft.speed });
    else engine.addEmployee(draft);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 grid place-items-center p-3" onClick={onClose}>
      <div className="px-panel w-full max-w-[460px] max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="px-3 py-2 border-b-2 border-ink flex justify-between"><h2 className="px-title">{editing ? `EDIT ${editing.name.toUpperCase()}` : "HIRE A NEW AGENT"}</h2><button onClick={onClose} className="px-btn !py-0">✕</button></header>
        <div className="p-3"><AgentForm draft={draft} setDraft={setDraft} onSave={save} onCancel={onClose} saveLabel={editing ? "Save changes" : "Hire agent"} /></div>
      </div>
    </div>
  );
}
