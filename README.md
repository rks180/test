# InsuredMine Node.js Assessment (TypeScript)

Express + MongoDB service: CSV/XLSX import via worker threads, policy search &
per-user aggregation, CPU monitor with auto-restart at 70%, and scheduled messages.

Stack: Node.js, TypeScript, Express 5, Mongoose, `worker_threads`, `cluster`, `multer`, `node-cron`.

## Setup

```bash
npm install
cp .env.example .env        # set MONGO_URI / PORT if needed (needs a running MongoDB)
```

## Commands

```bash
npm start                   # build + run (cluster mode, needed for CPU auto-restart)
npm run start:single        # build + run single process
npm run dev                 # build once + tsx watch (auto-reload)
npm run build               # compile src/ -> dist/
npm run typecheck           # type-check only
npm test                    # run scripts/smoke-test.sh (server must be running)
```

## API

Base URL: `http://localhost:3000`

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| | GET | `/health` | uptime / pid |
| 1.1 | POST | `/api/upload` | upload CSV/XLSX (form field `file`); parses in a worker thread, returns `202` + `jobId` |
| 1.1 | GET | `/api/upload/:jobId` | import job status |
| 1.1 | GET | `/api/uploads` | list all import jobs |
| 1.1 | GET | `/api/stats` | document count per collection |
| 1.2 | GET | `/api/policies/search?username=&page=&limit=&exact=` | policies for the matching user(s), references populated |
| 1.3 | GET | `/api/policies/aggregate?page=&limit=&username=` | per-user policy count + premium totals |
| 1.4 | GET | `/api/data/:collection?page=&limit=` | browse `agents\|carriers\|lobs\|users\|accounts\|policies` |
| 2.1 | GET | `/api/cpu` | live CPU + memory + history |
| 2.1 | POST | `/api/cpu/stress` | body `{ "seconds": 15 }` — demo load to trigger the restart |
| 2.2 | POST | `/api/messages` | body `{ "message", "day": "YYYY-MM-DD", "time": "HH:mm" }` — schedule a message |
| 2.2 | GET | `/api/messages?status=&page=&limit=` | list messages (`scheduled\|sent\|failed`) |
| 2.2 | GET | `/api/messages/:id` | single message |

### Example requests

```bash
curl -F "file=@data/data-sheet.csv" http://localhost:3000/api/upload
curl http://localhost:3000/api/stats
curl "http://localhost:3000/api/policies/search?username=Lura%20Lucca"
curl "http://localhost:3000/api/policies/aggregate?page=1&limit=20"
curl "http://localhost:3000/api/data/policies?page=1&limit=20"
curl http://localhost:3000/api/cpu
curl -X POST http://localhost:3000/api/cpu/stress -H 'Content-Type: application/json' -d '{"seconds":15}'
curl -X POST http://localhost:3000/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"Renewal reminder","day":"2026-09-01","time":"14:30"}'
curl "http://localhost:3000/api/messages?status=scheduled"
```

Or open `http://localhost:3000/` — browser console with a button per endpoint.

## .env

```
MONGO_URI=mongodb://127.0.0.1:27017/insuredmine
PORT=3000
CPU_THRESHOLD=70
CPU_CONSECUTIVE_SAMPLES=3
CPU_SAMPLE_INTERVAL_MS=2000
IMPORT_BATCH_SIZE=500
MAX_IMPORT_WORKERS=2
MESSAGE_POLL_CRON=* * * * *
```
