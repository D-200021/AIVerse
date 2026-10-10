// Honesty note: this sandbox has no network path to a real MongoDB server
// (mongodb-memory-server's binary download is blocked here), so this test
// mocks the Mongoose model's static methods with an in-memory array and
// exercises the actual Express route handlers against it. This verifies
// request validation, status codes, and response shapes — the part of the
// code I actually wrote — while trusting Mongoose/MongoDB itself, which is
// a mature, independently-tested library.

import assert from "node:assert";
import express from "express";
import request from "supertest";

import ChatMessage from "./models/ChatMessage.js";
import EventLog from "./models/EventLog.js";
import Employee from "./models/Employee.js";
import chatRoutes from "./routes/chat.js";
import logRoutes from "./routes/logs.js";
import ceoRoutes from "./routes/ceo.js";
import taskRoutes from "./routes/tasks.js";
import employeeRoutes from "./routes/employees.js";
import User from "./models/User.js";
import authRoutes from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { setGeminiClient } from "./services/llm.js";

process.env.NODE_ENV = "test";
process.env.APP_SECRET = "test-secret-test-secret-123456";

let idCounter = 0;
let userStore = [];
const matches = (doc, q) => Object.entries(q).every(([k, v]) =>
  v && typeof v === "object" && "$gt" in v ? doc[k] > v.$gt : String(doc[k]) === String(v));
User.findOne = async (q) => userStore.find((u) => matches(u, q)) || null;
User.findById = async (id) => userStore.find((u) => u._id === id) || null;
User.create = async (doc) => { const u = { _id: "u" + ++idCounter, tokenVersion: 0, resetTokenHash: null, resetExpires: null, ...doc }; userStore.push(u); return u; };
User.updateOne = async (q, upd) => {
  const u = userStore.find((x) => matches(x, q)); if (!u) return;
  Object.assign(u, upd.$set || {});
  for (const [k, v] of Object.entries(upd.$inc || {})) u[k] = (u[k] || 0) + v;
};

let chatStore = [];
let logStore = [];
let employeeStore = [];

ChatMessage.create = async (doc) => {
  const saved = { _id: "id" + ++idCounter, ...doc, createdAt: new Date() };
  chatStore.push(saved);
  return saved;
};
ChatMessage.find = (query) => ({
  sort: () => ({
    limit: (n) => ({
      lean: async () =>
        chatStore.filter((m) => m.room === query.room).slice(-n),
    }),
  }),
});
ChatMessage.deleteMany = async (query) => {
  chatStore = chatStore.filter((m) => m.room !== query.room);
};

EventLog.create = async (doc) => {
  const saved = { _id: "id" + ++idCounter, ...doc, createdAt: new Date() };
  logStore.push(saved);
  return saved;
};
EventLog.find = (query) => ({
  sort: () => ({
    limit: (n) => ({
      lean: async () =>
        logStore.filter((l) => l.room === query.room).slice(-n).reverse(),
    }),
  }),
});

// --- mock Employee model ---
Employee.find = (query) => ({
  sort: () => ({
    lean: async () => employeeStore
      .filter((e) => e.room === query.room)
      .sort((a, b) => (a.order - b.order) || (a.createdAt - b.createdAt)),
  }),
});
Employee.findOne = async (query) =>
  employeeStore.find((e) => e.room === query.room && e.employeeId === query.employeeId) || null;
Employee.create = async (doc) => {
  const saved = { _id: "id" + ++idCounter, createdAt: new Date(), updatedAt: new Date(), ...doc };
  employeeStore.push(saved);
  return saved;
};
Employee.findOneAndUpdate = async (query, update) => {
  let doc = employeeStore.find((e) => e.room === query.room && e.employeeId === query.employeeId);
  if (doc) {
    Object.assign(doc, update.$set);
    doc.updatedAt = new Date();
  } else {
    doc = { _id: "id" + ++idCounter, createdAt: new Date(), updatedAt: new Date(), ...update.$setOnInsert, ...update.$set };
    employeeStore.push(doc);
  }
  return doc;
};
Employee.deleteOne = async (query) => {
  employeeStore = employeeStore.filter((e) => !(e.room === query.room && e.employeeId === query.employeeId));
};


// Mock Gemini too — no real API key is available in this sandbox, and we
// don't want `npm test` to require one. This proves the actual routing
// code (prompt building, response parsing/sanitizing, dynamic roster
// schema) works, without needing network access or a paid API call.
// IMPORTANT: this mock must be set up BEFORE routes/ceo.js (and therefore
// services/gemini.js) is first required — gemini.js destructures
// GoogleGenAI from the module at its own load time, so mocking it after
// that point would be too late.
const FakeGenAI = class {
  constructor() {
    this.models = {
      generateContent: async ({ contents }) => {
        // Chat routing prompt
        if (contents.includes("Decide how to handle it, then respond")) {
          if (contents.includes("redesign the onboarding")) {
            return { text: JSON.stringify({ isMeeting: false, employeeId: "mia", reply: "Mia's a great fit for this.", title: "Redesign onboarding mockups" }) };
          }
          if (contents.includes("write some SQL")) {
            return { text: JSON.stringify({ isMeeting: false, employeeId: "sam-data", reply: "Sam, our data scientist, is perfect for this.", title: "Write the reporting SQL" }) };
          }
          return { text: JSON.stringify({ isMeeting: false, employeeId: "bogus-id", reply: "", title: "" }) }; // exercises sanitizeRoute()
        }
        // Employee output-generation prompt (plain markdown, not JSON)
        if (contents.includes("Actually do the task now")) {
          if (contents.includes("Custom personality test")) return { text: "Used my meticulous style notes to double-check every edge case." };
          if (contents.includes("hello world in javascript")) return { text: "```js\nconsole.log(\"Hello, World!\");\n```\nRun with `node hello.js`." };
          return { text: "Shipped the updated onboarding flow with three new mockup screens." };
        }
        // CEO review prompt
        if (contents.includes("Decide whether it's good enough to approve")) {
          if (contents.includes("REJECT_ME_FOR_TEST")) {
            return { text: JSON.stringify({ approved: false, feedback: "Needs more detail on the empty state." }) };
          }
          return { text: JSON.stringify({ approved: true, feedback: "Great work, ship it." }) };
        }
        throw new Error("unrecognized prompt in test mock: " + contents.slice(0, 80));
      },
    };
  }
};

setGeminiClient(new FakeGenAI());

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/chat", requireAuth, chatRoutes);
app.use("/api/logs", requireAuth, logRoutes);
app.use("/api/ceo", requireAuth, ceoRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/employees", requireAuth, employeeRoutes);

// Signed-in test client: every call carries the current TOKEN.
let TOKEN = "";
const authed = (token = TOKEN) => {
  const r = request(app);
  return { get: (u) => r.get(u).set("Authorization", "Bearer " + token), post: (u) => r.post(u).set("Authorization", "Bearer " + token),
    put: (u) => r.put(u).set("Authorization", "Bearer " + token), delete: (u) => r.delete(u).set("Authorization", "Bearer " + token) };
};
const KEY = "AIzaSyFakeKeyForTests_1234567890abcdef";

const MIA = { id: "mia", name: "Mia", role: "UX Designer", handles: "design, ux, mockups", prompt: "" };
const JOHN = { id: "john", name: "John", role: "Backend Engineer", handles: "backend, api, infrastructure", prompt: "" };

async function run() {
  // --- chat: validation ---
  let res = await authed().post("/api/chat").send({});
  assert.strictEqual(res.status, 400, "missing sender/text should 400");

  res = await authed().post("/api/chat").send({ sender: "alien", text: "hi" });
  assert.strictEqual(res.status, 400, "invalid sender should 400");

  res = await authed().post("/api/chat").send({ sender: "user", text: "  " });
  assert.strictEqual(res.status, 400, "blank text should 400");

  res = await authed().post("/api/chat").send({ sender: "user", text: "a".repeat(501) });
  assert.strictEqual(res.status, 400, "overlong text should 400");

  // --- chat: happy path ---
  res = await authed().post("/api/chat").send({ sender: "user", text: "Can someone analyze last month's sales?" });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.message.sender, "user");
  assert.ok(res.body.message.room.startsWith("user:"), "messages live in the caller's own partition");

  // A client-supplied room is ignored — nobody can write into someone else's data.
  res = await authed().post("/api/chat").send({ sender: "ceo", text: "On it — Alex is a great fit.", room: "someone-else" });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.message.room.startsWith("user:"));

  res = await authed().get("/api/chat?room=someone-else");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.messages.length, 2, "?room= is ignored; the caller's own history is returned");

  // --- chat: delete ---
  res = await authed().delete("/api/chat");
  assert.strictEqual(res.status, 200);
  res = await authed().get("/api/chat");
  assert.strictEqual(res.body.messages.length, 0, "room should be empty after delete");

  // --- logs: validation ---
  res = await authed().post("/api/logs").send({});
  assert.strictEqual(res.status, 400);

  // --- logs: happy path + ordering (newest first) ---
  await authed().post("/api/logs").send({ text: "**Emma** started a task." });
  await authed().post("/api/logs").send({ text: "**Emma** completed a task." });
  res = await authed().get("/api/logs?limit=8");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.logs.length, 2);
  assert.strictEqual(res.body.logs[0].text, "**Emma** completed a task.", "newest log should be first");

  console.log("ALL BACKEND ROUTE TESTS PASSED");
}

async function runAuthTests() {
  const anon = () => request(app);
  const good = { name: "Ada", email: "Ada@Example.com", password: "hunter2hunter2", geminiKey: KEY };

  // validation
  let res = await anon().post("/api/auth/signup").send({ ...good, name: "" });
  assert.strictEqual(res.status, 400, "name required");
  res = await anon().post("/api/auth/signup").send({ ...good, email: "nope" });
  assert.strictEqual(res.status, 400, "email must be valid");
  res = await anon().post("/api/auth/signup").send({ ...good, password: "short1" });
  assert.strictEqual(res.status, 400, "password too short");
  res = await anon().post("/api/auth/signup").send({ ...good, password: "onlyletters" });
  assert.strictEqual(res.status, 400, "password needs a digit");
  res = await anon().post("/api/auth/signup").send({ ...good, geminiKey: "" });
  assert.strictEqual(res.status, 400, "Gemini key required at signup");

  // a key Google rejects blocks signup
  setGeminiClient({ models: { generateContent: async () => { throw new Error("400 API key not valid. Please pass a valid API key."); } } });
  res = await anon().post("/api/auth/signup").send(good);
  assert.strictEqual(res.status, 400);
  assert.ok(/rejected/i.test(res.body.error));
  setGeminiClient(new FakeGenAI());

  // success: token returned, key stored ENCRYPTED, password hashed
  res = await anon().post("/api/auth/signup").send(good);
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.email, "ada@example.com");
  assert.strictEqual(res.body.user.hasGeminiKey, true);
  const stored = userStore.find((u) => u.email === "ada@example.com");
  assert.ok(!stored.geminiKeyEnc.includes(KEY), "Gemini key must not be stored in plain text");
  assert.ok(stored.passwordHash.startsWith("scrypt$") && !stored.passwordHash.includes("hunter2"));
  TOKEN = res.body.token;

  res = await anon().post("/api/auth/signup").send({ ...good, email: "ada@example.com" });
  assert.strictEqual(res.status, 409, "duplicate email");

  // login
  res = await anon().post("/api/auth/login").send({ email: "ada@example.com", password: "wrong-password1" });
  assert.strictEqual(res.status, 401);
  res = await anon().post("/api/auth/login").send({ email: "nobody@example.com", password: "hunter2hunter2" });
  assert.strictEqual(res.status, 401);
  res = await anon().post("/api/auth/login").send({ email: "ADA@example.com", password: "hunter2hunter2" });
  assert.strictEqual(res.status, 200);

  // protected routes
  res = await anon().get("/api/employees");
  assert.strictEqual(res.status, 401, "no token -> 401");
  res = await anon().get("/api/employees").set("Authorization", "Bearer garbage");
  assert.strictEqual(res.status, 401, "bad token -> 401");
  res = await authed().get("/api/auth/me");
  assert.strictEqual(res.body.user.name, "Ada");

  // per-user data isolation
  await authed().post("/api/employees").send({ name: "Ada Agent", role: "Tester" });
  res = await anon().post("/api/auth/signup").send({ name: "Bob", email: "bob@example.com", password: "password123", geminiKey: KEY });
  const bobToken = res.body.token;
  res = await authed(bobToken).get("/api/employees");
  assert.strictEqual(res.body.employees.length, 0, "Bob must not see Ada's agents");
  await authed(bobToken).post("/api/chat").send({ sender: "user", text: "bob only" });
  res = await authed().get("/api/chat");
  assert.ok(!res.body.messages.some((m) => m.text === "bob only"), "Ada must not see Bob's chat");
  res = await authed().get("/api/employees");
  assert.strictEqual(res.body.employees.length, 1);

  // forgot / reset password
  res = await anon().post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
  assert.strictEqual(res.status, 200);
  assert.ok(!res.body.devResetLink, "no link leaked for unknown emails");
  res = await anon().post("/api/auth/forgot-password").send({ email: "ada@example.com" });
  assert.strictEqual(res.status, 200);
  const link = res.body.devResetLink;
  assert.ok(link && link.includes("/#/reset?token="), "dev link returned outside production");
  const resetToken = new URL(link.replace("/#/", "/")).searchParams.get("token");
  res = await anon().post("/api/auth/reset-password").send({ token: "bad", password: "newpass1234" });
  assert.strictEqual(res.status, 400);
  res = await anon().post("/api/auth/reset-password").send({ token: resetToken, password: "short" });
  assert.strictEqual(res.status, 400);
  res = await anon().post("/api/auth/reset-password").send({ token: resetToken, password: "newpass1234" });
  assert.strictEqual(res.status, 200);
  res = await anon().post("/api/auth/reset-password").send({ token: resetToken, password: "another1234" });
  assert.strictEqual(res.status, 400, "reset link is single-use");
  res = await authed().get("/api/auth/me");
  assert.strictEqual(res.status, 401, "old sessions end after a password reset");
  res = await anon().post("/api/auth/login").send({ email: "ada@example.com", password: "newpass1234" });
  assert.strictEqual(res.status, 200);
  TOKEN = res.body.token;

  // update Gemini key
  res = await authed().put("/api/auth/me/gemini-key").send({ geminiKey: "short" });
  assert.strictEqual(res.status, 400);
  res = await authed().put("/api/auth/me/gemini-key").send({ geminiKey: "AIzaSyAnotherFakeKey_0987654321zyxwv" });
  assert.strictEqual(res.status, 200);

  // wipe Ada's test agent so later suites start clean
  employeeStore = []; chatStore = []; logStore = [];
  console.log("ALL AUTH TESTS PASSED");
}

async function runCeoTests() {
  // --- /api/ceo/route: validation ---
  let res = await authed().post("/api/ceo/route").send({});
  assert.strictEqual(res.status, 400, "missing text should 400");

  res = await authed().post("/api/ceo/route").send({ text: "   " });
  assert.strictEqual(res.status, 400, "blank text should 400");

  // --- Gemini failing: keyword fallback, using a caller-supplied roster ---
  setGeminiClient({ models: { generateContent: async () => { throw new Error("503 unavailable"); } } });
  res = await authed().post("/api/ceo/route").send({ text: "Let's get everyone together for a standup", roster: [MIA, JOHN] });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.isMeeting, true);
  assert.strictEqual(res.body.source, "keyword-fallback");

  res = await authed().post("/api/ceo/route").send({ text: "Can someone fix the API infrastructure", roster: [MIA, JOHN] });
  assert.strictEqual(res.body.employeeId, "john", "keyword fallback should derive keywords from the roster's own handles field");

  // --- keyword fallback works for a totally custom, user-added agent too ---
  const CUSTOM = { id: "sam-data", name: "Sam", role: "Data Scientist", handles: "sql, dashboards, reporting, data pipelines", prompt: "" };
  res = await authed().post("/api/ceo/route").send({ text: "can someone write a reporting dashboard query", roster: [MIA, JOHN, CUSTOM] });
  assert.strictEqual(res.body.employeeId, "sam-data", "a fully custom agent should be routable via its own handles, with no hardcoded knowledge of them");

  // --- Gemini healthy: real Gemini code path (mocked client) ---
  setGeminiClient(new FakeGenAI());
    res = await authed().post("/api/ceo/route").send({ text: "Can someone redesign the onboarding mockups?", roster: [MIA, JOHN] });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.source, "gemini");
  assert.strictEqual(res.body.employeeId, "mia");
  assert.strictEqual(res.body.title, "Redesign onboarding mockups");

  // --- Gemini can also route to a custom agent (schema enum built from the live roster) ---
  res = await authed().post("/api/ceo/route").send({ text: "can someone write some SQL for the dashboard", roster: [MIA, JOHN, CUSTOM] });
  assert.strictEqual(res.body.employeeId, "sam-data");

  // --- malformed Gemini response gets sanitized, not passed through raw ---
  res = await authed().post("/api/ceo/route").send({ text: "some other request", roster: [MIA, JOHN] });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.employeeId, null, "an employeeId Gemini invented outside the roster should be dropped");
  assert.strictEqual(res.body.title, "New task", "an empty title from Gemini should fall back to a default");

  // --- no roster provided at all still works (uses the internal fallback roster) ---
  res = await authed().post("/api/ceo/route").send({ text: "Can someone redesign the onboarding mockups?" });
  assert.strictEqual(res.status, 200);

  console.log("ALL CEO/GEMINI ROUTE TESTS PASSED");
}

async function runTaskReviewTests() {
  
  // --- validation ---
  let res = await authed().post("/api/tasks/review").send({});
  assert.strictEqual(res.status, 400, "missing employeeId should 400");

  res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "" });
  assert.strictEqual(res.status, 400, "blank title should 400");

  // --- happy path: Gemini approves first try ---
  res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "Redesign onboarding", roster: [MIA] });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.source, "gemini");
  assert.strictEqual(res.body.approved, true);
  assert.ok(res.body.output.includes("onboarding flow"), "output should come from the mocked Gemini call");

  // --- the real request text reaches the model, and real code comes back ---
  res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "Hello world", request: "write hello world in javascript", roster: [MIA] });
  assert.ok(res.body.output.includes("console.log"), "output should contain the actual code");
  assert.ok(res.body.output.includes("```js"), "code should be in a fenced block");

  // --- CEO requests a revision ---
  res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "REJECT_ME_FOR_TEST", roster: [MIA] });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.approved, false);
  assert.ok(res.body.feedback.length > 0, "a revision request should come with feedback");

  // --- an employee's own `prompt` field (not a separate param anymore) shapes the output ---
  const CUSTOM_MIA = { ...MIA, prompt: "Custom personality test" };
  res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "Redesign onboarding", roster: [CUSTOM_MIA] });
  assert.strictEqual(res.body.output, "Used my meticulous style notes to double-check every edge case.");

  // --- works for a fully custom agent not in any hardcoded list ---
  res = await authed().post("/api/tasks/review").send({
    employeeId: "sam-data", title: "Write the reporting SQL",
    roster: [{ id: "sam-data", name: "Sam", role: "Data Scientist", handles: "sql, dashboards", prompt: "" }],
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.source, "gemini");

  console.log("ALL TASK REVIEW TESTS PASSED");
}

async function runGeminiFailureTests() {
    setGeminiClient({ models: { generateContent: async () => { throw new Error("429 quota exceeded"); } } });
  try {
    // Chat routing falls back to keywords
    let res = await authed().post("/api/ceo/route").send({ text: "Can someone fix the API outage" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.source, "keyword-fallback");

    // Task output says plainly that the AI is unavailable instead of faking a result
    res = await authed().post("/api/tasks/review").send({ employeeId: "mia", title: "t", roster: [MIA] });
    assert.strictEqual(res.body.source, "keyword-fallback");
    assert.ok(res.body.output.includes("unavailable"));
    console.log("ALL GEMINI FAILURE TESTS PASSED");
  } finally {
    setGeminiClient(new FakeGenAI());
  }
}

async function runEmployeeCrudTests() {
  // --- validation ---
  let res = await authed().post("/api/employees").send({ name: "", role: "Engineer" });
  assert.strictEqual(res.status, 400, "blank name should 400");

  res = await authed().post("/api/employees").send({ name: "Sam", role: "" });
  assert.strictEqual(res.status, 400, "blank role should 400");

  res = await authed().post("/api/employees").send({ name: "Sam", role: "Data Scientist", color: "not-a-hex" });
  assert.strictEqual(res.status, 400, "invalid color should 400");

  res = await authed().post("/api/employees").send({ name: "Sam", role: "Data Scientist", hair: "mohawk" });
  assert.strictEqual(res.status, 400, "invalid hair enum should 400");

  // --- create with auto-generated id ---
  res = await authed().post("/api/employees").send({ name: "Sam Data", role: "Data Scientist", handles: "sql, dashboards" });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.employee.employeeId.startsWith("sam-data-"), "id should be slugified from the name");
  const samId = res.body.employee.employeeId;

  // --- create with an explicit id (how the default roster gets seeded) ---
  res = await authed().post("/api/employees").send({ employeeId: "emma", name: "Emma", role: "Product Coordinator" });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.employee.employeeId, "emma");

  // --- duplicate explicit id in the same room should conflict ---
  res = await authed().post("/api/employees").send({ employeeId: "emma", name: "Emma Two", role: "Something Else" });
  assert.strictEqual(res.status, 409, "creating a duplicate employeeId in the same room should conflict");

  // --- list ---
  res = await authed().get("/api/employees");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.employees.length, 2);

  // --- update (existing doc) ---
  res = await authed().put(`/api/employees/${samId}`).send({ prompt: "Loves clean dashboards." });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.employee.prompt, "Loves clean dashboards.");
  assert.strictEqual(res.body.employee.name, "Sam Data", "updating one field shouldn't clobber others");

  // --- update (upsert semantics: editing a never-before-saved default) ---
  res = await authed().put("/api/employees/john").send({ name: "John", role: "Backend Engineer", prompt: "Ships fast." });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.employee.employeeId, "john");

  res = await authed().get("/api/employees");
  assert.strictEqual(res.body.employees.length, 3, "the upserted john should now show up in the list");

  // --- delete ---
  res = await authed().delete(`/api/employees/${samId}`);
  assert.strictEqual(res.status, 200);
  res = await authed().get("/api/employees");
  assert.strictEqual(res.body.employees.length, 2);
  assert.ok(!res.body.employees.find((e) => e.employeeId === samId), "deleted employee should be gone");

  console.log("ALL EMPLOYEE CRUD TESTS PASSED");
}

runAuthTests()
  .then(run)
  .then(runCeoTests)
  .then(runTaskReviewTests)
  .then(runGeminiFailureTests)
  .then(runEmployeeCrudTests)
  .catch((err) => {
    console.error("TEST FAILED:", err.stack);
    process.exit(1);
  });
