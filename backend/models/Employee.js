import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    room: { type: String, default: "default", index: true },
    employeeId: { type: String, required: true },

    name: { type: String, required: true, trim: true, maxlength: 40 },
    role: { type: String, required: true, trim: true, maxlength: 60 },
    // Comma-separated words/phrases describing what they handle — used both
    // as context for Gemini and as the keyword-fallback routing signal.
    handles: { type: String, default: "", trim: true, maxlength: 200 },
    // Optional "working style" / personality note, folded into Gemini prompts.
    prompt: { type: String, default: "", trim: true, maxlength: 400 },

    color: { type: String, default: "#7c93ff" },
    hair: { type: String, enum: ["short", "long", "bob", "spiky"], default: "short" },
    // Multiplier on task duration: <1 finishes faster, >1 takes longer.
    speed: { type: Number, default: 1, min: 0.5, max: 2 },

    // Stable ordering for desk layout, independent of insertion order.
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EmployeeSchema.index({ room: 1, employeeId: 1 }, { unique: true });
EmployeeSchema.index({ room: 1, order: 1 });

export default mongoose.model("Employee", EmployeeSchema);
