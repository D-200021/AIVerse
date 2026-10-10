import { PxButton } from "../../atoms/index.jsx";

const COLS = [["pending", "To do"], ["in-progress", "Working"], ["ceo-review", "CEO review"], ["user-review", "Your review"], ["done", "Done"]];

export default function TasksTab({ engine, snap }) {
  const who = (id) => snap.agents.find((a) => a.id === id)?.name;
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
      {COLS.map(([key, label]) => {
        const items = snap.tasks.filter((t) => t.status === key);
        return (
          <div key={key} className="px-inset p-2">
            <div className="px-title !text-[8px] mb-1">{label} · {items.length}</div>
            {!items.length && <div className="text-[13px] text-ink3">—</div>}
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1 border-t border-ink1 first:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{t.isMeeting ? "👥 " : ""}{t.title}</div>
                  <div className="text-[12px] text-ink5">{t.assignee ? who(t.assignee) : "unassigned"}{key === "in-progress" ? ` · ${Math.round(t.progress)}%` : ""}</div>
                </div>
                {key === "pending" && <PxButton className="!px-1" onClick={() => engine.removeTask(t.id)} title="Remove">✕</PxButton>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
