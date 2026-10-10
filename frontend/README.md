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

## Run
```bash
cd backend && npm install && npm start      # needs MongoDB + GEMINI_API_KEY (.env.example)
cd vite-office && npm install && npm run dev # http://localhost:5173
```
Without a backend the app runs local-only with keyword routing. API base: `src/App.jsx`.

## AI (backend)
Powered by Google Gemini (`GEMINI_API_KEY`, optional `GEMINI_MODEL`). The backend is ES modules
(`"type": "module"`, `import`/`export`). `GET /api/health` shows whether Gemini is configured.
