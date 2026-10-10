// Random idle "thinking" lines — employees only, never the CEO, so the
// team feels varied/alive while idle without making the CEO's presence
// noisy or unpredictable.
export const IDLE_THOUGHT_LINES = [
  "Just tidying up my desktop icons.",
  "Reading through my notes again.",
  "Double-checking my last commit... looks good.",
  "Wonder what's for lunch today.",
  "Reorganizing my task list.",
  "Stretching for a second. 🙆",
  "Humming something I can't quite place.",
  "Refactoring this in my head before I type it.",
  "Just replying to a quick message.",
  "Staring at this for a second longer than I should.",
];

export const GOSSIP_LINES = [
  "Did you hear? We might get a GPU upgrade next sprint. 🚀",
  "I heard a new project is coming... 👀",
  "The CEO seems extra chipper today.",
  "Anyone else's training data feel a little stale lately?",
  "I still think our roadmap needs more coffee breaks in it.",
  "Mia's new mockups are actually really good, don't tell her I said that.",
  "Raj has been \"debugging\" for two hours. Suspicious.",
  "Great ideas really do start with a coffee break.",
  "Do you think the CEO reads all our status reports?",
  "Someone left the good mugs in the sink again.",
  "Q2 is going to be a big one, I can feel it.",
];

export const CEO_LINES = [
  "Let's make AIVerse greater!",
  "Great ideas start with a coffee break.",
  "Ship it, iterate, repeat.",
  "People and AI, building tomorrow — together.",
  "Nice work out there today, team.",
  "Keep the momentum going!",
];

export const CEO_BRIEF_LINES = [
  "Here's your next task — you've got this.",
  "This one's important, take your time.",
  "I trust your judgment on this one.",
  "Straightforward task, should be quick.",
];

export const CEO_ASSIGN_REPLIES = [
  (n) => `Good call. I'll get ${n} on this right away.`,
  (n) => `Consider it done — ${n} is a great fit for this.`,
  (n) => `On it. ${n} has a good eye for this kind of thing.`,
  (n) => `Smart move, I'll brief ${n} now.`,
];
export const CEO_GENERIC_REPLIES = [
  "Got it — I'll get someone on this right away.",
  "Understood. Adding this to the queue now.",
  "Noted. I'll find the right person for this one.",
];
export const CEO_MEETING_REPLIES = [
  "Good idea — let's get everyone in the meeting room.",
  "Agreed. Calling a quick team meeting now.",
  "Let's huddle up. Gathering the team.",
];

export const MEETING_KEYWORDS = ["meeting", "sync", "standup", "stand-up", "all hands", "all-hands", "huddle", "gather the team", "team together", "get everyone"];

export const QUOTES = [
  { text: "Great ideas often start with a coffee break.", author: "AIVerse Inc." },
  { text: "People and AI, building tomorrow together.", author: "AIVerse Inc." },
  { text: "A task delegated well is a task done well.", author: "AIVerse Inc." },
  { text: "Progress bars are just tiny victories in disguise.", author: "AIVerse Inc." },
  { text: "Every gossip session is secretly a team sync.", author: "AIVerse Inc." },
];

export const INITIAL_TASKS = []; // no starter tasks — everything comes from the user
