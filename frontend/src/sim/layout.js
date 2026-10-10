// Tile-based office map (1 tile = 16px). All positions are in tiles.
export const TILE = 16, COLS = 64, ROWS = 40;
export const W = COLS * TILE, H = ROWS * TILE;
export const HALL_Y = 21;

export const ROOMS = {
  ceo:   { x: 2,  y: 5, w: 14, h: 12, label: "CEO Office" },
  meet:  { x: 17, y: 5, w: 21, h: 12, label: "Meeting Room" },
  break: { x: 40, y: 5, w: 22, h: 12, label: "Break Room" },
};
export const CEO_DESK = { x: 5, y: 10.2, w: 6, h: 2.5 };
export const MEET_TABLE = { x: 21, y: 8.6, w: 13, h: 3.6 };
export const COFFEE_MACHINE = { x: 44, y: 5.6 };
export const BREAK_TABLE = { x: 53, y: 12, w: 4, h: 2.5 };
export const MAX_AGENTS = 14;

const hall = (x) => ({ x, y: HALL_Y });

export const CEO_SEAT = { x: 8, y: 10.8, sit: true, face: "down", via: [{ x: 8, y: 9 }, { x: 12.6, y: 9 }, hall(12.6)] };
export const CEO_VISIT = { x: 12.6, y: 11.6, face: "left", via: [hall(12.6)] };

export const COFFEE_SPOTS = [44.5, 47, 49.5, 52].map((x, i) => ({
  x, y: 8.6, face: i % 2 ? "left" : "right", via: [{ x, y: 15.5 }, hall(x)],
}));

export function meetingSeats(n) {
  const xs = [22, 24.6, 27.2, 29.8, 32.4];
  const seats = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 5) % 2, col = i % 5;
    const x = xs[col];
    const top = row === 0;
    const y = top ? 7.5 : 13.4;
    seats.push({ x, y, sit: true, face: top ? "down" : "up", via: [{ x: 18.4, y }, { x: 18.4, y: HALL_Y }] });
  }
  return seats;
}
export const MEET_HEAD = { x: 36, y: 10.4, sit: true, face: "left", via: [{ x: 36, y: 14.8 }, hall(36)] };

export function deskLayout(i) {
  const col = i % 7, row = Math.floor(i / 7);
  const dx = 3 + col * 8.5, dy = 25 + row * 7.5;
  const sy = dy + 4.5;
  return {
    desk: { x: dx, y: dy, w: 5, h: 2.6 },
    seat: { x: dx + 2.5, y: sy, sit: true, face: "up", via: [{ x: dx + 6.9, y: sy }, hall(dx + 6.9)] },
  };
}

export const hallLoc = (x) => ({ x, y: HALL_Y, via: [hall(x)] });

// Walk route: leave `from` along its via list (ends on the hall), cross the hall,
// then enter `to` via its via list reversed.
export function route(from, to) {
  const out = (from.via || []).map((p) => ({ x: p.x, y: p.y }));
  const inn = [...(to.via || [])].reverse().map((p) => ({ x: p.x, y: p.y }));
  return [...out, ...inn, { x: to.x, y: to.y }];
}
