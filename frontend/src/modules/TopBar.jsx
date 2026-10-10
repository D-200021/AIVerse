import { useEffect, useRef, useState } from "react";
import { PxButton, PxChip } from "../atoms/index.jsx";

export default function TopBar({ snap, onToggleAuto, now, user, onOpenIde, ideOpen, onKey, onSignOut }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  const online = snap.backend === "connected";
  return (
    <header className="flex items-center gap-3 px-4 h-14 shrink-0 border-b-4 border-ink bg-brick text-cream">
      <div className="w-9 h-9 bg-gold border-2 border-ink grid place-items-center text-brick font-display text-[10px]">MD</div>
      <div className="leading-tight">
        <div className="font-display text-[12px] text-gold">AIVerse Inc.</div>
        <div className="text-[13px] opacity-80 hidden md:block">The world's best agents. The world's worst paper company.</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <PxChip color={online ? "#6bcf7f" : "#a899b5"} className="!text-ink hidden sm:inline-flex">{online ? "backend live" : "connecting…"}</PxChip>
        <PxButton className={ideOpen ? "on" : ""} onClick={onOpenIde} title="Open the code editor">{"</>"} IDE</PxButton>
        <PxButton className={snap.auto ? "on" : ""} onClick={onToggleAuto} title="Auto mode: approve finished work automatically">{snap.auto ? "■ auto on" : "▶ auto"}</PxButton>
        <span className="px-mono text-gold hidden lg:inline">{now}</span>
        <div className="relative" ref={ref}>
          <PxButton onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu} className="max-w-[140px] truncate">☺ {user?.name?.split(" ")[0] || "me"}</PxButton>
          {menu && (
            <div role="menu" className="px-panel absolute right-0 top-full mt-2 w-60 z-50 text-ink p-2 flex flex-col gap-2">
              <div className="text-[13px] leading-tight"><b>{user?.name}</b><div className="text-ink5 truncate">{user?.email}</div></div>
              <PxButton role="menuitem" onClick={() => { setMenu(false); onKey(); }}>Gemini API key…</PxButton>
              <PxButton role="menuitem" variant="coral" onClick={onSignOut}>Sign out</PxButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
