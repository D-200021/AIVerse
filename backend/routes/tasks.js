import express from "express";
import { reviewTaskOutput } from "../services/gemini.js";

const router = express.Router();

// POST /api/tasks/review
// { employeeId, title, revisionNotes?, roster?: Array<{id,name,role,handles,prompt}> }
// Runs the two-stage AI workflow: the employee actually does the task (real code/text deliverable),
// then the CEO reviews it. Returns { output, approved, feedback, source }.
// A human (the app's user) makes the final call after this — this endpoint
// only covers the employee + CEO stages.
router.post("/review", async (req, res) => {
  try {
    const { employeeId, title, request, revisionNotes, previousOutput, roster } = req.body || {};

    if (!employeeId || typeof employeeId !== "string") {
      return res.status(400).json({ error: "employeeId is required." });
    }
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required." });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "title must be 200 characters or fewer." });
    }
    if (request && (typeof request !== "string" || request.length > 4000)) {
      return res.status(400).json({ error: "request must be a string of 4000 characters or fewer." });
    }
    if (revisionNotes && typeof revisionNotes !== "string") {
      return res.status(400).json({ error: "revisionNotes must be a string." });
    }

    const result = await reviewTaskOutput({
      employeeId,
      title: title.trim(),
      request: request ? request.trim() : null,
      revisionNotes: revisionNotes ? revisionNotes.trim().slice(0, 400) : null,
      previousOutput: typeof previousOutput === "string" ? previousOutput.slice(0, 6000) : null,
      roster,
      apiKey: req.geminiKey,
    });
    res.json(result);
  } catch (err) {
    console.error("[tasks] review failed:", err.message);
    res.status(500).json({ error: "Failed to review task output." });
  }
});

export default router;
