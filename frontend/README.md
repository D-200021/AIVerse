# AIVerse Inc. — Vite + React + Pixi.js (Munder-Difflin-style UX)

Inspired by the UX of HarnessMD/munder-difflin: a 2D pixel office floor, a Command Center
with tabs, an agent strip along the bottom, a Kanban of tasks, an "Ask me" approvals queue,
a mailbox, agent memory and an auto mode. No code or art was copied; everything is drawn
procedurally and the AI layer is your own Node + Gemini backend.

## Structure (`src/`)
| Folder | Purpose |
|---|---|
| `atoms/` | PxPanel, PxButton, PxChip, StatusChip, PxBar, PxField, Portrait, Swatch |
| `modules/` | TopBar, FloorView, AgentStrip, CommandCenter (+ `tabs/`: Chat, Tasks, AskMe, Inbox, Memory, Activity, Agents), AgentForm, AgentModal |
| `pages/` | `OfficeSimulationPage` |
| `sim/` | `engine.js` (agents, tasks, review flow, memory, mailbox, idle randomness) and `layout.js` (tile map, routes) |
| `pixi/` | `OfficeStage.js` renderer + `art.js` procedural pixel art |
| `hooks/` | `useOffice` bridges the engine to React |

## Features
- Pixel floor: CEO office, meeting room, break room, open office; agents walk, sit, brew coffee, gossip; envelopes fly desk-to-desk.
- Command Center: chat with Michael (CEO) -> Gemini routing; Kanban tasks; **Ask me** (CEO approves, then you approve/revise); inbox/mailbox; searchable memory (agents write a note per approved task and recall matches when briefed); activity log; agents tab (hire/edit/remove, per-agent prompt, work, color, hair, speed, direct tasking).
- Auto mode (top bar): finished work is approved automatically.
- Random idle behaviour for employees only (the CEO stays put).

## Accounts (sign in / sign up / forgot password)
- Sign up asks for name, email, password and **your own Google Gemini API key** (get one free at https://aistudio.google.com/apikey). The key is validated with Google and stored **encrypted** (AES-256-GCM) on the server.
- Every user gets a private office: agents, tasks and logs are partitioned per account. The room is derived from the login token, never from the client.
- Forgot password: emails a single-use link (valid 1 hour). Without SMTP configured, the link is printed in the backend log and returned to the UI in development so you can still test it.
- Change your key any time: user menu (top right) -> "Gemini API key...".

## Code IDE (Monaco)
When an agent's output contains code, an **open in IDE** button appears (Outputs / Ask me tabs, plus a toast). It opens a right-hand editor drawer with one tab per file, run (JavaScript, sandboxed, console output), copy, download, rename, reset and new file. Monaco is bundled locally (no CDN) and lazy-loaded. Edits are kept per task.

## Run
```bash
cd backend && cp .env.example .env && npm install && npm start   # needs MongoDB; set APP_SECRET
cd vite-office && npm install && npm run dev                      # http://localhost:5173
```
Frontend API base: `VITE_API_BASE` (default `http://localhost:4000/api`). The backend is required to sign in.

## Backend (ES modules)
Express + Mongoose + `@google/genai` (`GEMINI_MODEL`, default gemini-2.5-flash). There is no server-wide Gemini key: each request uses the signed-in user's key.
Env: `MONGODB_URI`, `PORT`, `CORS_ORIGIN`, `APP_URL` (used in reset links), `APP_SECRET` (**required in production**; changing it makes stored Gemini keys unreadable), optional `SMTP_*` / `MAIL_FROM`. `npm test` runs the route tests.
Note: the session token is kept in localStorage; serve over HTTPS in production.
