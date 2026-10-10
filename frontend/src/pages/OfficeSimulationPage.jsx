import { useEffect, useState } from "react";
import { useOffice } from "../hooks/useOffice.js";
import TopBar from "../modules/TopBar.jsx";
import FloorView from "../modules/FloorView.jsx";
import AgentStrip from "../modules/AgentStrip.jsx";
import CommandCenter from "../modules/CommandCenter.jsx";
import AgentModal from "../modules/AgentModal.jsx";

export default function OfficeSimulationPage({ apiBase, roomId }) {
  const { engine, snap, mountRef } = useOffice({ apiBase, roomId });
  const [selectedId, setSelectedId] = useState("ceo");
  const [modal, setModal] = useState(null); // {editing?}
  const [now, setNow] = useState("");
  useEffect(() => {
    const f = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    f(); const i = setInterval(f, 15000); return () => clearInterval(i);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <TopBar snap={snap} now={now} onToggleAuto={() => engine.setAuto(!snap.auto)} />
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-y-auto lg:overflow-hidden">
        <FloorView mountRef={mountRef} snap={snap} />
        <CommandCenter engine={engine} snap={snap} selectedId={selectedId} onSelect={setSelectedId}
          onAdd={() => setModal({})} onEdit={(a) => setModal({ editing: a })} />
      </main>
      <AgentStrip snap={snap} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); engine.clickAgent(id); }} onAdd={() => setModal({})} />
      {modal && <AgentModal key={modal.editing?.id || "new"} editing={modal.editing} engine={engine} onClose={() => setModal(null)} />}
    </div>
  );
}
