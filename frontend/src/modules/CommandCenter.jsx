import { useState, useEffect } from "react";
import { Portrait, PxButton, StatusChip } from "../atoms/index.jsx";
import ChatTab from "./tabs/ChatTab.jsx";
import TasksTab from "./tabs/TasksTab.jsx";
import OutputsTab from "./tabs/OutputsTab.jsx";
import AskMeTab from "./tabs/AskMeTab.jsx";
import InboxTab from "./tabs/InboxTab.jsx";
import MemoryTab from "./tabs/MemoryTab.jsx";
import ActivityTab from "./tabs/ActivityTab.jsx";
import AgentsTab from "./tabs/AgentsTab.jsx";

const TABS = ["chat", "tasks", "ask me", "outputs", "inbox", "memory", "activity", "agents"];

export default function CommandCenter({ engine, snap, selectedId, onSelect, onEdit, onAdd }) {
  const [tab, setTab] = useState("chat");
  const [seen, setSeen] = useState(() => new Set());
  const outIds = snap.tasks.filter((t) => t.output || t.status === "ceo-review").map((t) => t.id);
  useEffect(() => { if (tab === "outputs") setSeen(new Set(outIds)); }, [tab, outIds.join(",")]);
  const unseen = tab === "outputs" ? 0 : outIds.filter((id) => !seen.has(id)).length;
  const pending = snap.tasks.filter((t) => t.status === "user-review").length;
  const props = { goTab: setTab, engine, snap, selectedId, onSelect, onEdit, onAdd };
  return (
    <aside className="px-panel w-full lg:w-[430px] shrink-0 flex flex-col min-h-0 h-[520px] lg:h-auto">
      <div className="flex items-center gap-2 p-2 border-b-2 border-ink">
        <Portrait {...snap.ceo} ceo size={40} />
        <div className="leading-tight">
          <div className="px-title">COMMAND CENTER</div>
          <div className="flex items-center gap-1.5 mt-1"><StatusChip status="awaiting" /><span className="text-[13px] text-ink5">Michael runs the floor</span></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 p-2 border-b-2 border-ink">
        {TABS.map((t) => (
          <PxButton key={t} className={`!px-1 text-[14px] ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
            {t}{t === "outputs" && unseen > 0 && <span className="ml-1 px-1 bg-mint border border-ink text-[12px] px-blink">{unseen}</span>}
            {t === "ask me" && pending > 0 && <span className="ml-1 px-1 bg-coral border border-ink text-[12px] px-blink">{pending}</span>}
          </PxButton>
        ))}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "chat" && <ChatTab {...props} />}
        {tab === "tasks" && <TasksTab {...props} />}
        {tab === "ask me" && <AskMeTab {...props} />}
        {tab === "outputs" && <OutputsTab {...props} />}
        {tab === "inbox" && <InboxTab {...props} />}
        {tab === "memory" && <MemoryTab {...props} />}
        {tab === "activity" && <ActivityTab {...props} />}
        {tab === "agents" && <AgentsTab {...props} />}
      </div>
    </aside>
  );
}
