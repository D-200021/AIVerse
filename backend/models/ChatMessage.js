import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "ceo"],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    // Lets a room support multiple simultaneous office instances/sessions.
    // Defaults to "default" so single-office setups need not think about it.
    room: {
      type: String,
      default: "default",
      index: true,
    },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ room: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);
