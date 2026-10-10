import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api.js";
import { pickRandom, formatTime } from "../lib/format.js";
import { localRouteMessage } from "../lib/routing.jsx";
import { DEFAULT_ROSTER, AVATAR_COLORS, pickHairColorFor } from "../config/roster.js";
import {
  IDLE_THOUGHT_LINES, GOSSIP_LINES, CEO_LINES, CEO_BRIEF_LINES, INITIAL_TASKS,
} from "../config/copy.js";
import {
  CEO_SEAT, CEO_VISIT, COFFEE_SPOTS, MEET_HEAD, MAX_AGENTS,
  deskLayout, meetingSeats, route,
} from "./layout.js";

const TOOL_LINES = [
  "Reading the brief", "Searching notes", "Drafting an outline", "Running the numbers",
  "Writing the first pass", "Checking sources", "Polishing the output", "Cross-checking facts",
];
const WALK_SPEED = 4.6; // tiles / second
const uid = () => Math.random().toString(36).slice(2, 9);
const statusOf = (a) => (a.state === "idle" ? "awaiting" : a.state);

// The whole simulation lives here, free of React and free of rendering. The
// Pixi stage reads agents/envelopes every frame; React reads snapshots.
export class OfficeEngine {
  constructor({ apiBase, roomId }) {
    this.apiBase = apiBase; this.roomId = roomId;
    this.listeners = new Set();
    this.t = 0; this.sched = []; this.lastEmit = 0; this.dirty = true;
    this.agents = new Map();
    this.ceo = { id: "ceo", name: "Michael", role: "CEO", color: "#b3202a", hair: "short", hairColor: "#3a2a20", x: CEO_SEAT.x, y: CEO_SEAT.y, face: "down", sitting: true, state: "idle", loc: CEO_SEAT, path: [], line: "Runs the floor", speed: 1, isCeo: true };
    this.bubbles = {}; this.envelopes = [];
    this.tasks = []; this.log = []; this.chat = []; this.inbox = []; this.memory = [];
    this.chatTyping = false; this.auto = false; this.backend = "checking";
    this.taskCounter = 0; this.meeting = false; this.snap = null;
    this.memKey = `aiverse-memory-${roomId}`;
    try { this.memory = JSON.parse(localStorage.getItem(this.memKey) || "[]"); } catch { this.memory = []; }
    this.destroyed = false;
  }

  /* ---------- plumbing ---------- */
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  touch() { this.dirty = true; }
  getSnapshot = () => {
    if (this.dirty || !this.snap) {
      this.dirty = false;
      this.snap = {
        agents: [...this.agents.values()].map((a) => this.publicAgent(a)),
        ceo: this.publicAgent(this.ceo),
        tasks: this.tasks.map((t) => ({ ...t })),
        log: this.log, chat: this.chat, inbox: this.inbox, memory: this.memory,
        chatTyping: this.chatTyping, auto: this.auto, backend: this.backend,
        meeting: this.meeting, maxAgents: MAX_AGENTS,
      };
    }
    return this.snap;
  };
  publicAgent(a) {
    const task = a.taskId ? this.tasks.find((t) => t.id === a.taskId) : null;
    return {
      id: a.id, name: a.name, role: a.role, handles: a.handles, prompt: a.prompt, color: a.color,
      hair: a.hair, hairColor: a.hairColor, speed: a.speed, status: a.isCeo ? "idle" : statusOf(a),
      line: a.line, task: task ? task.title : null, progress: task ? Math.round(task.progress) : 0,
      completed: a.completed || 0, ctx: Math.round(a.ctx || 0), isCeo: !!a.isCeo,
    };
  }
  emitMaybe() {
    if (this.dirty && this.t - this.lastEmit > 250) { this.lastEmit = this.t; this.getSnapshot(); this.listeners.forEach((f) => f()); }
  }
  after(ms, fn) { this.sched.push({ at: this.t + ms, fn }); }
  say(id, text, ms = 3200) { this.bubbles[id] = { text, until: this.t + ms }; }
  event(text, persist = true) {
    this.log = [{ id: uid(), time: formatTime(new Date()), text }, ...this.log].slice(0, 60);
    this.touch();
    if (persist) apiPost(this.apiBase, "/logs", { text, room: this.roomId });
  }
  mail(from, to, text, fly = true) {
    this.inbox = [{ id: uid(), from, to, text, time: formatTime(new Date()) }, ...this.inbox].slice(0, 80);
    const a = this.actor(from), b = this.actor(to);
    if (fly && a && b) this.envelopes.push({ id: uid(), from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y }, t0: this.t, dur: 1100 });
    this.touch();
  }
  actor(id) { return id === "ceo" ? this.ceo : this.agents.get(id); }
  nameOf(id) { return id === "ceo" ? "Michael" : id === "user" ? "You" : this.agents.get(id)?.name || id; }
  roster() { return [...this.agents.values()]; }
  rosterForApi() { return this.roster().map((r) => ({ id: r.id, name: r.name, role: r.role, handles: r.handles, prompt: r.prompt })); }
  entryForApi(e) { return { name: e.name, role: e.role, handles: e.handles, prompt: e.prompt, color: e.color, hair: e.hair, speed: e.speed }; }

  /* ---------- roster ---------- */
  makeAgent(cfg, index) {
    const { seat } = deskLayout(index);
    const a = {
      ...cfg, hairColor: cfg.hairColor || pickHairColorFor(cfg.name), index, x: seat.x, y: seat.y, face: "up", sitting: true,
      state: "idle", loc: seat, path: [], target: null, onArrive: null, taskId: null, completed: 0, ctx: 8,
      line: "awaiting", nextIdleAt: this.t + 3000 + Math.random() * 6000, breakEnd: 0, toolAt: 0,
    };
    return a;
  }
  setRoster(list) {
    const old = this.agents; this.agents = new Map();
    list.forEach((cfg, i) => {
      const prev = old.get(cfg.id);
      if (prev) { Object.assign(prev, cfg, { index: i }); this.agents.set(cfg.id, prev); this.relocateDesk(prev); }
      else this.agents.set(cfg.id, this.makeAgent(cfg, i));
    });
    this.touch();
  }
  relocateDesk(a) {
    if (a.loc && a.loc.sit && a.loc.face === "up" && a.state !== "meeting") {
      const { seat } = deskLayout(a.index);
      if (!a.path.length) { a.loc = seat; a.x = seat.x; a.y = seat.y; }
    }
  }
  deskOf(a) { return deskLayout(a.index).seat; }
  addEmployee(fields) {
    if (this.agents.size >= MAX_AGENTS) return;
    let id = (fields.name || "agent").toLowerCase().replace(/[^a-z0-9]/g, "") || "agent";
    while (this.agents.has(id)) id += Math.floor(Math.random() * 9);
    const cfg = {
      id, name: fields.name.trim(), role: fields.role.trim(), handles: fields.handles || "", prompt: fields.prompt || "",
      color: fields.color || pickRandom(AVATAR_COLORS), hair: fields.hair || "short",
      hairColor: pickHairColorFor(fields.name), speed: fields.speed || 1,
    };
    this.agents.set(id, this.makeAgent(cfg, this.agents.size));
    this.event(`**${cfg.name}** joined the team as ${cfg.role}.`);
    apiPost(this.apiBase, "/employees", { room: this.roomId, employeeId: id, ...this.entryForApi(cfg) });
    this.after(800, () => this.dispatch());
  }
  updateEmployee(id, fields) {
    const a = this.agents.get(id); if (!a) return;
    Object.assign(a, fields);
    this.touch();
    apiPut(this.apiBase, `/employees/${id}`, { room: this.roomId, ...this.entryForApi(a) });
  }
  removeEmployee(id) {
    if (this.agents.size <= 1) return;
    const a = this.agents.get(id); if (!a) return;
    this.tasks.forEach((t) => {
      if (t.assignee === id && ["in-progress", "ceo-review", "user-review"].includes(t.status)) {
        Object.assign(t, { status: "pending", assignee: null, progress: 0, revisionNotes: null, output: null, ceoFeedback: null });
      }
    });
    this.agents.delete(id);
    [...this.agents.values()].forEach((x, i) => { x.index = i; this.relocateDesk(x); });
    this.event(`**${a.name}** left the team. Their unfinished work was requeued.`);
    apiDelete(this.apiBase, `/employees/${id}?room=${encodeURIComponent(this.roomId)}`);
    this.after(800, () => this.dispatch());
  }

  /* ---------- movement ---------- */
  walkTo(a, loc, cb) {
    const from = a.path.length ? { x: a.x, y: a.y, via: [{ x: a.x, y: 21 }] } : a.loc || { x: a.x, y: a.y, via: [{ x: a.x, y: 21 }] };
    a.path = route(from, loc); a.target = loc; a.onArrive = cb || null; a.sitting = false;
  }
  stepActor(a, dtS) {
    if (!a.path.length) return;
    let budget = WALK_SPEED * (a.speed ? 1 / Math.max(0.6, Math.min(1.4, a.speed)) : 1) * dtS;
    while (budget > 0 && a.path.length) {
      const p = a.path[0], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy);
      if (d <= budget) { a.x = p.x; a.y = p.y; a.path.shift(); budget -= d; }
      else { a.x += (dx / d) * budget; a.y += (dy / d) * budget; budget = 0; }
      if (Math.abs(dx) > Math.abs(dy)) a.face = dx > 0 ? "right" : "left"; else if (d > 0.01) a.face = dy > 0 ? "down" : "up";
    }
    a.walking = a.path.length > 0;
    if (!a.path.length) {
      a.loc = a.target || a.loc; a.sitting = !!a.loc.sit; if (a.loc.face) a.face = a.loc.face;
      const cb = a.onArrive; a.onArrive = null; if (cb) cb();
    }
  }

  /* ---------- main loop ---------- */
  tick(dtMs) {
    dtMs = Math.min(dtMs, 100);
    this.t += dtMs;
    const dtS = dtMs / 1000;
    for (let i = this.sched.length - 1; i >= 0; i--) {
      if (this.sched[i].at <= this.t) { const s = this.sched.splice(i, 1)[0]; s.fn(); }
    }
    this.stepActor(this.ceo, dtS);
    this.agents.forEach((a) => {
      a.walking = false; this.stepActor(a, dtS);
      if (a.state === "working" && !a.path.length && a.taskId) this.tickWork(a, dtMs);
      else if (a.state === "idle" && !a.path.length && !this.meeting) this.tickIdle(a);
      else if (a.state === "break" && !a.path.length && a.breakEnd && this.t > a.breakEnd) this.returnToDesk(a);
    });
    for (const k of Object.keys(this.bubbles)) if (this.bubbles[k].until < this.t) delete this.bubbles[k];
    this.envelopes = this.envelopes.filter((e) => this.t - e.t0 < e.dur);
    this.emitMaybe();
  }

  tickWork(a, dtMs) {
    const task = this.tasks.find((t) => t.id === a.taskId); if (!task || a.paused) return;
    task.progress = Math.min(100, task.progress + (dtMs / a.workMs) * 100);
    a.ctx = Math.min(95, 8 + task.progress * 0.85);
    if (this.t > a.toolAt) { a.toolAt = this.t + 2200 + Math.random() * 1500; a.line = pickRandom(TOOL_LINES); this.touch(); }
    this.touch();
    if (task.progress >= 100) this.submit(a, task);
  }
  tickIdle(a) {
    if (this.t < a.nextIdleAt) return;
    a.nextIdleAt = this.t + 7000 + Math.random() * 9000;
    const r = Math.random();
    if (r < 0.55) { this.say(a.id, pickRandom(IDLE_THOUGHT_LINES), 2800); a.wiggleAt = this.t; }
    else if (r < 0.85) this.goOnBreak(a);
  }

  /* ---------- breaks & gossip ---------- */
  goOnBreak(a) {
    const taken = new Set(this.roster().filter((x) => x.spot != null && x.state === "break").map((x) => x.spot));
    const free = COFFEE_SPOTS.map((_, i) => i).filter((i) => !taken.has(i));
    if (!free.length) return;
    const i = pickRandom(free);
    a.state = "break"; a.spot = i; a.line = "coffee break"; a.breakEnd = 0;
    this.event(`**${a.name}** is heading to the coffee machine.`, false);
    this.walkTo(a, COFFEE_SPOTS[i], () => {
      a.breakEnd = this.t + 8000 + Math.random() * 5000;
      this.say(a.id, "Ahh... coffee! Time to refuel ☕", 2600);
      this.gossipLoop(a);
    });
  }
  gossipLoop(a) {
    if (a.state !== "break") return;
    const buddy = this.roster().find((x) => x !== a && x.state === "break" && !x.path.length && Math.abs(x.y - a.y) < 1);
    if (buddy) {
      this.say(a.id, pickRandom(GOSSIP_LINES), 3400);
      this.after(1800, () => buddy.state === "break" && this.say(buddy.id, pickRandom(GOSSIP_LINES), 3000));
      this.event(`**${a.name}** is chatting with **${buddy.name}** by the coffee machine.`, false);
    }
    this.after(4800, () => this.gossipLoop(a));
  }
  returnToDesk(a) {
    a.spot = null; a.state = "idle"; a.line = "heading back"; a.breakEnd = 0;
    this.walkTo(a, this.deskOf(a), () => { a.line = "awaiting"; a.nextIdleAt = this.t + 4000 + Math.random() * 5000; this.touch(); this.dispatch(); });
    this.touch();
  }

  /* ---------- tasks ---------- */
  seedTasks() {
    INITIAL_TASKS.forEach((t) => { this.tasks.push({ ...t }); this.taskCounter++; });
    this.event("CEO is available for new task assignments.", false);
    this.after(1200, () => this.dispatch());
  }
  addTask(title, preferredId, isMeeting, request) {
    this.taskCounter++;
    const task = { id: "t" + this.taskCounter, title, status: "pending", assignee: null, progress: 0, isMeeting: !!isMeeting, preferred: preferredId || null, request: request || null };
    this.tasks.push(task);
    this.event(isMeeting ? `CEO scheduled a team meeting: "${title}".` : `CEO added a new task: "${title}".`);
    this.dispatch();
  }
  isFree(a) { return !a.taskId && (a.state === "idle" || a.state === "break") && !this.meeting; }
  dispatch() {
    if (this.destroyed || this.meeting) return;
    for (const task of this.tasks.filter((t) => t.status === "pending")) {
      if (task.isMeeting) {
        if (this.roster().some((a) => a.state === "toCEO" || a.state === "briefed")) continue;
        this.startMeeting(task); return;
      }
      const free = this.roster().filter((a) => this.isFree(a));
      if (!free.length) return;
      const pref = task.preferred && free.find((a) => a.id === task.preferred);
      const a = pref || pickRandom(free);
      this.beginTask(a, task);
    }
  }
  recall(a, task) {
    const words = task.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    return this.memory.filter((m) => m.agentId === a.id && words.some((w) => m.text.toLowerCase().includes(w))).slice(0, 3);
  }
  beginTask(a, task) {
    task.status = "in-progress"; task.assignee = a.id; task.progress = 0;
    a.taskId = task.id; a.state = "toCEO"; a.breakEnd = 0; a.spot = null; a.line = "walking to CEO";
    this.event(`**${a.name}** is walking to the CEO's desk for "${task.title}".`, false);
    this.walkTo(a, CEO_VISIT, () => {
      a.state = "briefed"; a.line = "being briefed";
      this.say("ceo", pickRandom(CEO_BRIEF_LINES), 2400);
      this.say(a.id, "Got it, on it! 👍", 2200);
      this.mail("ceo", a.id, `Brief: ${task.title}`);
      const notes = this.recall(a, task);
      this.event(`CEO briefed **${a.name}** on "${task.title}".${notes.length ? ` Recalled ${notes.length} memory note${notes.length > 1 ? "s" : ""}.` : ""}`);
      this.after(2200, () => { a.line = "heading to desk"; this.touch(); this.walkTo(a, this.deskOf(a), () => this.startWork(a, task)); });
    });
    this.touch();
  }
  startWork(a, task) {
    a.state = "working"; a.paused = false;
    a.workMs = ((task.revisionNotes ? 6000 : 13000) + Math.random() * 9000) * (a.speed || 1);
    a.line = pickRandom(TOOL_LINES);
    this.say(a.id, task.revisionNotes ? "Reworking this..." : "Working on it...", 2200);
    this.touch();
  }
  submit(a, task) {
    task.status = "ceo-review"; a.state = "review"; a.line = "waiting on CEO review";
    this.say(a.id, "Submitting my work...", 2200);
    this.mail(a.id, "ceo", `Submitted: ${task.title}`);
    this.event(`**${a.name}** submitted "${task.title}" for CEO review.`);
    apiPost(this.apiBase, "/tasks/review", { employeeId: a.id, title: task.title, request: task.request || null, revisionNotes: task.revisionNotes || null, previousOutput: task.revisionNotes ? task.output || null : null, roster: this.rosterForApi() })
      .then((res) => res || { output: `⚠ ${a.name} could not produce a real result because the backend / Gemini is not connected. Start the backend with GEMINI_API_KEY set, then use "revise" to redo this task.`, approved: true, feedback: "No AI backend — nothing real to review." })
      .then((d) => {
        if (this.destroyed || this.agents.get(a.id) !== a || task.assignee !== a.id) return;
        task.output = d.output; task.ceoFeedback = d.feedback; task.source = d.source || null;
        this.say("ceo", d.feedback, 3000);
        if (d.approved) {
          task.status = "user-review"; a.state = "blocked"; a.line = "Asked you: approve?";
          this.event(`CEO approved **${a.name}**'s work on "${task.title}" — awaiting your review.`);
          if (this.auto) this.after(3500, () => this.approve(task.id, true));
        } else {
          task.revisionNotes = d.feedback; task.progress = 78; task.status = "in-progress";
          this.mail("ceo", a.id, `Revise: ${d.feedback}`);
          this.event(`CEO asked **${a.name}** to revise "${task.title}": ${d.feedback}`);
          this.after(2400, () => this.startWork(a, task));
        }
        this.touch();
      });
    this.touch();
  }
  approve(taskId, byAuto = false) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== "user-review") return;
    const a = this.agents.get(task.assignee);
    task.status = "done"; task.progress = 100;
    if (a) {
      a.taskId = null; a.state = "idle"; a.completed++; a.line = "awaiting"; a.ctx = 8; a.nextIdleAt = this.t + 4000;
      this.say(a.id, "Approved! ✅", 2200);
      this.remember(a, `Delivered "${task.title}". ${task.output || ""}`.slice(0, 220));
    }
    this.event(`**${byAuto ? "Auto mode" : "You"}** approved ${a ? `**${a.name}**'s` : "the"} work on "${task.title}". 🎉`);
    this.after(1400, () => this.dispatch());
  }
  revise(taskId, notes) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== "user-review") return;
    const a = this.agents.get(task.assignee);
    task.revisionNotes = (notes || "").trim() || "The user asked for another pass on this.";
    task.status = "in-progress"; task.progress = 65;
    if (a) { this.mail("user", a.id, `Revise: ${task.revisionNotes}`, false); this.after(1500, () => this.startWork(a, task)); }
    this.event(`**You** sent "${task.title}" back for revision.`);
  }
  removeTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId); if (!task || task.status === "in-progress") return;
    this.tasks = this.tasks.filter((t) => t.id !== taskId); this.touch();
  }
  sendToAgent(id, text) {
    if (!text.trim()) return;
    this.mail("user", id, text.trim(), false);
    this.addTask(text.trim().slice(0, 60), id, false, text.trim());
  }

  /* ---------- memory ---------- */
  remember(a, text) {
    this.memory = [{ id: uid(), agentId: a.id, agent: a.name, text, time: formatTime(new Date()) }, ...this.memory].slice(0, 200);
    try { localStorage.setItem(this.memKey, JSON.stringify(this.memory)); } catch { /* optional */ }
    this.touch();
  }
  forget(id) {
    this.memory = this.memory.filter((m) => m.id !== id);
    try { localStorage.setItem(this.memKey, JSON.stringify(this.memory)); } catch { /* optional */ }
    this.touch();
  }

  /* ---------- meeting ---------- */
  startMeeting(task) {
    this.meeting = true; task.status = "in-progress";
    this.event(`CEO called a team meeting: "${task.title}".`);
    const list = this.roster(); const seats = meetingSeats(list.length);
    let arrived = 0;
    list.forEach((a, i) => {
      a.stash = a.state; a.state = "meeting"; a.paused = true; a.breakEnd = 0; a.spot = null; a.line = "in meeting";
      this.walkTo(a, seats[i], () => { if (++arrived === list.length) this.meetingRoll(task, list); });
    });
    this.walkTo(this.ceo, MEET_HEAD, () => this.say("ceo", "Alright team, let's sync up.", 3000));
  }
  meetingRoll(task, list) {
    list.forEach((a, i) => this.after(i * 1100, () => this.say(a.id, pickRandom(["Quick update from me:", "Progress looks good.", "Any blockers? None here.", "Happy to help on that."]), 2600)));
    this.after(Math.max(7000, list.length * 1300), () => {
      this.say("ceo", "Great meeting, everyone — back to it!", 2600);
      task.status = "done"; task.progress = 100;
      this.walkTo(this.ceo, CEO_SEAT, () => {});
      list.forEach((a) => {
        const back = a.stash === "meeting" ? "idle" : a.stash;
        this.walkTo(a, this.deskOf(a), () => {
          a.state = ["toCEO", "briefed"].includes(back) ? "working" : back; a.paused = false;
          a.line = a.state === "idle" ? "awaiting" : a.line; this.touch();
        });
      });
      this.meeting = false; this.event(`Meeting finished: "${task.title}".`);
      this.after(4000, () => this.dispatch());
    });
  }

  /* ---------- chat with the CEO ---------- */
  pushChat(sender, text) {
    this.chat = [...this.chat, { id: uid(), sender, text }]; this.touch();
    apiPost(this.apiBase, "/chat", { sender, text, room: this.roomId });
  }
  talkToCeo(raw) {
    const text = raw.trim(); if (!text) return;
    this.pushChat("user", text); this.chatTyping = true; this.touch();
    apiPost(this.apiBase, "/ceo/route", { text, roster: this.rosterForApi() })
      .then((d) => d || localRouteMessage(text, this.roster()))
      .catch(() => localRouteMessage(text, this.roster()))
      .then((d) => {
        this.chatTyping = false; this.pushChat("ceo", d.reply);
        if (d.isMeeting) this.addTask("Team Meeting: " + d.title, null, true);
        else this.addTask(d.title, d.employeeId || null, false, text);
      });
  }
  setAuto(v) {
    this.auto = v; this.touch();
    if (v) this.tasks.filter((t) => t.status === "user-review").forEach((t) => this.after(1500, () => this.approve(t.id, true)));
  }
  clickAgent(id) {
    if (id === "ceo") return this.say("ceo", pickRandom(CEO_LINES), 2600);
    const a = this.agents.get(id); if (!a) return;
    const map = { idle: "Just waiting for my next task.", working: "Heads down, working on it!", break: "Coffee time ☕", review: "Waiting on the CEO's review.", blocked: "I've asked you a question!", meeting: "In a meeting." };
    this.say(id, map[a.state] || "Just vibing.", 2600);
  }

  /* ---------- boot ---------- */
  async boot() {
    if (this.booted) return; this.booted = true;
    this.setRoster(DEFAULT_ROSTER);
    this.seedTasks();
    const health = await apiGet(this.apiBase, "/health");
    if (this.destroyed) return;
    this.backend = health ? "connected" : "offline"; this.touch();
    if (!health) return;
    const room = encodeURIComponent(this.roomId);
    const [chatRes, logRes, empRes] = await Promise.all([
      apiGet(this.apiBase, `/chat?room=${room}&limit=200`),
      apiGet(this.apiBase, `/logs?room=${room}&limit=40`),
      apiGet(this.apiBase, `/employees?room=${room}`),
    ]);
    if (this.destroyed) return;
    if (chatRes?.messages?.length) this.chat = chatRes.messages.map((m) => ({ id: m._id || uid(), sender: m.sender, text: m.text }));
    if (logRes?.logs?.length) this.log = logRes.logs.map((l) => ({ id: l._id, time: formatTime(new Date(l.createdAt)), text: l.text }));
    if (empRes?.employees?.length) {
      this.setRoster(empRes.employees.map((d) => ({
        id: d.employeeId, name: d.name, role: d.role, handles: d.handles || "", prompt: d.prompt || "",
        color: d.color || pickRandom(AVATAR_COLORS), hair: d.hair || "short", hairColor: pickHairColorFor(d.name), speed: d.speed || 1,
      })));
    } else if (empRes) {
      DEFAULT_ROSTER.forEach((e) => apiPost(this.apiBase, "/employees", { room: this.roomId, employeeId: e.id, ...this.entryForApi(e) }));
    }
    this.touch();
  }
  destroy() { this.destroyed = true; }
}
