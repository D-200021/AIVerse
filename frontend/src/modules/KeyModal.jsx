import { useState } from "react";
import { PxButton, PxField } from "../atoms/index.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function KeyModal({ onClose }) {
  const { updateKey } = useAuth();
  const [key, setKey] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(""); const r = await updateKey(key.trim()); if (r.ok) { setSaved(true); setTimeout(onClose, 1100); } else setErr(r.error); setBusy(false); };
  return (
    <div className="fixed inset-0 z-50 bg-ink/70 grid place-items-center p-3" onClick={onClose}>
      <form onSubmit={save} className="px-panel w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <header className="px-3 py-2 border-b-2 border-ink flex justify-between"><h2 className="px-title">GEMINI API KEY</h2><button type="button" onClick={onClose} className="px-btn !py-0">✕</button></header>
        <div className="p-3 flex flex-col gap-3">
          <p className="text-[14px] text-ink5">Paste a new key to replace the one on your account. The current key is never shown. Get one at <a className="text-brick underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.</p>
          {err && <div role="alert" className="border-2 border-ink bg-coral/40 px-2 py-1 text-[14px]">{err}</div>}
          {saved && <div role="status" className="border-2 border-ink bg-mint/50 px-2 py-1 text-[14px]">Key updated ✓</div>}
          <PxField label="New Gemini API key" type="password" autoComplete="off" spellCheck={false} placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} maxLength={200} required />
          <PxButton variant="primary" type="submit" disabled={busy || !key.trim()}>{busy ? "checking…" : "save key"}</PxButton>
        </div>
      </form>
    </div>
  );
}
