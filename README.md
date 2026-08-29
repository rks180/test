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
```
