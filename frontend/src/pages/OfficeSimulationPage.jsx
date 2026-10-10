import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useOffice } from "../hooks/useOffice.js";
import TopBar from "../modules/TopBar.jsx";
import FloorView from "../modules/FloorView.jsx";
import AgentStrip from "../modules/AgentStrip.jsx";
import CommandCenter from "../modules/CommandCenter.jsx";
import AgentModal from "../modules/AgentModal.jsx";
import KeyModal from "../modules/KeyModal.jsx";
import { PxButton } from "../atoms/index.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { extractCodeFiles } from "../lib/codeBlocks.js";

const IdePanel = lazy(() => import("../modules/IdePanel.jsx")); // Monaco is large — load it on demand

export default function OfficeSimulationPage({ apiBase, roomId }) {
  const { user, logout } = useAuth();
  const { engine, snap, mountRef } = useOffice({ apiBase, roomId });
  const [ide, setIde] = useState(null);       // { id, title, files, active }
  const [keyModal, setKeyModal] = useState(false);
  const [toast, setToast] = useState(null);   // a finished task that contains code
  const sessions = useRef(new Map());         // taskId -> editor session (keeps your edits)
  const announced = useRef(new Set());

  const openIde = (task) => {
    if (!task) return setIde((cur) => cur || { id: "scratch", title: "scratch", files: [{ name: "main.js", language: "javascript", content: "// Write some JavaScript and press run\nconsole.log(\"Hello, World!\");\n", original: "" }], active: 0 });
    const existing = sessions.current.get(task.id);
    const session = existing || { id: task.id, title: task.title, files: extractCodeFiles(task.output), active: 0 };
    if (!session.files.length) return;
    sessions.current.set(task.id, session); setIde(session); setToast(null);
  };
  const changeIde = (next) => { if (next.id && next.id !== "scratch") sessions.current.set(next.id, next); setIde(next); };

  // When an agent hands in work that contains code, offer to open it right away.
  useEffect(() => {
    const t = snap.tasks.find((x) => x.output && !announced.current.has(x.id) && x.status !== "in-progress" && extractCodeFiles(x.output).length);
    if (t) { announced.current.add(t.id); setToast(t); }
  }, [snap.tasks]);
  const [selectedId, setSelectedId] = useState("ceo");
  const [modal, setModal] = useState(null); // {editing?}
  const [now, setNow] = useState("");
  useEffect(() => {
    const f = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    f(); const i = setInterval(f, 15000); return () => clearInterval(i);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <TopBar snap={snap} now={now} user={user} ideOpen={!!ide} onOpenIde={() => (ide ? setIde(null) : openIde(null))} onKey={() => setKeyModal(true)} onSignOut={() => logout()} onToggleAuto={() => engine.setAuto(!snap.auto)} />
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-y-auto lg:overflow-hidden">
        <FloorView mountRef={mountRef} snap={snap} />
        <CommandCenter engine={engine} snap={snap} selectedId={selectedId} onSelect={setSelectedId}
          onAdd={() => setModal({})} onEdit={(a) => setModal({ editing: a })} openIde={openIde} />
      </main>
      <AgentStrip snap={snap} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); engine.clickAgent(id); }} onAdd={() => setModal({})} />
      {toast && !ide && (
        <div role="status" className="fixed bottom-24 left-4 z-30 px-panel p-3 flex items-center gap-3 max-w-[420px]">
          <span className="text-[14px]">💻 <b>{toast.title}</b> has code ready.</span>
          <PxButton variant="primary" onClick={() => openIde(toast)}>open in IDE</PxButton>
          <button type="button" className="px-btn !py-0" aria-label="Dismiss" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
      {ide && <Suspense fallback={<div className="fixed top-0 right-0 bottom-0 z-40 w-[min(720px,100vw)] px-panel grid place-items-center">loading editor…</div>}><IdePanel session={ide} onChange={changeIde} onClose={() => setIde(null)} /></Suspense>}
      {keyModal && <KeyModal onClose={() => setKeyModal(false)} />}
      {modal && <AgentModal key={modal.editing?.id || "new"} editing={modal.editing} engine={engine} onClose={() => setModal(null)} />}
    </div>
  );
}
