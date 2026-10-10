import { PxButton, PxChip } from "../atoms/index.jsx";

export default function TopBar({ snap, onToggleAuto, now }) {
  const online = snap.backend === "connected";
  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 border-b-4 border-ink bg-brick text-cream">
      <div className="w-9 h-9 bg-gold border-2 border-ink grid place-items-center text-brick font-display text-[10px]">MD</div>
      <div className="leading-tight">
        <div className="font-display text-[12px] text-gold">AIVerse Inc.</div>
        <div className="text-[13px] opacity-80 hidden sm:block">The world's best agents. The world's worst paper company.</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <PxChip color={online ? "#6bcf7f" : "#a899b5"} className="!text-ink">{online ? "backend live" : "local only"}</PxChip>
        <PxButton className={snap.auto ? "on" : ""} onClick={onToggleAuto} title="Auto mode: approve finished work automatically">{snap.auto ? "■ auto on" : "▶ auto"}</PxButton>
        <span className="px-mono text-gold hidden md:inline">{now}</span>
      </div>
    </header>
  );
}
