import "pixi.js/unsafe-eval";
import { Application, Container, Graphics, Text } from "pixi.js";
import { TILE as T, W, H, ROOMS, meetingSeats, MEET_HEAD, CEO_DESK, MEET_TABLE, COFFEE_MACHINE, BREAK_TABLE, CEO_SEAT, deskLayout } from "../sim/layout.js";
import * as A from "./art.js";

const FONT = "Pixelify Sans, monospace";
const mkText = (s, size, fill = A.C.ink) => new Text({ text: s, style: { fontFamily: FONT, fontSize: size, fill }, resolution: 3 });

export class OfficeStage {
  constructor(engine, { onPick }) { this.engine = engine; this.onPick = onPick; this.views = new Map(); this.env = new Map(); this.deskN = -1; this.dead = false; }

  async mount(el) {
    try { await document.fonts.load("12px 'Pixelify Sans'"); } catch { /* font optional */ }
    const app = new Application();
    await app.init({ resizeTo: el, background: A.C.void, antialias: false, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    if (this.dead) { app.destroy(true, { children: true }); return; }
    this.app = app; el.appendChild(app.canvas);
    this.root = new Container(); app.stage.addChild(this.root);
    this.floor = new Graphics(); this.root.addChild(this.floor);
    this.deco = new Container(); this.root.addChild(this.deco);
    this.world = new Container(); this.world.sortableChildren = true; this.root.addChild(this.world);
    this.fx = new Container(); this.root.addChild(this.fx);
    A.drawFloor(this.floor, W, H);
    this.buildDecor();
    app.ticker.add((tk) => this.frame(tk.deltaMS));
  }

  put(g, x, y, z = y) { g.x = Math.round(x); g.y = Math.round(y); g.zIndex = z; this.world.addChild(g); return g; }
  buildDecor() {
    const d = new Graphics(); this.deco.addChild(d);
    [[3, 2.3], [11, 2.3], [20, 2.3], [31, 2.3], [42, 2.3], [55, 2.3]].forEach(([x, y]) => A.drawWindow(d, x * T, y * T));
    A.drawClock(d, 7.6 * T, 3.3 * T); A.drawCalendar(d, 14 * T, 2.4 * T);
    Object.values(ROOMS).forEach((r) => {
      const t = mkText(r.label, 9); const bg = new Graphics();
      bg.rect(0, 0, t.width + 12, 14).fill(A.C.cream).stroke({ width: 1, color: A.C.ink });
      t.x = 6; t.y = 1; const c = new Container(); c.addChild(bg, t); c.x = r.x * T + 6; c.y = r.y * T + 4; this.fx.addChild(c);
    });
    // CEO office
    const cd = new Graphics(); A.drawDesk(cd, CEO_DESK.w, CEO_DESK.h); A.drawKeyboardAndMug(cd, 40, 5); A.drawMonitorBack(cd, 37, 16);
    this.put(cd, CEO_DESK.x * T, CEO_DESK.y * T, (CEO_DESK.y + CEO_DESK.h) * T);
    const cc = new Graphics(); A.drawChair(cc); this.put(cc, CEO_SEAT.x * T, CEO_SEAT.y * T - 8, CEO_SEAT.y * T - 8);
    const sh = new Graphics(); A.drawShelf(sh, 64); this.put(sh, 3 * T, 4.9 * T, 5 * T);
    const sh2 = new Graphics(); A.drawShelf(sh2, 48); this.put(sh2, 9.2 * T, 4.9 * T, 5 * T);
    // Meeting room
    const mt = new Graphics(); A.drawMeetTable(mt, MEET_TABLE.w, MEET_TABLE.h); this.put(mt, MEET_TABLE.x * T, MEET_TABLE.y * T, (MEET_TABLE.y + MEET_TABLE.h) * T - 20);
    [...meetingSeats(10), MEET_HEAD].forEach((st) => { const c = new Graphics(); A.drawChair(c); this.put(c, st.x * T, st.y * T + 3, st.y * T - 3); });
    const bd = new Graphics(); A.drawBoard(bd, 70, 24); this.put(bd, 24 * T, 5.1 * T, 5 * T);
    // Break room
    const cm = new Graphics(); A.drawCoffee(cm); this.put(cm, 43 * T, 5.2 * T, COFFEE_MACHINE.y * T + 20);
    const fr = new Graphics(); A.drawFridge(fr); this.put(fr, 57 * T, 5.1 * T, 8 * T);
    const wc = new Graphics(); A.drawCooler(wc); this.put(wc, 59.3 * T, 6.3 * T, 8.5 * T);
    const bt = new Graphics(); A.drawBreakTable(bt, BREAK_TABLE.w, BREAK_TABLE.h); this.put(bt, BREAK_TABLE.x * T, BREAK_TABLE.y * T, (BREAK_TABLE.y + BREAK_TABLE.h) * T - 10);
    [[2.8, 17], [38.4, 17.4], [61, 18.6], [16.4, 18.6], [40.8, 18.2]].forEach(([x, y]) => { const p = new Graphics(); A.drawPlant(p, 0, 0); this.put(p, x * T, y * T, y * T); });
  }

  buildDesks(n) {
    (this.deskLayer || []).forEach((g) => g.destroy()); this.deskLayer = []; this.screens = [];
    for (let i = 0; i < n; i++) {
      const { desk, seat } = deskLayout(i);
      const g = new Graphics(); A.drawDesk(g, desk.w, desk.h); A.drawKeyboardAndMug(g, 26, 22);
      this.deskLayer.push(this.put(g, desk.x * T, desk.y * T, (desk.y + desk.h) * T - 2));
      const s = new Graphics(); this.screens[i] = { g: s, key: null };
      this.deskLayer.push(this.put(s, desk.x * T + 29, desk.y * T + 1, (desk.y + desk.h) * T - 1));
      const c = new Graphics(); A.drawChair(c); this.deskLayer.push(this.put(c, seat.x * T, seat.y * T + 3, seat.y * T - 3));
    }
    [[1.8, 23.4], [62.2, 23.4], [1.8, 38.6], [62.2, 38.6]].forEach(([x, y]) => { const p = new Graphics(); A.drawPlant(p, 0, 0); this.deskLayer.push(this.put(p, x * T, y * T, y * T)); });
    this.deskN = n;
  }

  makeView(a) {
    const v = { ch: new Graphics(), key: "", tag: new Container(), bub: new Container(), bubText: null, dot: new Graphics(), nameT: mkText(a.name, 9, A.C.cream), tagBg: new Graphics(), bt: mkText("", 9), bbg: new Graphics() };
    v.ch.eventMode = "static"; v.ch.cursor = "pointer"; v.ch.scale.set(1.35); v.ch.hitArea = { contains: (x, y) => x > -8 && x < 8 && y > -28 && y < 2 };
    v.ch.on("pointertap", () => this.onPick(a.id));
    v.tag.addChild(v.tagBg, v.dot, v.nameT); v.bub.addChild(v.bbg, v.bt);
    this.world.addChild(v.ch); this.fx.addChild(v.tag, v.bub);
    return v;
  }
  drawTag(v, a) {
    const w = Math.ceil(v.nameT.width) + 14;
    v.tagBg.clear().rect(0, 0, w, 13).fill(A.C.ink).rect(0, 0, 3, 13).fill(a.isCeo ? 0xffd93d : A.hex(a.color));
    v.nameT.x = 9; v.nameT.y = 1; v.tagW = w; v.nameKey = a.name;
  }
  setBubble(v, text) {
    if (!text) { v.bub.visible = false; v.bubText = null; return; }
    if (v.bubText !== text) {
      v.bubText = text; v.bt.text = text; v.bt.style.wordWrap = true; v.bt.style.wordWrapWidth = 110; v.bt.x = 5; v.bt.y = 3;
      const w = Math.ceil(v.bt.width) + 10, h = Math.ceil(v.bt.height) + 8;
      v.bw = w; v.bh = h;
      v.bbg.clear().rect(0, 0, w, h).fill(A.C.cream).stroke({ width: 1.5, color: A.C.ink }).poly([w / 2 - 3, h, w / 2 + 3, h, w / 2, h + 4]).fill(A.C.cream);
    }
    v.bub.visible = true;
  }

  frame(dtMs) {
    const e = this.engine; if (!this.app) return;
    e.tick(dtMs);
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const s = Math.min(sw / W, sh / H); this.root.scale.set(s); this.root.x = Math.round((sw - W * s) / 2); this.root.y = Math.round((sh - H * s) / 2);
    if (this.deskN !== e.agents.size) this.buildDesks(e.agents.size);
    const actors = [e.ceo, ...e.agents.values()];
    const ids = new Set(actors.map((a) => a.id));
    for (const [id, v] of this.views) if (!ids.has(id)) { [v.ch, v.tag, v.bub].forEach((o) => o.destroy({ children: true })); this.views.delete(id); }
    for (const a of actors) {
      let v = this.views.get(a.id); if (!v) { v = this.makeView(a); this.views.set(a.id, v); }
      if (v.nameKey !== a.name) this.drawTag(v, a);
      const step = a.walking ? Math.floor(e.t / 140) % 2 : 0;
      const key = [a.face, step, a.sitting, a.color, a.hair, a.hairColor].join("|");
      if (key !== v.key) { v.key = key; A.drawCharacter(v.ch, { ...a, step, color: A.hex(a.color), hairColor: A.hex(a.hairColor || "#2b2b2b") }); }
      const bob = a.walking ? (step ? -1 : 0) : 0;
      const wig = a.wiggleAt && e.t - a.wiggleAt < 500 ? Math.sin((e.t - a.wiggleAt) / 40) : 0;
      v.ch.x = Math.round(a.x * T + wig); v.ch.y = Math.round(a.y * T + bob); v.ch.zIndex = a.y * T + (a.sitting ? 4 : 0);
      v.tag.x = Math.round(v.ch.x - (v.tagW || 30) / 2); v.tag.y = Math.round(v.ch.y + (a.isCeo && a.sitting ? 36 : 3));
      v.dot.clear().rect((v.tagW || 30) - 8, 4, 5, 5).fill(a.isCeo ? A.C.green : A.STATUS_COLORS[a.state === "idle" ? "awaiting" : a.state] || A.C.ink7);
      const b = e.bubbles[a.id]; this.setBubble(v, b && b.text);
      if (b) { v.bub.x = Math.round(Math.min(Math.max(v.ch.x - v.bw / 2, T + 2), W - T - v.bw - 2)); v.bub.y = Math.round(Math.max(v.ch.y - 40 - v.bh, T + 2)); }
    }
    // monitors
    let i = 0;
    for (const a of e.agents.values()) {
      const sc = this.screens && this.screens[a.index]; if (sc) {
        const at = a.sitting && a.face === "up" && !a.walking;
        const col = !at ? A.C.screenOff : a.state === "working" ? A.C.screenWork : a.state === "review" ? A.C.screenWait : a.state === "blocked" ? A.C.screenBlock : A.C.screenOn;
        const k = col; if (sc.key !== k) { sc.key = k; sc.g.clear(); A.drawMonitor(sc.g, 0, 0, col); }
      } i++;
    }
    // envelopes
    const live = new Set();
    for (const en of e.envelopes) {
      live.add(en.id); let g = this.env.get(en.id);
      if (!g) { g = new Graphics(); g.rect(-6, -4, 12, 8).fill(A.C.cream).stroke({ width: 1, color: A.C.ink }).poly([-6, -4, 0, 1, 6, -4]).stroke({ width: 1, color: 0xb3202a }); g.zIndex = 1e6; this.fx.addChild(g); this.env.set(en.id, g); }
      const p = Math.min(1, (e.t - en.t0) / en.dur);
      g.x = (en.from.x + (en.to.x - en.from.x) * p) * T; g.y = (en.from.y + (en.to.y - en.from.y) * p) * T - 24 - Math.sin(p * Math.PI) * 18;
    }
    for (const [id, g] of this.env) if (!live.has(id)) { g.destroy(); this.env.delete(id); }
  }

  destroy() {
    this.dead = true;
    if (this.app) { try { this.app.destroy(true, { children: true }); } catch { /* already gone */ } this.app = null; }
  }
}
