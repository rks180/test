# InsuredMine Node.js Assessment (TypeScript)

Express + MongoDB service: CSV/XLSX import via worker threads, policy search &
per-user aggregation, CPU monitor with auto-restart at 70%, and scheduled messages.

Stack: Node.js, TypeScript, Express 5, Mongoose, `worker_threads`, `cluster`, `multer`, `node-cron`.

## Setup

```bash
npm install
cp .env.example .env        # set MONGO_URI / PORT if needed (needs a running MongoDB)
npm start                   # build + run (cluster mode, port 3000)
```

## Commands

| Command | What |
|---|---|
| `npm start` | build + run clustered (needed for CPU auto-restart) |
| `npm run start:single` | build + run single process |
| `npm run dev` | build once + `tsx watch` (auto-reload) |
| `npm run build` | compile `src/` → `dist/` |
| `npm run typecheck` | type-check only |
| `npm test` | run `scripts/smoke-test.sh` (server must be running) |

## API

Base URL: `http://localhost:3000`

### Health
```bash
curl http://localhost:3000/health
```

### 1.1 Upload CSV/XLSX (worker thread)
```bash
curl -F "file=@data/data-sheet.csv" http://localhost:3000/api/upload
curl http://localhost:3000/api/upload/<jobId>      # job status
curl http://localhost:3000/api/uploads             # all jobs
curl http://localhost:3000/api/stats               # count per collection
```

### 1.2 Search policy by username
```bash
curl "http://localhost:3000/api/policies/search?username=Lura%20Lucca"
curl "http://localhost:3000/api/policies/search?username=lura&exact=true&page=1&limit=20"
```

### 1.3 Aggregated policy per user
```bash
curl "http://localhost:3000/api/policies/aggregate?page=1&limit=20"
curl "http://localhost:3000/api/policies/aggregate?username=Lura%20Lucca"
```

### Browse a collection
```bash
curl "http://localhost:3000/api/data/policies?page=1&limit=20"
# collections: agents | carriers | lobs | users | accounts | policies
```

### 2.1 CPU monitor + restart
```bash
curl http://localhost:3000/api/cpu
curl -X POST http://localhost:3000/api/cpu/stress -H 'Content-Type: application/json' -d '{"seconds":15}'
# run with `npm start`; watch /api/cpu -> pid changes when it restarts
```

### 2.2 Scheduled message
```bash
curl -X POST http://localhost:3000/api/messages -H 'Content-Type: application/json' \
  -d '{"message":"Renewal reminder","day":"2026-09-01","time":"14:30"}'
curl "http://localhost:3000/api/messages?status=scheduled"
curl http://localhost:3000/api/messages/<id>
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
