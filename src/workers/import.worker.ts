/**
 * Task 1.1 import worker -- all file parsing + DB writing runs OFF the main thread,
 * so other APIs stay responsive during an upload. Each worker opens its own Mongo
 * connection (mongoose connections can't be shared between threads).
 */

import { parentPort, workerData } from 'worker_threads';
import mongoose, { Model, Types } from 'mongoose';

import { streamRows } from '../utils/fileStream';
import { mapRow, MappedRow, MappedAccount, MappedPolicy, MappedUser } from '../utils/rowMapper';
import { Agent, Carrier, LOB, User, Account, Policy } from '../models';
import type { ImportStats } from '../services/importJobs';

interface WorkerInput {
  filePath: string;
  mongoUri: string;
  batchSize?: number;
}

const input = workerData as WorkerInput;
const BATCH_SIZE = input.batchSize || 500;

const stats: ImportStats = {
  rowsRead: 0,
  rowsSkipped: 0,
  agents: 0,
  carriers: 0,
  lobs: 0,
  users: 0,
  accounts: 0,
  policies: 0,
  errors: [],
};

function report(type: 'progress' | 'done'): void {
  parentPort?.postMessage({ type, stats: { ...stats, errors: stats.errors.slice(0, 20) } });
}

// name -> _id cache for the tiny lookup collections (agent 3 / carrier 46 / lob 19) -- saves a DB hit per row.
class LookupCache {
  private map = new Map<string, Types.ObjectId>();
  private Model: Model<any>;
  private field: string;
  private counterKey: 'agents' | 'carriers' | 'lobs';

  constructor(model: Model<any>, field: string, counterKey: 'agents' | 'carriers' | 'lobs') {
    this.Model = model;
    this.field = field;
    this.counterKey = counterKey;
  }

  async resolveMany(names: Array<string | null>): Promise<void> {
    const missing = [...new Set(names.filter((n): n is string => !!n && !this.map.has(n)))];
    if (!missing.length) return;

    await this.Model.bulkWrite(
      missing.map((name) => ({
        updateOne: {
          filter: { [this.field]: name },
          update: { $setOnInsert: { [this.field]: name } },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const docs = await this.Model.find({ [this.field]: { $in: missing } }, { [this.field]: 1 }).lean();
    for (const d of docs as Array<Record<string, any>>) {
      if (!this.map.has(d[this.field])) stats[this.counterKey]++;
      this.map.set(d[this.field], d._id);
    }
  }

  get(name: string | null): Types.ObjectId | null {
    return name ? this.map.get(name) || null : null;
  }
}

interface Caches {
  agent: LookupCache;
  carrier: LookupCache;
  lob: LookupCache;
  accountIdByKey: Map<string, Types.ObjectId>;
}

/** Drop duplicate keys within a batch -- otherwise two upserts on the same key collide in one bulkWrite. */
function dedupe<T>(items: Array<T | null>, keyFn: (it: T) => string): T[] {
  const m = new Map<string, T>();
  for (const it of items) if (it) m.set(keyFn(it), it);
  return [...m.values()];
}

async function processBatch(mapped: MappedRow[], caches: Caches): Promise<void> {
  // ---- 1. Lookup collections (agent, carrier, lob) ----
  await Promise.all([
    caches.agent.resolveMany(mapped.map((m) => m.agent)),
    caches.carrier.resolveMany(mapped.map((m) => m.carrier)),
    caches.lob.resolveMany(mapped.map((m) => m.lob)),
  ]);

  // ---- 2. Users ----
  const users = dedupe<MappedUser>(mapped.map((m) => m.user), (u) => u.key);
  await User.bulkWrite(
    users.map((u) => ({
      updateOne: {
        filter: { firstname: u.firstname, dob: u.dob },
        update: {
          $set: {
            address: u.address, city: u.city, phone: u.phone, state: u.state,
            zip: u.zip, email: u.email, gender: u.gender, userType: u.userType,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  // Fetch _ids after upsert via indexed firstname $in; exact firstname+dob match is resolved in JS below.
  const userDocs = await User.find(
    { firstname: { $in: users.map((u) => u.firstname) } },
    { firstname: 1, dob: 1 }
  ).lean();

  const userIdByKey = new Map<string, Types.ObjectId>();
  const userKeyById = new Map<string, string>();
  for (const d of userDocs) {
    const key = `${d.firstname.toLowerCase()}|${d.dob ? new Date(d.dob).toISOString().slice(0, 10) : ''}`;
    userIdByKey.set(key, d._id);
    userKeyById.set(String(d._id), key);
  }
  stats.users += users.length;

  // ---- 3. Accounts (need user_id, so after users) ----
  const accounts = dedupe<MappedAccount>(mapped.map((m) => m.account), (a) => a.key).filter((a) =>
    userIdByKey.has(a.userKey)
  );

  if (accounts.length) {
    await Account.bulkWrite(
      accounts.map((a) => ({
        updateOne: {
          filter: { account_name: a.account_name, user_id: userIdByKey.get(a.userKey) },
          update: { $set: { account_type: a.account_type } },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const accDocs = await Account.find(
      { account_name: { $in: accounts.map((a) => a.account_name) } },
      { account_name: 1, user_id: 1 }
    ).lean();

    for (const d of accDocs) {
      const uKey = userKeyById.get(String(d.user_id));
      if (uKey) caches.accountIdByKey.set(`${d.account_name.toLowerCase()}|${uKey}`, d._id);
    }
    stats.accounts += accounts.length;
  }

  // ---- 4. Policies (with all references) ----
  const policies = dedupe<MappedPolicy>(mapped.map((m) => m.policy), (p) => p.policy_number);
  const ops: any[] = [];

  for (const m of mapped) {
    const p = m.policy;
    const userId = userIdByKey.get(p.userKey);
    if (!userId) {
      stats.rowsSkipped++;
      stats.errors.push({ policy_number: p.policy_number, reason: 'user could not be resolved' });
      continue;
    }

    ops.push({
      updateOne: {
        filter: { policy_number: p.policy_number },
        update: {
          $set: {
            policy_start_date: p.policy_start_date,
            policy_end_date: p.policy_end_date,
            policy_mode: p.policy_mode,
            policy_type: p.policy_type,
            premium_amount: p.premium_amount,
            premium_amount_written: p.premium_amount_written,
            producer: p.producer,
            csr: p.csr,
            category_id: caches.lob.get(m.lob),
            company_id: caches.carrier.get(m.carrier),
            agent_id: caches.agent.get(m.agent),
            user_id: userId,
            account_id: p.accountKey ? caches.accountIdByKey.get(p.accountKey) || null : null,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) {
    await Policy.bulkWrite(ops, { ordered: false });
    stats.policies += policies.length;
  }
}

async function run(): Promise<void> {
  await mongoose.connect(input.mongoUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 });

  const caches: Caches = {
    agent: new LookupCache(Agent, 'name', 'agents'),
    carrier: new LookupCache(Carrier, 'company_name', 'carriers'),
    lob: new LookupCache(LOB, 'category_name', 'lobs'),
    accountIdByKey: new Map(),
  };

  let batch: MappedRow[] = [];

  for await (const raw of streamRows(input.filePath)) {
    stats.rowsRead++;

    const mapped = mapRow(raw);
    if (!mapped) {
      stats.rowsSkipped++;
      continue;
    }
    batch.push(mapped);

    if (batch.length >= BATCH_SIZE) {
      await processBatch(batch, caches);
      batch = [];
      report('progress');
    }
  }

  if (batch.length) await processBatch(batch, caches);

  await mongoose.disconnect();
  report('done');
}

run().catch(async (err: Error) => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  parentPort?.postMessage({ type: 'error', message: err.message, stack: err.stack });
});
