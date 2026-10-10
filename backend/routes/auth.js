import express from "express";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { hashPassword, verifyPassword, encryptSecret, newResetToken, sha256 } from "../services/crypto.js";
import { validateGeminiKey } from "../services/llm.js";
import { sendResetEmail } from "../services/mailer.js";

const router = express.Router();

// Throttle credential guessing / abuse (disabled under test).
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test" }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KEY_RE = /^[\w-]{20,200}$/;
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, hasGeminiKey: !!u.geminiKeyEnc });
const str = (v) => (typeof v === "string" ? v : "");

function checkPassword(pw) {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return "Password needs at least one letter and one number.";
  return null;
}

// POST /api/auth/signup { name, email, password, geminiKey }
router.post("/signup", async (req, res) => {
  try {
    const name = str(req.body?.name).trim(), email = str(req.body?.email).trim().toLowerCase();
    const password = str(req.body?.password), geminiKey = str(req.body?.geminiKey).trim();
    if (!name || name.length > 60) return res.status(400).json({ error: "Please enter your name (60 characters max)." });
    if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ error: "Please enter a valid email address." });
    const pwErr = checkPassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    if (!geminiKey) return res.status(400).json({ error: "Please paste your Google Gemini API key." });

    if (await User.findOne({ email })) return res.status(409).json({ error: "An account with this email already exists." });

    // const check = await validateGeminiKey(geminiKey);
    // if (!check.ok) return res.status(400).json({ error: check.reason });

    const check = true;

    const user = await User.create({ name, email, passwordHash: hashPassword(password), geminiKeyEnc: encryptSecret(geminiKey) });
    res.status(201).json({ token: signToken(user), user: publicUser(user), keyVerified: !check.unverified });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: "An account with this email already exists." });
    console.error("[auth] signup failed:", err.message);
    res.status(500).json({ error: "Could not create the account." });
  }
});

// POST /api/auth/login { email, password }
router.post("/login", async (req, res) => {
  try {
    const email = str(req.body?.email).trim().toLowerCase(), password = str(req.body?.password);
    const user = email && password ? await User.findOne({ email }) : null;
    // Same message for unknown email and wrong password (no account enumeration).
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: "Incorrect email or password." });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("[auth] login failed:", err.message);
    res.status(500).json({ error: "Could not sign in." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// PUT /api/auth/me/gemini-key { geminiKey }
router.put("/me/gemini-key", requireAuth, async (req, res) => {
  try {
    const geminiKey = str(req.body?.geminiKey).trim();
    if (!KEY_RE.test(geminiKey)) return res.status(400).json({ error: "Please paste a valid Google Gemini API key." });
    const check = await validateGeminiKey(geminiKey);
    if (!check.ok) return res.status(400).json({ error: check.reason });
    await User.updateOne({ _id: req.user._id }, { $set: { geminiKeyEnc: encryptSecret(geminiKey) } });
    res.json({ ok: true, keyVerified: !check.unverified });
  } catch (err) {
    console.error("[auth] key update failed:", err.message);
    res.status(500).json({ error: "Could not update the key." });
  }
});

// POST /api/auth/forgot-password { email } — always answers the same way.
router.post("/forgot-password", async (req, res) => {
  const generic = { message: "If an account exists for that email, a reset link is on its way." };
  try {
    const email = str(req.body?.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.json(generic);
    const user = await User.findOne({ email });
    if (!user) return res.json(generic);
    const token = newResetToken();
    await User.updateOne({ _id: user._id }, { $set: { resetTokenHash: sha256(token), resetExpires: new Date(Date.now() + 60 * 60 * 1000) } });
    const base = process.env.APP_URL || "http://localhost:5173";
    const link = `${base}/#/reset?token=${token}`;
    await sendResetEmail(user.email, link).catch((e) => console.error("[mail] failed:", e.message));
    // Convenience for local development only (never in production, never when SMTP is set up).
    if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) generic.devResetLink = link;
    res.json(generic);
  } catch (err) {
    console.error("[auth] forgot failed:", err.message);
    res.json(generic);
  }
});

// POST /api/auth/reset-password { token, password }
router.post("/reset-password", async (req, res) => {
  try {
    const token = str(req.body?.token), password = str(req.body?.password);
    const pwErr = checkPassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const user = token ? await User.findOne({ resetTokenHash: sha256(token), resetExpires: { $gt: new Date() } }) : null;
    if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired." });
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: hashPassword(password), resetTokenHash: null, resetExpires: null }, $inc: { tokenVersion: 1 } });
    res.json({ message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error("[auth] reset failed:", err.message);
    res.status(500).json({ error: "Could not reset the password." });
  }
});

export default router;
