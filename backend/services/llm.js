// Single entry point for AI calls (Google Gemini). Routing, task output and
// CEO review all go through generate() so the provider lives in one place.
import { GoogleGenAI } from "@google/genai";

const MODEL = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Created lazily so a missing API key doesn't crash the server at boot —
// callers fall back to keyword routing / a clear "AI unavailable" message.
let client = null;
function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// Test seam: lets tests inject a fake client instead of calling the network.
export function setGeminiClient(fake) {
  client = fake;
}

export function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a === -1 || b <= a) throw new Error("no JSON object in model response");
  return JSON.parse(cleaned.slice(a, b + 1));
}

// generate({ prompt, schema?, temperature?, maxTokens? }) -> { text, json?, provider }
// With `schema`, Gemini is asked for JSON and the parsed object is returned as `json`.
export async function generate({ prompt, schema = null, temperature = 0.5, maxTokens }) {
  const ai = getGemini();
  if (!ai) throw new Error("GEMINI_API_KEY not configured");
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

export function status() {
  return { provider: "gemini", configured: !!process.env.GEMINI_API_KEY, model: MODEL() };
}
