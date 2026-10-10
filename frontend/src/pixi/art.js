// Procedural pixel-style drawing helpers (no bundled art — everything is Graphics).
import { TILE as T } from "../sim/layout.js";

export const C = {
  ink: 0x1a1320, ink7: 0x3d2e4a, cream: 0xfff8e7, cream2: 0xf4e9c7, paper: 0xfcfaf0,
  woodL: 0xe5c896, woodD: 0xc9a66b, wall: 0x8b6f47, wallFace: 0xe8dcc0,
  sageL: 0xa9c4b3, sageD: 0x9bb8a6, path: 0xe8d8b0, void: 0x1a1320,
  desk: 0xd9a95f, deskD: 0xb98a45, chair: 0xc98b3e, green: 0x6bcf7f, greenD: 0x3f9b57, pot: 0xc9744a,
  screenOff: 0x2a2a3a, screenOn: 0x6cc4ff, screenWork: 0xffd93d, screenWait: 0x6c8ef5, screenBlock: 0xff6b6b,
  skin: 0xf2c9a0, skinD: 0xd9a77c,
};
export const STATUS_COLORS = {
  awaiting: 0xa899b5, toCEO: 0x4ecdc4, briefed: 0x4ecdc4, working: 0xffd93d, review: 0x6c8ef5,
  blocked: 0xff6b6b, break: 0xe8a33d, meeting: 0xb197fc,
};
export const hex = (s) => parseInt(String(s).replace("#", ""), 16);

export function box(g, x, y, w, h, fill, stroke = C.ink) {
  g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).fill(fill);
  if (stroke != null) g.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1).stroke({ width: 1, color: stroke });
}

export function drawFloor(g, W, H) {
  g.rect(0, 0, W, H).fill(C.void);
  // whole building shell
  g.rect(T, T, W - 2 * T, H - 2 * T).fill(C.cream);
  const tile = (x0, y0, x1, y1, a, b) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g.rect(x * T, y * T, T, T).fill((x + y) % 2 ? a : b);
  };
  tile(2, 5, 16, 17, C.woodL, C.woodD);      // CEO office
  tile(17, 5, 38, 17, C.sageL, C.sageD);      // meeting
  tile(40, 5, 62, 17, C.woodL, C.woodD);      // break
  tile(2, 17, 62, 40 - 1, C.sageL, C.sageD);  // open floor
  tile(2, 17, 62, 24, C.path, 0xe0cfa6);      // hall
  tile(16, 5, 17, 17, C.path, C.path); tile(38, 5, 40, 17, C.path, C.path);
  g.rect(T * 2, T * 2, T * 60, T * 3).fill(C.wallFace);  // top wall band
  g.rect(T * 2, T * 4.7, T * 60, 3).fill(C.wall);
  g.rect(T, T, W - 2 * T, H - 2 * T).stroke({ width: 3, color: C.ink, alignment: 1 });
  // room walls with door gaps (bottom walls)
  const wall = (x, y, w, h) => box(g, x, y, w, h, C.wallFace, C.ink);
  wall(16 * T - 4, 5 * T, 8, 12 * T);             // ceo | meet
  wall(38 * T + 4, 5 * T, 8, 12 * T);             // meet | break
  g.rect(38 * T + 4, 8 * T, 8, 3 * T).fill(C.path); // doorway meet<->break
  wall(2 * T, 17 * T - 4, 10.5 * T, 8);           // ceo bottom (door at 12-14)
  wall(14 * T, 17 * T - 4, 2 * T, 8);
  wall(17 * T, 17 * T - 4, 1 * T, 8); wall(19.2 * T, 17 * T - 4, 15.8 * T, 8); wall(37 * T, 17 * T - 4, 1.4 * T, 8);
  wall(40 * T - 4, 17 * T - 4, 3.6 * T + 4, 8); wall(53.6 * T, 17 * T - 4, 8.4 * T, 8); // break room, door at x 43.6-53.6
}

export function drawWindow(g, x, y) {
  box(g, x, y, 30, 24, 0x9fd8e8); g.rect(x + 14, y, 2, 24).fill(C.ink); g.rect(x, y + 11, 30, 2).fill(C.ink);
}
export function drawClock(g, x, y) { g.circle(x, y, 7).fill(C.cream).stroke({ width: 2, color: C.ink }); g.moveTo(x, y).lineTo(x, y - 4).moveTo(x, y).lineTo(x + 3, y).stroke({ width: 1, color: C.ink }); }
export function drawCalendar(g, x, y) { box(g, x, y, 20, 24, C.cream); g.rect(x + 1, y + 1, 18, 6).fill(0xff6b6b); for (let i = 0; i < 6; i++) g.rect(x + 3 + (i % 3) * 5, y + 10 + Math.floor(i / 3) * 6, 3, 3).fill(C.ink7); }

export function drawPlant(g, cx, by) {
  g.rect(cx - 5, by - 8, 10, 8).fill(C.pot).stroke({ width: 1, color: C.ink });
  g.poly([cx, by - 26, cx - 8, by - 9, cx + 8, by - 9]).fill(C.green).stroke({ width: 1, color: C.ink });
  g.poly([cx - 9, by - 18, cx - 3, by - 9, cx - 12, by - 9]).fill(C.greenD);
  g.poly([cx + 9, by - 18, cx + 3, by - 9, cx + 12, by - 9]).fill(C.greenD);
}

export function drawDesk(g, w, h) {
  box(g, 0, 0, w * T, h * T, C.desk);
  g.rect(2, h * T - 5, w * T - 4, 3).fill(C.deskD);
  // drawers
}
export function drawMonitor(g, x, y, screen) {
  box(g, x, y, 22, 15, C.ink7); g.rect(x + 2, y + 2, 18, 9).fill(screen);
  g.rect(x + 8, y + 15, 6, 3).fill(C.ink7);
}
export function drawKeyboardAndMug(g, x, y) { g.rect(x, y, 16, 5).fill(C.cream2).stroke({ width: 1, color: C.ink }); g.rect(x + 24, y - 1, 5, 6).fill(C.cream).stroke({ width: 1, color: C.ink }); }
export function drawChair(g) { g.circle(0, 0, 7).fill(C.chair).stroke({ width: 1.5, color: C.ink }); g.circle(0, 0, 2).fill(C.deskD); }

export function drawMeetTable(g, w, h) {
  box(g, 0, 0, w * T, h * T, C.desk);
  g.rect(4, 4, w * T - 8, h * T - 8).stroke({ width: 1, color: C.deskD });
  g.circle(w * T / 2, h * T / 2 - 2, 4).fill(C.green).stroke({ width: 1, color: C.ink });
}
export function drawCoffee(g) {
  box(g, 0, 0, 12 * T, 2 * T, C.cream2);
  box(g, 14, -14, 16, 22, C.ink7); g.rect(18, -8, 8, 6).fill(0xff6b6b); g.rect(18, 2, 8, 6).fill(C.cream);
  box(g, 40, -6, 14, 14, C.cream); g.rect(44, -2, 6, 6).fill(0x7a4a2b);
}
export function drawFridge(g) { box(g, 0, 0, 22, 40, 0xdfe9ee); g.rect(2, 18, 18, 2).fill(C.ink); g.rect(16, 6, 2, 8).fill(C.ink7); g.rect(16, 24, 2, 8).fill(C.ink7); }
export function drawCooler(g) { box(g, 0, 0, 16, 30, 0xdfe9ee); box(g, 2, -18, 12, 18, 0x7ac7ff); }
export function drawShelf(g, w) { box(g, 0, 0, w, 26, C.desk); for (let i = 0; i < w / 8 - 1; i++) g.rect(3 + i * 8, 4, 6, 8).fill([0xff6b6b, 0x4ecdc4, 0xffd93d, 0xb197fc][i % 4]); }
export function drawBreakTable(g, w, h) { box(g, 0, 0, w * T, h * T, C.cream); g.circle(w * T / 2, h * T / 2, 3).fill(C.deskD); }
export function drawBoard(g, w, h) { box(g, 0, 0, w, h, C.paper); g.rect(4, 5, w - 8, 2).fill(C.ink7); g.rect(4, 11, w * 0.6, 2).fill(0xff6b6b); g.rect(4, 17, w * 0.45, 2).fill(0x4ecdc4); }

export function drawCharacter(g, o) {
  g.clear();
  const face = o.face, step = o.step, sit = o.sitting;
  const body = o.isCeo ? 0x2c2c44 : o.color, pants = o.isCeo ? 0x1f1f33 : 0x3d3a5c;
  const yo = sit ? 3 : 0;
  // legs
  if (!sit) {
    const l = step ? 4 : 6, r = step ? 6 : 4;
    g.rect(-4, -6, 3, l).fill(pants); g.rect(1, -6, 3, r).fill(pants);
    g.rect(-4, -6 + l - 1, 3, 1).fill(C.ink); g.rect(1, -6 + r - 1, 3, 1).fill(C.ink);
  } else { g.rect(-4, -4, 3, 3).fill(pants); g.rect(1, -4, 3, 3).fill(pants); }
  // torso
  g.rect(-6, -15 + yo, 12, 10).fill(body).stroke({ width: 1, color: C.ink });
  if (o.isCeo && face === "down") { g.rect(-1, -14 + yo, 2, 8).fill(0xb3202a); g.poly([-4, -15 + yo, 0, -11 + yo, 4, -15 + yo]).fill(C.cream); }
  if (!o.isCeo && face === "down") g.rect(-1, -15 + yo, 2, 3).fill(C.cream);
  if (face === "left" || face === "right") { const s = face === "left" ? -1 : 1; g.rect(s * 5 - 1, -13 + yo, 2, 6).fill(C.skinD); }
  // head
  g.rect(-5, -24 + yo, 10, 10).fill(C.skin).stroke({ width: 1, color: C.ink });
  const hc = o.hairColor, hs = o.hair;
  if (face === "up") {
    g.rect(-6, -25 + yo, 12, 11).fill(hc).stroke({ width: 1, color: C.ink });
    if (hs === "long") g.rect(-6, -15 + yo, 12, 6).fill(hc);
  } else {
    g.rect(-6, -25 + yo, 12, 4).fill(hc);
    if (hs === "long") { g.rect(-6, -25 + yo, 2, 14).fill(hc); g.rect(4, -25 + yo, 2, 14).fill(hc); }
    else if (hs === "bob") { g.rect(-6, -25 + yo, 2, 9).fill(hc); g.rect(4, -25 + yo, 2, 9).fill(hc); }
    else if (hs === "spiky") { g.poly([-5, -25 + yo, -3, -29 + yo, -1, -25 + yo]).fill(hc); g.poly([-1, -25 + yo, 1, -30 + yo, 3, -25 + yo]).fill(hc); g.poly([2, -25 + yo, 4, -28 + yo, 6, -25 + yo]).fill(hc); }
    else g.rect(-6, -25 + yo, 2, 5).fill(hc), g.rect(4, -25 + yo, 2, 5).fill(hc);
    if (face === "down") { g.rect(-3, -19 + yo, 2, 2).fill(C.ink); g.rect(1, -19 + yo, 2, 2).fill(C.ink); g.rect(-1, -16 + yo, 2, 1).fill(0xb3604a); }
    else { const s = face === "left" ? -1 : 1; g.rect(s * 2 - 1, -19 + yo, 2, 2).fill(C.ink); }
  }
}

// Monitor seen from behind (screen faces the person sitting on the far side of the desk).
export function drawMonitorBack(g, x, y) {
  box(g, x, y, 22, 15, C.ink7); g.rect(x + 9, y + 5, 4, 4).fill(0xe8d9a0);
  g.rect(x + 8, y + 15, 6, 3).fill(C.ink7);
}
