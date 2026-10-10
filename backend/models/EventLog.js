import mongoose from "mongoose";

const EventLogSchema = new mongoose.Schema(
  {
    // May contain "**bold**" markup, same convention the frontend renders.
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    room: {
      type: String,
      default: "default",
      index: true,
    },
  },
  { timestamps: true }
);

EventLogSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model("EventLog", EventLogSchema);
