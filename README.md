# InsuredMine Node.js Assessment (TypeScript)

CSV/XLSX import via worker threads, policy search & aggregation, CPU auto-restart at 70%, scheduled messages.

## Run

```
npm install
cp .env.example .env
npm start
```

Needs MongoDB running. App runs on `http://localhost:3000` (open it for a test console).

## API

```
POST /api/upload                 upload CSV/XLSX (field "file"), parsed in a worker thread
GET  /api/upload/:jobId          import job status
GET  /api/stats                  count per collection

GET  /api/policies/search?username=Lura      policies for a user
GET  /api/policies/aggregate                 policy count + premium per user

GET  /api/data/:collection       browse users | policies | agents | carriers | lobs | accounts

GET  /api/cpu                    live CPU
POST /api/cpu/stress             { "seconds": 15 }  -> triggers restart

POST /api/messages               { "message", "day": "2026-09-01", "time": "14:30" }
GET  /api/messages               list scheduled/sent messages
GET  /api/messages/:id           one message
```

## How it's built

- **Layers:** `routes → validate() → controller → service → model`. Controllers are thin (parse request, call service, respond); all DB logic lives in `src/services/`.
- **Validation:** every route input is checked by a **zod** schema (`src/validators/`) via `validate()` middleware — bad input never reaches a controller.
- **Errors:** services `throw` typed errors (`BadRequestError`, `NotFoundError`); one handler in `app.ts` turns them into JSON. Async handlers are wrapped by `asyncHandler`.
- List responses use a `meta` block: `{ ..., meta: { page, limit, total, totalPages } }`.
