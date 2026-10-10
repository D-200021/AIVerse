// Atoms: the smallest reusable pixel-UI pieces.
export const STATUS_META = {
  awaiting: { label: "awaiting", color: "#a899b5" }, toCEO: { label: "to CEO", color: "#4ecdc4" },
  briefed: { label: "briefing", color: "#4ecdc4" }, working: { label: "working", color: "#ffd93d" },
  review: { label: "in review", color: "#6c8ef5" }, blocked: { label: "asked you", color: "#ff6b6b" },
  break: { label: "on break", color: "#e8a33d" }, meeting: { label: "meeting", color: "#b197fc" },
  idle: { label: "idle", color: "#a899b5" },
};

export function PxPanel({ title, right, children, className = "", bodyClass = "p-3" }) {
  return (
    <section className={`px-panel flex flex-col min-h-0 ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-2 px-3 py-2 border-b-2 border-ink bg-gradient-to-b from-cream to-cream2">
          <h2 className="px-title">{title}</h2>{right}
        </header>
      )}
      <div className={`${bodyClass} min-h-0 flex-1`}>{children}</div>
    </section>
  );
}

export function PxButton({ variant = "", className = "", ...p }) {
  return <button type="button" {...p} className={`px-btn ${variant} ${className}`} />;
}

export function PxChip({ color, children, className = "" }) {
  return <span className={`px-chip ${className}`}>{color && <i style={{ background: color }} />}{children}</span>;
}

export function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.idle;
  return <PxChip color={m.color}>{m.label}</PxChip>;
}

export function PxBar({ value = 0, color }) {
  return <div className="px-bar"><div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>;
}

export function PxField({ label, multiline, className = "", ...p }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <label className="block">
      {label && <span className="block text-[13px] text-ink5 mb-0.5">{label}</span>}
      <Tag {...p} className={`px-input ${className}`} />
    </label>
  );
}

const HAIR_BLOCKS = { short: [[2, 1, 8, 3]], long: [[2, 1, 8, 3], [1, 3, 2, 8], [9, 3, 2, 8]], bob: [[2, 1, 8, 3], [1, 3, 2, 5], [9, 3, 2, 5]], spiky: [[2, 2, 8, 2], [3, 0, 2, 2], [6, 0, 2, 2]] };
// Little pixel head-and-shoulders portrait, drawn as SVG rects.
export function Portrait({ color = "#4fa3ff", hair = "short", hairColor = "#2b2b2b", size = 40, ceo = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" className="shrink-0 border-2 border-ink bg-cream3">
      <rect x="1" y="9" width="10" height="3" fill={ceo ? "#2c2c44" : color} />
      {ceo && <rect x="5.5" y="9" width="1" height="3" fill="#b3202a" />}
      <rect x="3" y="3" width="6" height="6" fill="#f2c9a0" />
      {(HAIR_BLOCKS[hair] || HAIR_BLOCKS.short).map((b, i) => <rect key={i} x={b[0]} y={b[1]} width={b[2]} height={b[3]} fill={hairColor} />)}
      <rect x="4" y="5.5" width="1" height="1" fill="#1a1320" /><rect x="7" y="5.5" width="1" height="1" fill="#1a1320" />
    </svg>
  );
}

export function Swatch({ color, selected, onClick }) {
  return <button type="button" onClick={onClick} style={{ background: color }} className={`w-6 h-6 border-2 ${selected ? "border-ink outline-2 outline-lemon outline" : "border-ink/40"}`} aria-label={color} />;
}
