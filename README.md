# InsuredMine Node.js Assessment

Express + MongoDB (Mongoose) service that imports a CSV/XLSX of insurance data
into normalized collections using **worker threads**, exposes policy search and
per-user aggregation APIs, monitors CPU load and restarts the process when it
stays high, and schedules messages for future delivery.

## Stack

- Node.js (CommonJS), Express 5
- MongoDB via Mongoose
- `worker_threads` for CSV/XLSX import and CPU stress testing
- `cluster` for zero-downtime restart on CPU overload
- `multer` for file upload, `csv-parser` / `exceljs` for streaming parse
- `node-cron` for scheduled-message delivery

## Setup

```bash
npm install
cp .env.example .env          # adjust MONGO_URI / PORT if needed
npm start                     # clustered (src/cluster.js) -- required for auto-restart
npm run start:single          # single process (src/server.js)
npm run dev                   # single process, --watch
```

Requires a running MongoDB (default `mongodb://127.0.0.1:27017/insuredmine`).

A browser test console is served at `http://localhost:3000/`.

## Task mapping

| Assignment task | Where |
|---|---|
| **1.1** Upload XLSX/CSV into MongoDB using worker threads | `POST /api/upload` → `src/workers/import.worker.js` |
| **1.2** Search policy info by username | `GET /api/policies/search` → `src/controllers/policy.controller.js` |
| **1.3** Aggregated policy by each user | `GET /api/policies/aggregate` → `src/controllers/policy.controller.js` |
| **1.4** One collection per entity (Agent, User, Account, LOB, Carrier, Policy) | `src/models/` |
| **2.1** Track real-time CPU, restart at 70% | `src/utils/cpuMonitor.js` + `src/cluster.js` |
| **2.2** POST service: message + day + time → insert into DB at that day/time | `POST /api/messages` + `src/services/scheduler.js` |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health`                 | Process health / uptime / pid |
| POST | `/api/upload`             | Upload CSV/XLSX (`file` field); parsing runs in a worker thread, returns `202` + `jobId` |
| GET  | `/api/upload/:jobId`      | Import job status |
| GET  | `/api/uploads`            | List import jobs |
| GET  | `/api/policies/search`    | **Task 1.2** — `?username=<name>&page=&limit=&exact=true` — policies for the matching user(s), references populated |
| GET  | `/api/policies/aggregate` | **Task 1.3** — `?page=&limit=&username=<optional>` — per-user policy count + premium totals |
| GET  | `/api/stats`              | Document count per collection |
| GET  | `/api/data/:collection`   | Browse a collection (pagination) — `agents\|carriers\|lobs\|users\|accounts\|policies` |
| GET  | `/api/cpu`                | Current CPU + memory sample and recent history |
| POST | `/api/cpu/stress`         | Spawn a CPU stress worker (`{ "seconds": 15 }`) to demo the restart |
| POST | `/api/messages`           | **Task 2.2** — schedule a message (see below) |
| GET  | `/api/messages`           | List scheduled messages — `?status=scheduled\|sent\|failed&page=&limit=` |
| GET  | `/api/messages/:id`       | Single message |

### Task 1.1 — worker-thread import

`POST /api/upload` writes the file to `uploads/`, registers an in-memory job, and
spawns a **worker thread** (`src/workers/import.worker.js`). The HTTP response
returns immediately (`202`); the main thread's event loop is never blocked while
the file is parsed and written. Rows are streamed (not buffered), split into the
6 entities by `src/utils/rowMapper.js`, and written in batched `bulkWrite`
upserts so re-uploading the same file is idempotent.

Dedupe keys: users on `firstname + dob` (email is not unique in the sheet),
accounts on `account_name + user_id`, policies on `policy_number`.

### Task 2.1 — CPU tracking + restart

`src/utils/cpuMonitor.js` samples this process's CPU every `CPU_SAMPLE_INTERVAL_MS`
as a percentage of one core. When `CPU_CONSECUTIVE_SAMPLES` samples in a row stay
at/above `CPU_THRESHOLD` (70%), it emits `threshold`.

Under `npm start` (cluster mode) the worker tells the primary, which forks a
**new** worker and only kills the old one once the replacement is `listening` —
so no request is dropped. Under `npm run start:single` there is no parent to
restart the process, so it only logs a warning.

To demo: open `http://localhost:3000/`, click **CPU stress**, watch the worker
PID change on `/api/cpu`.

### Task 2.2 — scheduled messages

```bash
curl -X POST http://localhost:3000/api/messages \
  -H 'Content-Type: application/json' \
  -d '{ "message": "Renewal reminder", "day": "2026-09-01", "time": "14:30" }'
```

- `day` — `YYYY-MM-DD`, `time` — `HH:mm` (24h), interpreted in the **server's local timezone**.
- The document is stored immediately with `status: "scheduled"` and a computed `sendAt`.
- A `node-cron` poller (`MESSAGE_POLL_CRON`, default every minute) atomically
  claims each due message and flips it to `status: "sent"` with `sentAt`.
- Keeping the schedule in MongoDB (instead of an in-memory timer) means pending
  messages survive a restart, and the atomic `findOneAndUpdate` claim means a
  clustered deployment never delivers one twice.
- A `sendAt` in the past is delivered on the next poll.

## Configuration (`.env`)

| Var | Default | Purpose |
|-----|---------|---------|
| `MONGO_URI`               | local           | MongoDB connection string |
| `PORT`                    | 3000            | HTTP port |
| `CPU_THRESHOLD`           | 70              | CPU % that counts as "high" |
| `CPU_CONSECUTIVE_SAMPLES` | 3               | High samples in a row before restart |
| `CPU_SAMPLE_INTERVAL_MS`  | 2000            | Sampling interval |
| `IMPORT_BATCH_SIZE`       | 500             | Bulk insert batch size |
| `MAX_IMPORT_WORKERS`      | 2               | Concurrent import workers |
| `MESSAGE_POLL_CRON`       | `* * * * *`     | Scheduled-message poll interval |

## Layout

```
src/
  cluster.js          cluster entrypoint (npm start) — CPU auto-restart
  server.js           single-process entrypoint
  app.js              express app + route wiring
  config/db.js        mongoose connection
  models/             agent, carrier, lob, user, account, policy, message
  routes/             upload, policy, stats, cpu, message
  controllers/        upload, policy, stats, browse, cpu, message
  services/           importJobs, monitor, scheduler
  workers/            import.worker.js, stress.worker.js
  utils/              rowMapper, fileStream, cpuMonitor
data/data-sheet.csv   source data
public/index.html     browser test console
```
