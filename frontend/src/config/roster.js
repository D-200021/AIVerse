// The starting roster is a single agent; hire more from the Agents tab.
// Entries are fully editable/removable from the UI. Each entry mirrors the backend Employee schema; desk
// position is NOT stored here since it's recomputed from roster order
// every time someone is added or removed (see computeDeskLayout()).
export const DEFAULT_ROSTER = [
  { id: "raj",  name: "Raj",  role: "Software Engineer",   handles: "code, develop, feature, build, app, debug, engineer, software, programming, bug", prompt: "", color: "#4fa3ff", hair: "short", hairColor: "#1f1f1f", speed: 1 },
];

export const HAIR_TYPES = ["short", "long", "bob", "spiky"];
export const AVATAR_COLORS = ["#37c9b8", "#7c93ff", "#ff9d4d", "#ff6fa0", "#4fa3ff", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#fb7185"];

const HAIR_COLOR_PALETTE = ["#2b2b2b", "#6b3f1d", "#d99a3d", "#7a2b4a", "#1f1f1f", "#4a4a4a", "#8a5a2b"];
export function pickHairColorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return HAIR_COLOR_PALETTE[hash % HAIR_COLOR_PALETTE.length];
}
