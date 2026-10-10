// Single entry point for AI calls (Google Gemini). Routing, task output and
// CEO review all go through generate() so the provider lives in one place.
import { GoogleGenAI } from "@google/genai";

const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

// One client per API key (each user brings their own), cached in a small LRU-ish map.
const clients = new Map();
let injected = null;
function clientFor(apiKey) {
  if (injected) return injected;
  if (!apiKey) throw new Error("No Gemini API key on this account");
  let c = clients.get(apiKey);
  if (!c) {
    c = new GoogleGenAI({ apiKey });
    clients.set(apiKey, c);
    if (clients.size > 50) clients.delete(clients.keys().next().value);
  }
  return c;
}

// Test seam: lets tests inject a fake client instead of calling the network.
export function setGeminiClient(fake) {
  injected = fake;
}

export function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a === -1 || b <= a) throw new Error("no JSON object in model response");
  return JSON.parse(cleaned.slice(a, b + 1));
}

// generate({ prompt, schema?, temperature?, maxTokens?, apiKey }) -> { text, json?, provider }
// With `schema`, Gemini is asked for JSON and the parsed object is returned as `json`.
export async function generate({ prompt, schema = null, temperature = 0.5, maxTokens, apiKey }) {
  const ai = clientFor(apiKey);
  const config = { temperature };
  if (maxTokens) config.maxOutputTokens = maxTokens;
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }
  const response = await ai.models.generateContent({ model: MODEL(), contents: prompt, config });
  const text = String(response.text || "").trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return { text, json: schema ? extractJson(text) : undefined, provider: "gemini" };
}

// Checks a user-supplied key with a tiny request. Only a clearly rejected key fails;
// network/quota/5xx problems return { ok: true, unverified: true } so signup isn't blocked.
export async function validateGeminiKey(apiKey) {
  try {
    const ai = clientFor(apiKey);
    await ai.models.generateContent({ model: MODEL(), contents: "Reply with the single word OK.", config: { maxOutputTokens: 8 } });
    return { ok: true };
  } catch (err) {
    const msg = String(err?.message || err);
    if (/API[_ ]KEY[_ ]INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED|\b(400|401|403)\b/i.test(msg) && !/quota|rate/i.test(msg)) {
      return { ok: false, reason: "That Gemini API key was rejected by Google. Check it and try again." };
    }
    return { ok: true, unverified: true };
  }
}

export function status() {
  return { provider: "gemini", model: MODEL(), keySource: "per-user" };
}
