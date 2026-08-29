# InsuredMine Node.js Assessment (TypeScript)

Express + MongoDB service: CSV/XLSX import via worker threads, policy search &
per-user aggregation, CPU monitor with auto-restart at 70%, scheduled messages.

## Setup

```
npm install
cp .env.example .env
npm start
```

Needs a running MongoDB. Server runs on `http://localhost:3000`.

## Commands

| Command | What |
|---|---|
| `npm start` | build + run (cluster mode, needed for CPU auto-restart) |
| `npm run start:single` | build + run single process |
| `npm run dev` | build + tsx watch (auto-reload) |
| `npm run build` | compile `src/` → `dist/` |
| `npm run typecheck` | type-check only |
| `npm test` | smoke test (server must be running) |

## API

| Task | Method | Endpoint | Description |
|---|---|---|---|
| | GET | `/health` | uptime / pid |
| 1.1 | POST | `/api/upload` | upload CSV/XLSX (field `file`) — parses in a worker thread |
| 1.1 | GET | `/api/upload/:jobId` | import job status |
| 1.1 | GET | `/api/uploads` | list import jobs |
| 1.1 | GET | `/api/stats` | count per collection |
| 1.2 | GET | `/api/policies/search?username=` | policies for a user (`&exact=true`, `&page=`, `&limit=`) |
| 1.3 | GET | `/api/policies/aggregate` | policy count + premium totals per user (`?username=`, `&page=`, `&limit=`) |
| 1.4 | GET | `/api/data/:collection` | browse `agents\|carriers\|lobs\|users\|accounts\|policies` |
| 2.1 | GET | `/api/cpu` | live CPU + memory |
| 2.1 | POST | `/api/cpu/stress` | `{ "seconds": 15 }` — demo load to trigger restart |
| 2.2 | POST | `/api/messages` | `{ "message", "day": "YYYY-MM-DD", "time": "HH:mm" }` |
| 2.2 | GET | `/api/messages` | list (`?status=scheduled\|sent\|failed`) |
| 2.2 | GET | `/api/messages/:id` | single message |

Or open `http://localhost:3000/` for a browser console with a button per endpoint.
