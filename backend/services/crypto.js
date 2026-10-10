import crypto from "node:crypto";

let warned = false;
function appSecret() {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET (16+ chars) must be set in production.");
  if (!warned) { warned = true; console.warn("[auth] APP_SECRET not set — using an insecure development secret. Set it in .env."); }
  return "dev-only-insecure-secret-change-me";
}
export const getAppSecret = appSecret;

/* ---- passwords: scrypt with a per-user random salt ---- */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}
export function verifyPassword(password, stored) {
  try {
    const [, saltB64, hashB64] = String(stored).split("$");
    const expected = Buffer.from(hashB64, "base64");
    const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

/* ---- Gemini key at rest: AES-256-GCM ---- */
const dataKey = () => crypto.scryptSync(appSecret(), "aiverse-gemini-key-v1", 32);
export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", dataKey(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decryptSecret(blob) {
  if (!blob) return "";
  try {
    const [iv, tag, enc] = blob.split(".").map((p) => Buffer.from(p, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", dataKey(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch { return ""; }
}

/* ---- reset tokens ---- */
export const newResetToken = () => crypto.randomBytes(32).toString("hex");
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
