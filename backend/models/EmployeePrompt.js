import mongoose from "mongoose";

const EmployeePromptSchema = new mongoose.Schema(
  {
    room: { type: String, default: "default", index: true },
    employeeId: { type: String, required: true },
    prompt: { type: String, required: true, trim: true, maxlength: 400 },
  },
  { timestamps: true }
);

EmployeePromptSchema.index({ room: 1, employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeePrompt", EmployeePromptSchema);
