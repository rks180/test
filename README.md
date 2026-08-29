# InsuredMine Node.js Assessment (TypeScript)

Express + MongoDB service that imports a CSV/XLSX of insurance data into
normalized collections using **worker threads**, exposes policy search and
per-user aggregation APIs, monitors CPU and restarts the process at 70%, and
schedules messages for future delivery.

- **Language:** TypeScript (compiled to `dist/`, CommonJS)
- **Stack:** Node.js, Express 5, Mongoose, `worker_threads`, `cluster`, `multer`, `csv-parser` / `exceljs`, `node-cron`

## Requirements

- Node.js 18+
- A running MongoDB (default `mongodb://127.0.0.1:27017/insuredmine`)

## Setup

```bash
npm install
cp .env.example .env        # edit MONGO_URI / PORT if needed
```

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Compile `src/**/*.ts` → `dist/` |
| `npm start` | Build, then run **clustered** (`dist/cluster.js`) — needed for CPU auto-restart |
| `npm run start:single` | Build, then run a **single process** (`dist/server.js`) |
| `npm run dev` | Build once, then `tsx watch` the server (auto-reload on change) |
| `npm run typecheck` | Type-check only, no output |
| `npm test` | Run the end-to-end smoke test (`scripts/smoke-test.sh`) against a running server |
| `npm run clean` | Delete `dist/` |

Server + test console: `http://localhost:3000/`

## Task mapping

| Task | Endpoint / file |
|---|---|
| **1.1** Upload XLSX/CSV to MongoDB via worker threads | `POST /api/upload` → `src/workers/import.worker.ts` |
| **1.2** Search policy info by username | `GET /api/policies/search` → `src/controllers/policy.controller.ts` |
| **1.3** Aggregated policy by each user | `GET /api/policies/aggregate` → `src/controllers/policy.controller.ts` |
| **1.4** One collection per entity (Agent, User, Account, LOB, Carrier, Policy) | `src/models/` |
| **2.1** Track real-time CPU, restart at 70% | `src/utils/cpuMonitor.ts` + `src/cluster.ts` |
| **2.2** POST service: message + day + time → insert into DB at that day/time | `POST /api/messages` + `src/services/scheduler.ts` |

## API

| Method | Path | Notes |
|--------|------|-------|
| GET  | `/health` | uptime / pid |
| POST | `/api/upload` | field `file` (.csv/.xlsx); returns `202` + `jobId`, parses in a worker thread |
| GET  | `/api/upload/:jobId` | import job status |
| GET  | `/api/uploads` | list import jobs |
| GET  | `/api/policies/search` | `?username=<name>&page=&limit=&exact=true` |
| GET  | `/api/policies/aggregate` | `?page=&limit=&username=<optional>` |
| GET  | `/api/stats` | document count per collection |
| GET  | `/api/data/:collection` | `agents\|carriers\|lobs\|users\|accounts\|policies` (paginated) |
| GET  | `/api/cpu` | live CPU + memory + history |
| POST | `/api/cpu/stress` | `{ "seconds": 15 }` — demo load to trigger the restart |
| POST | `/api/messages` | `{ message, day, time }` — schedule a message |
| GET  | `/api/messages` | `?status=scheduled\|sent\|failed&page=&limit=` |
| GET  | `/api/messages/:id` | single message |

## Testing

### Automated smoke test

```bash
npm start                       # terminal 1  (or: npm run start:single)
npm test                        # terminal 2  -> runs scripts/smoke-test.sh
```

`scripts/smoke-test.sh` imports the sample CSV and asserts every task end to end
(48 checks): worker-thread upload, all 6 collections populated, idempotent
re-upload, username search (+ 400/404 cases), per-user aggregation + pagination,
CPU sample endpoint, scheduled-message create/validate/list, and it waits for the
cron poller to actually deliver a due message.

### Manual (curl)

```bash
# Task 1.1 — upload (worker thread)
curl -F "file=@data/data-sheet.csv" http://localhost:3000/api/upload
curl http://localhost:3000/api/upload/<jobId>
curl http://localhost:3000/api/stats

# Task 1.2 — search by username
curl "http://localhost:3000/api/policies/search?username=Lura%20Lucca"
curl "http://localhost:3000/api/policies/search?username=lura&exact=true"   # 404
curl "http://localhost:3000/api/policies/search"                            # 400

# Task 1.3 — aggregated policy per user
curl "http://localhost:3000/api/policies/aggregate?page=1&limit=5"
curl "http://localhost:3000/api/policies/aggregate?username=Lura%20Lucca"

# Task 2.1 — CPU monitor + restart (run with: npm start)
curl http://localhost:3000/api/cpu
curl -X POST http://localhost:3000/api/cpu/stress -H 'Content-Type: application/json' -d '{"seconds":15}'
watch -n1 'curl -s http://localhost:3000/api/cpu | python3 -m json.tool | grep pid'   # pid changes = restarted

# Task 2.2 — scheduled message
curl -X POST http://localhost:3000/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"Renewal reminder","day":"2026-09-01","time":"14:30"}'
curl "http://localhost:3000/api/messages?status=scheduled"
```

Or open `http://localhost:3000/` — the browser console has a button for every task.

## How the tricky bits work

- **Worker-thread import** — `POST /api/upload` saves the file, registers an
  in-memory job, and spawns a worker thread. The HTTP response returns `202`
  immediately; the main event loop is never blocked. Rows are streamed, split
  into the 6 entities, and written with batched `bulkWrite` upserts, so
  re-uploading the same file does not duplicate data. Dedupe keys: users on
  `firstname + dob` (email is not unique in the sheet), accounts on
  `account_name + user_id`, policies on `policy_number`.
- **CPU restart** — `cpuMonitor.ts` samples this process's CPU as a % of one
  core. After `CPU_CONSECUTIVE_SAMPLES` samples in a row at/above
  `CPU_THRESHOLD`, the worker asks the cluster primary to restart it. The primary
  forks a new worker and kills the old one only once the replacement is
  `listening` — zero dropped requests. `start:single` has no primary, so it only
  warns.
- **Scheduled messages** — stored immediately with `status: "scheduled"` and a
  computed `sendAt` (server local timezone). A `node-cron` poller
  (`MESSAGE_POLL_CRON`, default every minute) atomically claims each due message
  and marks it `sent`. DB-backed, so pending messages survive a restart; the
  atomic `findOneAndUpdate` means a clustered deployment never sends one twice.

## Configuration (`.env`)

| Var | Default | Purpose |
|-----|---------|---------|
| `MONGO_URI` | local | MongoDB connection string |
| `PORT` | 3000 | HTTP port |
| `CPU_THRESHOLD` | 70 | CPU % that counts as "high" |
| `CPU_CONSECUTIVE_SAMPLES` | 3 | high samples in a row before restart |
| `CPU_SAMPLE_INTERVAL_MS` | 2000 | sampling interval |
| `IMPORT_BATCH_SIZE` | 500 | bulk insert batch size |
| `MAX_IMPORT_WORKERS` | 2 | concurrent import workers |
| `MESSAGE_POLL_CRON` | `* * * * *` | scheduled-message poll interval |

## Layout

```
src/
  cluster.ts          cluster entrypoint (npm start) — CPU auto-restart
  server.ts           single-process entrypoint
  app.ts              express app + route wiring
  config/db.ts        mongoose connection
  models/             agent, carrier, lob, user, account, policy, message
  routes/             upload, policy, stats, cpu, message
  controllers/        upload, policy, stats, browse, cpu, message
  services/           importJobs, monitor, scheduler
  workers/            import.worker.ts, stress.worker.ts
  utils/              rowMapper, fileStream, cpuMonitor
  types/              csv-parser.d.ts
scripts/smoke-test.sh end-to-end test
data/data-sheet.csv   source data
public/index.html     browser test console
```
