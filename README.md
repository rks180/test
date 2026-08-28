# InsuredMine Node.js Assessment

Express + MongoDB (Mongoose) service that imports a CSV of insurance data into
normalized collections using worker threads, exposes search/aggregation APIs,
monitors CPU load, and restarts the process when load stays high.

## Stack

- Node.js (CommonJS), Express 5
- MongoDB via Mongoose
- `worker_threads` for CSV import and CPU stress testing
- `multer` for file upload, `csv-parser` / `exceljs` for parsing
- `node-cron` for scheduled messages

## Setup

```bash
npm install
cp .env.example .env   # adjust MONGO_URI / PORT if needed
npm start              # clustered (src/cluster.js)
npm run start:single   # single process (src/server.js)
npm run dev            # single process with --watch
```

Requires a running MongoDB (default `mongodb://127.0.0.1:27017/insuredmine`).

A browser test console is served at `http://localhost:3000/`.

## API

| Method | Path                    | Description                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | `/health`               | Process health / uptime / pid                |
| POST   | `/api/upload`           | Upload CSV/XLSX (`file` field), starts import |
| GET    | `/api/upload/:jobId`    | Import job status                            |
| GET    | `/api/uploads`          | List import jobs                             |
| GET    | `/api/stats`            | Aggregated statistics                        |
| GET    | `/api/data/:collection` | Browse a collection (search / pagination)    |
| GET    | `/api/cpu`              | Current CPU sample                           |
| POST   | `/api/cpu/stress`       | Spawn CPU stress worker (for testing)        |

## Configuration (`.env`)

| Var                      | Default | Purpose                              |
|--------------------------|---------|--------------------------------------|
| `MONGO_URI`              | local   | MongoDB connection string            |
| `PORT`                   | 3000    | HTTP port                            |
| `CPU_THRESHOLD`          | 70      | CPU % that counts as "high"          |
| `CPU_CONSECUTIVE_SAMPLES`| 3       | High samples in a row before restart |
| `CPU_SAMPLE_INTERVAL_MS` | 2000    | Sampling interval                    |
| `IMPORT_BATCH_SIZE`      | 500     | Bulk insert batch size               |
| `MAX_IMPORT_WORKERS`     | 2       | Concurrent import workers            |

## Layout

```
src/
  cluster.js        cluster entrypoint
  server.js         single-process entrypoint
  app.js            express app + routes
  config/db.js      mongoose connection
  models/           carrier, lob, policy, user, agent, account
  routes/           upload, stats, cpu
  controllers/      upload, stats, browse, cpu
  services/         importJobs, monitor
  workers/          import.worker.js, stress.worker.js
  utils/            rowMapper, fileStream, cpuMonitor
data/data-sheet.csv source data
```
