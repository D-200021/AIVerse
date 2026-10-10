import express from "express";
import { routeMessage } from "../services/gemini.js";

const router = express.Router();

// POST /api/ceo/route  { text: string, roster?: Array<{id,name,role,handles,prompt}> }
// Decides (via Gemini, or a keyword fallback) whether this is a meeting
// request or a task, which employee best fits it, a CEO-voiced reply, and
// a concise task title. `roster` should be the caller's current employee
// list — since agents can be added/removed/edited from the frontend,
// this endpoint has no fixed idea of who exists.
router.post("/route", async (req, res) => {
  try {
    const { text, roster } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "text must be 500 characters or fewer." });
    }

    const decision = await routeMessage(text.trim(), roster, req.geminiKey);
    res.json(decision);
  } catch (err) {
    console.error("[ceo] route failed:", err.message);
    res.status(500).json({ error: "Failed to route message." });
  }
});

export default router;
