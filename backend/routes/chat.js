import express from "express";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

// GET /api/chat?room=default&limit=200
// Returns chat history, oldest first, ready to drop straight into the UI.
router.get("/", async (req, res) => {
  try {
    const room = req.userRoom;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const messages = await ChatMessage.find({ room })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    res.json({ messages });
  } catch (err) {
    console.error("[chat] GET failed:", err.message);
    res.status(500).json({ error: "Failed to load chat history." });
  }
});

// POST /api/chat  { sender: "user" | "ceo", text: string, room?: string }
router.post("/", async (req, res) => {
  try {
    const { sender, text } = req.body || {};
    const room = req.userRoom;

    if (!sender || !["user", "ceo"].includes(sender)) {
      return res.status(400).json({ error: "sender must be 'user' or 'ceo'." });
    }
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "text must be 500 characters or fewer." });
    }

    const message = await ChatMessage.create({ sender, text: text.trim(), room });
    res.status(201).json({ message });
  } catch (err) {
    console.error("[chat] POST failed:", err.message);
    res.status(500).json({ error: "Failed to save chat message." });
  }
});

// DELETE /api/chat?room=default — clears history for a room (e.g. a "reset" button).
router.delete("/", async (req, res) => {
  try {
    const room = req.userRoom;
    await ChatMessage.deleteMany({ room });
    res.json({ ok: true });
  } catch (err) {
    console.error("[chat] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to clear chat history." });
  }
});

export default router;
