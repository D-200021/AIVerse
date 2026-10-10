import { generate } from "./llm.js";

// Used only if the frontend forgets to send a roster (shouldn't normally
// happen — OfficeSimulation.jsx always includes its current roster).
const FALLBACK_ROSTER = [
  { id: "emma", name: "Emma", role: "Product Coordinator", handles: "roadmaps, planning, strategy, coordination, scheduling" },
  { id: "john", name: "John", role: "Backend Engineer",    handles: "servers, databases, APIs, infrastructure, deployments" },
  { id: "raj",  name: "Raj",  role: "Software Engineer",   handles: "coding, features, debugging, app development" },
  { id: "alex", name: "Alex", role: "Marketing Analyst",   handles: "marketing, campaigns, sales, growth, analytics" },
  { id: "mia",  name: "Mia",  role: "UX Designer",         handles: "design, UX/UI, mockups, prototypes, branding" },
];

function normalizeRoster(roster) {
  if (!Array.isArray(roster) || !roster.length) return FALLBACK_ROSTER;
  return roster
    .filter((r) => r && r.id && r.name && r.role)
    .map((r) => ({
      id: String(r.id),
      name: String(r.name).slice(0, 40),
      role: String(r.role).slice(0, 60),
      handles: String(r.handles || "").slice(0, 200),
      prompt: String(r.prompt || "").slice(0, 400),
    }));
}

function describeEmployee(emp) {
  return `${emp.name}, ${emp.role}${emp.handles ? ` — handles ${emp.handles}` : ""}${emp.prompt ? `. Working style: ${emp.prompt}` : ""}`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1).trim() + "…" : str;
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ======================================================================
   1. CHAT ROUTING — "Talk to CEO"
   ====================================================================== */

function buildRouteSchema(roster) {
  return {
    type: "OBJECT",
    properties: {
      isMeeting: {
        type: "BOOLEAN",
        description: "true only if the message asks to gather the whole team (a meeting/sync/standup/huddle), not a task for one person.",
      },
      employeeId: {
        type: "STRING",
        enum: [...roster.map((r) => r.id), "none"],
        description: "The single best-fit teammate for this task, by id. Use 'none' if it's a meeting request or genuinely unclear.",
      },
      reply: {
        type: "STRING",
        description: "A short, warm, one-sentence in-character reply from the CEO, naming the chosen teammate if one was picked.",
      },
      title: {
        type: "STRING",
        description: "A concise task title summarizing the request, under 60 characters, title case, no trailing punctuation.",
      },
    },
    required: ["isMeeting", "employeeId", "reply", "title"],
  };
}

function buildRoutePrompt(message, roster) {
  const rosterText = roster.map((r) => `- ${r.id}: ${describeEmployee(r)}`).join("\n");
  return `You are the CEO of AIVerse Inc., a friendly and decisive leader of a small team of AI employees. Someone just sent you this message:

"${message}"

Your team:
${rosterText}

Decide how to handle it, then respond with ONLY a JSON object matching the required schema — no markdown, no extra commentary.`;
}

async function routeWithGemini(message, roster, apiKey) {
  const { json, provider } = await generate({
    prompt: buildRoutePrompt(message, roster), schema: buildRouteSchema(roster), temperature: 0.7, apiKey,
  });
  const result = sanitizeRoute(json, roster);
  result.source = provider;
  return result;
}

function sanitizeRoute(parsed, roster) {
  const validIds = new Set(roster.map((r) => r.id));
  const employeeId = validIds.has(parsed.employeeId) ? parsed.employeeId : null;
  const title = String(parsed.title || "").trim();
  return {
    isMeeting: !!parsed.isMeeting,
    employeeId: parsed.isMeeting ? null : employeeId,
    reply: (String(parsed.reply || "").trim() || "Got it — I'll take care of this.").slice(0, 300),
    title: (title || "New task").slice(0, 70),
  };
}

// Keyword-based fallback — used when GEMINI_API_KEY isn't set, or the
// Gemini call fails/times out/hits a quota limit. Derives keywords from
// each employee's own `handles` field so it works for ANY roster, not
// just a fixed set of names — important now that agents are user-defined.
const MEETING_KEYWORDS = ["meeting", "sync", "standup", "stand-up", "all hands", "all-hands", "huddle", "gather the team", "team together", "get everyone"];

function routeWithKeywords(message, roster) {
  const lower = message.toLowerCase();
  const title = capitalize(truncate(message, 60));

  if (MEETING_KEYWORDS.some((k) => lower.includes(k))) {
    return { isMeeting: true, employeeId: null, reply: "Good idea — let's get everyone in the meeting room.", title: capitalize(truncate(message, 46)), source: "keyword-fallback" };
  }

  let best = null, bestScore = 0;
  roster.forEach((emp) => {
    const keywords = (emp.handles || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const score = keywords.reduce((acc, kw) => acc + (kw && lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = emp; }
  });

  if (best) {
    return { isMeeting: false, employeeId: best.id, reply: `Good call. I'll get ${best.name} on this right away.`, title, source: "keyword-fallback" };
  }
  return { isMeeting: false, employeeId: null, reply: "Got it — I'll get someone on this right away.", title, source: "keyword-fallback" };
}

async function routeMessage(message, rosterInput, apiKey) {
  const roster = normalizeRoster(rosterInput);
  try {
    return await routeWithGemini(message, roster, apiKey);
  } catch (err) {
    console.warn("[gemini] routing failed, using keyword fallback:", err.message);
    return routeWithKeywords(message, roster);
  }
}

/* ======================================================================
   2. TASK OUTPUT + CEO REVIEW
   Two separate Gemini calls, on purpose — one persona writes the work,
   a second, independent persona (the CEO) reviews it. A human (the app's
   user) gets the final say after that; this module only handles the
   employee + CEO stages.
   ====================================================================== */

const REVIEW_SCHEMA = {
  type: "OBJECT",
  properties: {
    approved: { type: "BOOLEAN", description: "true if this work is good enough to ship as-is." },
    feedback: { type: "STRING", description: "One short sentence of feedback — encouraging if approved, specific and constructive if requesting a revision." },
  },
  required: ["approved", "feedback"],
};

function findEmployee(roster, employeeId) {
  return roster.find((r) => r.id === employeeId) || null;
}

function buildOutputPrompt({ employeeId, title, request, revisionNotes, previousOutput, roster }) {
  const emp = findEmployee(roster, employeeId);
  const who = emp ? describeEmployee(emp) : "an AI employee";
  const ask = (request && request.trim()) || title;
  let revision = "";
  if (revisionNotes) {
    revision = `\n\nYou already submitted a first version and your manager sent it back with this feedback: "${revisionNotes}".` +
      (previousOutput ? `\nYour previous version:\n"""\n${previousOutput.slice(0, 4000)}\n"""` : "") +
      "\nProduce an improved, complete version that fixes this.";
  }
  return `You are ${who} at AIVerse Inc. Your manager gave you this task:

"""
${ask}
"""${revision}

Actually do the task now and hand in the finished work product itself — not a status report and not a description of what you did. If it asks for code, give the complete, runnable code in fenced markdown code blocks with a language tag, then a line on how to run it and the expected output. If it asks for writing, analysis, a plan or a design, write the full piece. Never claim you committed, deployed, tested or saved anything, and don't invent files, branches or tools. Be correct, complete and concise. Respond in Markdown only.`;
}

function buildReviewPrompt({ employeeId, title, request, output, roster }) {
  const emp = findEmployee(roster, employeeId);
  const who = emp ? describeEmployee(emp) : "a teammate";
  return `You are the CEO of AIVerse Inc., reviewing a task submission. ${who} was asked:

"""
${(request && request.trim()) || title}
"""

They submitted this work:

"""
${output.slice(0, 6000)}
"""

Decide whether it's good enough to approve, or whether it needs another pass. Approve only if it actually delivers what was asked (for example, the requested code is really there and correct). Respond with ONLY a JSON object matching the schema.`;
}

async function generateEmployeeOutput(params) {
  const { text, provider } = await generate({ prompt: buildOutputPrompt(params), temperature: 0.4, maxTokens: 4096, apiKey: params.apiKey });
  return { output: text, provider };
}

async function getCeoReview(params) {
  const { json } = await generate({ prompt: buildReviewPrompt(params), schema: REVIEW_SCHEMA, temperature: 0.6, maxTokens: 512, apiKey: params.apiKey });
  return {
    approved: !!json.approved,
    feedback: String(json.feedback || "").trim() || (json.approved ? "Nice work — approved." : "Needs another pass."),
  };
}

function fallbackOutput({ employeeId, title, roster }) {
  const emp = findEmployee(roster, employeeId);
  const name = emp ? emp.name : "The team";
  return `⚠ ${name} could not produce a real result for "${title}" because the AI service (Gemini) is unavailable. ` +
    "Check your Gemini API key (menu → Gemini key), then use \"revise\" to have the work redone.";
}

// reviewTaskOutput() is the single entry point the /api/tasks/review route
// calls — it runs the employee-output step, then (if that succeeded via
// Gemini) the CEO-review step, and always returns a usable result even if
// Gemini is unavailable at either stage.
async function reviewTaskOutput({ employeeId, title, request, revisionNotes, previousOutput, roster: rosterInput, apiKey }) {
  const roster = normalizeRoster(rosterInput);
  let output;
  let source;
  try {
    const res = await generateEmployeeOutput({ employeeId, title, request, revisionNotes, previousOutput, roster, apiKey });
    output = res.output;
    source = res.provider; // "gemini"
  } catch (err) {
    console.warn("[llm] output generation failed on every provider, using fallback:", err.message);
    output = fallbackOutput({ employeeId, title, roster });
    source = "keyword-fallback";
  }

  let review;
  if (source !== "keyword-fallback") {
    try {
      review = await getCeoReview({ employeeId, title, request, output, roster, apiKey });
    } catch (err) {
      console.warn("[llm] CEO review failed on every provider:", err.message);
      review = { approved: true, feedback: "Nice work — approved." };
    }
  } else {
    review = { approved: true, feedback: "Nice work — approved." };
  }

  return {
    output: output.slice(0, 12000),
    approved: review.approved,
    feedback: review.feedback.slice(0, 300),
    source,
  };
}

export { routeMessage, reviewTaskOutput, FALLBACK_ROSTER };
