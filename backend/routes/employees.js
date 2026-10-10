import express from "express";
import Employee from "../models/Employee.js";

const router = express.Router();

const HAIR_TYPES = new Set(["short", "long", "bob", "spiky"]);

function validateFields(body, { partial = false } = {}) {
  const { name, role, handles, prompt, color, hair, speed } = body;

  if (!partial || name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) return "name is required.";
    if (name.length > 40) return "name must be 40 characters or fewer.";
  }
  if (!partial || role !== undefined) {
    if (!role || typeof role !== "string" || !role.trim()) return "role is required.";
    if (role.length > 60) return "role must be 60 characters or fewer.";
  }
  if (handles !== undefined && (typeof handles !== "string" || handles.length > 200)) {
    return "handles must be a string of 200 characters or fewer.";
  }
  if (prompt !== undefined && (typeof prompt !== "string" || prompt.length > 400)) {
    return "prompt must be a string of 400 characters or fewer.";
  }
  if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) {
    return "color must be a hex string like #7c93ff.";
  }
  if (hair !== undefined && !HAIR_TYPES.has(hair)) {
    return "hair must be one of: short, long, bob, spiky.";
  }
  if (speed !== undefined && (typeof speed !== "number" || speed < 0.5 || speed > 2)) {
    return "speed must be a number between 0.5 and 2.";
  }
  return null;
}

function slugify(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (base || "agent") + "-" + Math.random().toString(36).slice(2, 6);
}

// GET /api/employees?room=default
router.get("/", async (req, res) => {
  try {
    const room = req.query.room || "default";
    const employees = await Employee.find({ room }).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ employees });
  } catch (err) {
    console.error("[employees] GET failed:", err.message);
    res.status(500).json({ error: "Failed to load employees." });
  }
});

// POST /api/employees
// { room?, employeeId?, name, role, handles?, prompt?, color?, hair?, speed?, order? }
// employeeId is optional — omit it when a human adds a new agent from the
// UI and one will be generated; the initial default-roster seed passes
// explicit ids (emma/john/raj/alex/mia) so they stay stable across reloads.
router.post("/", async (req, res) => {
  try {
    const room = req.body.room || "default";
    const err = validateFields(req.body);
    if (err) return res.status(400).json({ error: err });

    const employeeId = req.body.employeeId && String(req.body.employeeId).trim()
      ? String(req.body.employeeId).trim()
      : slugify(req.body.name);

    const existing = await Employee.findOne({ room, employeeId });
    if (existing) return res.status(409).json({ error: `employeeId "${employeeId}" already exists in this room.` });

    const doc = await Employee.create({
      room,
      employeeId,
      name: req.body.name.trim(),
      role: req.body.role.trim(),
      handles: (req.body.handles || "").trim(),
      prompt: (req.body.prompt || "").trim(),
      color: req.body.color || "#7c93ff",
      hair: req.body.hair || "short",
      speed: req.body.speed ?? 1,
      order: req.body.order ?? Date.now(),
    });
    res.status(201).json({ employee: doc });
  } catch (err) {
    console.error("[employees] POST failed:", err.message);
    res.status(500).json({ error: "Failed to create employee." });
  }
});

// PUT /api/employees/:employeeId  { room?, name?, role?, handles?, prompt?, color?, hair?, speed? }
// Upsert semantics: editing a default employee that has never been saved
// before transparently creates its record, so the UI doesn't need to know
// or care whether this is the first edit.
router.put("/:employeeId", async (req, res) => {
  try {
    const room = req.body.room || "default";
    const { employeeId } = req.params;
    const err = validateFields(req.body, { partial: true });
    if (err) return res.status(400).json({ error: err });

    const updates = {};
    ["name", "role", "handles", "prompt", "color", "hair", "speed"].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
    });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }
    // Upsert requires the required fields (name, role) to be present the
    // first time a record is created this way.
    if (!updates.name || !updates.role) {
      const found = await Employee.findOne({ room, employeeId });
      if (!found && (!updates.name || !updates.role)) {
        return res.status(400).json({ error: "name and role are required to create a new employee record." });
      }
    }

    const doc = await Employee.findOneAndUpdate(
      { room, employeeId },
      { $set: updates, $setOnInsert: { employeeId, room } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ employee: doc });
  } catch (err) {
    console.error("[employees] PUT failed:", err.message);
    res.status(500).json({ error: "Failed to update employee." });
  }
});

// DELETE /api/employees/:employeeId?room=default
router.delete("/:employeeId", async (req, res) => {
  try {
    const room = req.query.room || "default";
    await Employee.deleteOne({ room, employeeId: req.params.employeeId });
    res.json({ ok: true });
  } catch (err) {
    console.error("[employees] DELETE failed:", err.message);
    res.status(500).json({ error: "Failed to delete employee." });
  }
});

export default router;
