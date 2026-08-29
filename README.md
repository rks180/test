# InsuredMine Node.js Assessment

CSV/XLSX import via worker threads, policy search & aggregation, CPU auto-restart at 70%, scheduled messages.
TypeScript source, compiled to plain JavaScript in `dist/` by `npm start`.

## Run

```
npm install
cp .env.example .env
npm start
```

Needs MongoDB. Open `http://localhost:3000` for a test console.

```
npm start            build + run
npm test             unit + API tests
npm run test:smoke   end-to-end run against a live server
```

## API

```
POST /upload                   upload CSV/XLSX (field "file")     Task 1.1
GET  /search?username=Lura     policies for a user                Task 1.2
GET  /aggregate                policy count + premium per user    Task 1.3
GET  /api/stats                count per collection               Task 1.4
GET  /api/cpu                  live CPU                           Task 2.1
POST /scheduleMessage          { message, day, time }             Task 2.2
```

Step-by-step run guide: [NODE.md](NODE.md). Postman collection: [`postman/`](postman/InsuredMine-Assessment.postman_collection.json).
