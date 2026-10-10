import { renderMarkup } from "../../lib/routing.jsx";

export default function ActivityTab({ snap }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1">
      {snap.log.map((l) => (
        <div key={l.id} className="px-mono flex gap-2"><span className="text-ink5 shrink-0">{l.time}</span><span>{renderMarkup(l.text)}</span></div>
      ))}
    </div>
  );
}
