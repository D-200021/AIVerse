export function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function truncate(str, max) { return str.length > max ? str.slice(0, max - 1).trim() + "…" : str; }

export function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

export function hexToNum(hex) { return parseInt(hex.replace("#", ""), 16); }

export function formatTime(d) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}
