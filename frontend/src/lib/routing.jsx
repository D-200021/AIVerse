import React from "react";
import { MEETING_KEYWORDS, CEO_MEETING_REPLIES, CEO_ASSIGN_REPLIES, CEO_GENERIC_REPLIES } from "../config/copy.js";
import { pickRandom, truncate, capitalize } from "./format.js";

export function isMeetingRequest(text) {
  const lower = text.toLowerCase();
  return MEETING_KEYWORDS.some((k) => lower.includes(k));
}

// Derives routing keywords from each employee's own `handles` field, so
// this works for any roster — including agents a person just added from
// the Employees tab, which obviously can't have hardcoded keyword lists.
export function routeEmployeeForMessage(text, roster) {
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  roster.forEach((emp) => {
    const keywords = (emp.handles || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    const score = keywords.reduce((acc, kw) => acc + (kw && lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = emp.id; }
  });
  return bestScore > 0 ? best : null;
}

// Fully local fallback for when the backend (and therefore Gemini) is
// unreachable — keeps "Talk to CEO" working offline, just less smart.
// Returns the same shape the backend's /api/ceo/route endpoint does.
export function localRouteMessage(text, roster) {
  if (isMeetingRequest(text)) {
    return { isMeeting: true, employeeId: null, reply: pickRandom(CEO_MEETING_REPLIES), title: capitalize(truncate(text, 46)) };
  }
  const routedId = routeEmployeeForMessage(text, roster);
  const title = capitalize(truncate(text, 60));
  if (routedId) {
    const cfg = roster.find((c) => c.id === routedId);
    return { isMeeting: false, employeeId: routedId, reply: pickRandom(CEO_ASSIGN_REPLIES)(cfg.name), title };
  }
  return { isMeeting: false, employeeId: null, reply: pickRandom(CEO_GENERIC_REPLIES), title };
}

// Renders "**bold**" segments as <b>, safely (no HTML injection — this
// also covers task titles that may contain raw user chat input).
export function renderMarkup(text) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? <b key={i} className="text-brick">{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}
