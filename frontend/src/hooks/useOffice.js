import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { OfficeEngine } from "../sim/engine.js";
import { OfficeStage } from "../pixi/OfficeStage.js";

export function useOffice({ apiBase, roomId }) {
  const mountRef = useRef(null);
  const engine = useMemo(() => new OfficeEngine({ apiBase, roomId }), [apiBase, roomId]);
  const snap = useSyncExternalStore(engine.subscribe.bind(engine), engine.getSnapshot);

  useEffect(() => {
    engine.destroyed = false;
    engine.boot();
    const stage = new OfficeStage(engine, { onPick: (id) => engine.clickAgent(id) });
    if (mountRef.current) stage.mount(mountRef.current);
    return () => { stage.destroy(); engine.destroy(); };
  }, [engine]);

  return { engine, snap, mountRef };
}
