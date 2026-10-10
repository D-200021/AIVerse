import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true },
    // The user's own Gemini API key, AES-256-GCM encrypted (see services/crypto.js).
    geminiKeyEnc: { type: String, default: "" },
    // Bumping this invalidates every previously issued login token (password reset).
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String, default: null },
    resetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
