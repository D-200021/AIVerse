import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getAppSecret, decryptSecret } from "../services/crypto.js";

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0 }, getAppSecret(), { expiresIn: "7d" });

// Verifies the Bearer token, then exposes the account to the route:
//   req.user      – the user document
//   req.userRoom  – the data partition for this account (agents, chat, logs)
//   req.geminiKey – the user's own decrypted Gemini API key
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Please sign in." });
    let payload;
    try { payload = jwt.verify(token, getAppSecret()); } catch { return res.status(401).json({ error: "Session expired. Please sign in again." }); }
    const user = await User.findById(payload.sub);
    if (!user || (user.tokenVersion || 0) !== payload.v) return res.status(401).json({ error: "Session expired. Please sign in again." });
    req.user = user;
    req.userRoom = `user:${user._id}`;
    req.geminiKey = decryptSecret(user.geminiKeyEnc);
    next();
  } catch (err) {
    console.error("[auth] middleware failed:", err.message);
    res.status(500).json({ error: "Authentication failed." });
  }
}
