'use strict';

/**
 * Import worker -- ye poora file parsing + DB writing ka bhaari kaam MAIN THREAD SE
 * BAAHAR karta hai. Main thread sirf job spawn karke turant response de deta hai,
 * isliye upload ke dauran baaki APIs block nahi hoti.
 *
 * Har worker apna Mongo connection khud banata hai (mongoose connections threads ke
 * beech share nahi ho sakte).
 */

const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');

const { streamRows } = require('../utils/fileStream');
const { mapRow } = require('../utils/rowMapper');
const { Agent, Carrier, LOB, User, Account, Policy } = require('../models');

const BATCH_SIZE = workerData.batchSize || 500;

const stats = {
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

function report(type) {
  parentPort.postMessage({ type, stats: { ...stats, errors: stats.errors.slice(0, 20) } });
}

/**
 * Chhote lookup collections (agent/carrier/lob) ke liye cache.
 * Ye teeno bahut chhote hain (3 / 46 / 19), isliye name -> _id map poori tarah RAM me
 * rakh lena safe hai aur har row pe DB hit bach jati hai.
 */
class LookupCache {
  constructor(Model, field, counterKey) {
    this.Model = Model;
    this.field = field;
    this.counterKey = counterKey;
    this.map = new Map();
  }

  async resolveMany(names) {
    const missing = [...new Set(names.filter((n) => n && !this.map.has(n)))];
    if (!missing.length) return;

    await this.Model.bulkWrite(
      missing.map((name) => ({
        updateOne: { filter: { [this.field]: name }, update: { $setOnInsert: { [this.field]: name } }, upsert: true },
      })),
      { ordered: false }
    );

    const docs = await this.Model.find({ [this.field]: { $in: missing } }, { [this.field]: 1 }).lean();
    for (const d of docs) {
      if (!this.map.has(d[this.field])) stats[this.counterKey]++;
      this.map.set(d[this.field], d._id);
    }
  }

  get(name) {
    return name ? this.map.get(name) || null : null;
  }
}

/** Batch ke andar duplicate keys hata do -- warna ek hi bulkWrite me do upsert same key pe ladenge. */
function dedupe(items, keyFn) {
  const m = new Map();
  for (const it of items) if (it) m.set(keyFn(it), it);
  return [...m.values()];
}

async function processBatch(mapped, caches) {
  // ---- 1. Lookup collections (agent, carrier, lob) ----
  await Promise.all([
    caches.agent.resolveMany(mapped.map((m) => m.agent)),
    caches.carrier.resolveMany(mapped.map((m) => m.carrier)),
    caches.lob.resolveMany(mapped.map((m) => m.lob)),
  ]);

  // ---- 2. Users ----
  const users = dedupe(mapped.map((m) => m.user), (u) => u.key);
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

  // Upsert ke baad _id chahiye. firstname indexed hai, isliye $in query sasti hai;
  // firstname+dob ka final match JS me karte hain (do log same naam alag dob wale ho sakte hain).
  const userDocs = await User.find(
    { firstname: { $in: users.map((u) => u.firstname) } },
    { firstname: 1, dob: 1 }
  ).lean();

  const userIdByKey = new Map();
  const userKeyById = new Map();
  for (const d of userDocs) {
    const key = `${d.firstname.toLowerCase()}|${d.dob ? new Date(d.dob).toISOString().slice(0, 10) : ''}`;
    userIdByKey.set(key, d._id);
    userKeyById.set(String(d._id), key);
  }
  stats.users += users.length;

  // ---- 3. Accounts (user_id chahiye, isliye users ke baad) ----
  const accounts = dedupe(mapped.map((m) => m.account), (a) => a.key).filter((a) => userIdByKey.has(a.userKey));

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

  // ---- 4. Policies (sab references ke saath) ----
  const policies = dedupe(mapped.map((m) => m.policy), (p) => p.policy_number);
  const ops = [];

  for (let i = 0; i < mapped.length; i++) {
    const m = mapped[i];
    const p = m.policy;
    const userId = userIdByKey.get(p.userKey);
    if (!userId) {
      stats.rowsSkipped++;
      stats.errors.push({ policy_number: p.policy_number, reason: 'user resolve nahi hua' });
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
    stats.policies += dedupe(policies, (p) => p.policy_number).length;
  }
}

async function run() {
  await mongoose.connect(workerData.mongoUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 5 });

  const caches = {
    agent: new LookupCache(Agent, 'name', 'agents'),
    carrier: new LookupCache(Carrier, 'company_name', 'carriers'),
    lob: new LookupCache(LOB, 'category_name', 'lobs'),
    accountIdByKey: new Map(),
  };

  let batch = [];

  for await (const raw of streamRows(workerData.filePath)) {
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

run().catch(async (err) => {
  try { await mongoose.disconnect(); } catch (_) {}
  parentPort.postMessage({ type: 'error', message: err.message, stack: err.stack });
});
