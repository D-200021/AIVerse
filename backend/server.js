import "dotenv/config";
import { pathToFileURL } from "node:url";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { connectDB } from "./config/db.js";
import { status as aiStatus } from "./services/llm.js";
import chatRoutes from "./routes/chat.js";
import logRoutes from "./routes/logs.js";
import ceoRoutes from "./routes/ceo.js";
import taskRoutes from "./routes/tasks.js";
import employeeRoutes from "./routes/employees.js";
import rateLimit from "express-rate-limit";

const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
  res.removeHeader("x-powered-by");
  next();
});
app.use(helmet());
app.use(limiter);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // lock this down to your frontend's URL in production
  })
);
app.use(express.json({ limit: "50kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, ai: aiStatus() }));
app.use("/api/chat", chatRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/ceo", ceoRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/employees", employeeRoutes);

// Fallback error handler for anything that slips past route-level try/catch.
app.use((err, req, res, next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ error: "Something went wrong." });
});

app.use(express.static(path.join(__dirname, "frontend", "dist")));

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "frontend", "dist", "index.html")
  );
});


async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[server] AIVerse Inc. backend listening on port ${PORT}`);
  });
}

// Only auto-start when run directly (keeps this file testable/importable).
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  start().catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
}

export { app, start };
