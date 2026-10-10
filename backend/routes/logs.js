import express from "express";
import EventLog from "../models/EventLog.js";

const router = express.Router();

// GET /api/logs?room=default&limit=8
// Returns the most recent N entries, newest first (matches the sidebar's log order).
router.get("/", async (req, res) => {
  try {
    const room = req.query.room || "default";
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 200);

    const logs = await EventLog.find({ room })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ logs });
  } catch (err) {
    console.error("[logs] GET failed:", err.message);
    res.status(500).json({ error: "Failed to load event log." });
  }
});

// POST /api/logs  { text: string, room?: string }
router.post("/", async (req, res) => {
  try {
    const { text, room = "default" } = req.body || {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "text must be 500 characters or fewer." });
    }

    const log = await EventLog.create({ text: text.trim(), room });
    res.status(201).json({ log });
  } catch (err) {
    console.error("[logs] POST failed:", err.message);
    res.status(500).json({ error: "Failed to save event log entry." });
  }
});

export default router;
