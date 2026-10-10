import { PxChip } from "../atoms/index.jsx";
import { STATUS_META } from "../atoms/index.jsx";

export default function FloorView({ mountRef, snap }) {
  const counts = snap.agents.reduce((m, a) => ({ ...m, [a.status]: (m[a.status] || 0) + 1 }), {});
  return (
    <div className="relative flex-1 min-h-[300px] min-w-0 border-4 border-ink bg-ink">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute left-2 bottom-2 flex flex-wrap gap-1 pointer-events-none">
        {Object.entries(counts).map(([k, n]) => <PxChip key={k} color={STATUS_META[k]?.color}>{n} {STATUS_META[k]?.label}</PxChip>)}
        {snap.meeting && <PxChip color="#b197fc">team meeting</PxChip>}
      </div>
    </div>
  );
}
