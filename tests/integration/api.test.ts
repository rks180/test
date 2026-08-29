import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

import { startDb, stopDb, clearDb } from '../setup-db';
import app from '../../src/app';
import { User, Policy, Carrier, LOB, Agent, Account, Message } from '../../src/models';

async function seed() {
  const [agent, carrier, lob] = await Promise.all([
    Agent.create({ name: 'Alex Watson' }),
    Carrier.create({ company_name: 'Integon Gen Ins Corp' }),
    LOB.create({ category_name: 'Commercial Auto' }),
  ]);

  const lura = await User.create({ firstname: 'Lura Lucca', dob: new Date('1960-02-11'), email: 'lura@example.com', state: 'NC' });
  const torie = await User.create({ firstname: 'Torie Buchanan', dob: new Date('1946-10-17'), email: 'torie@example.com', state: 'NC' });
  const account = await Account.create({ account_name: 'Lura Lucca & Owen Dodson', account_type: 'Commercial', user_id: lura._id });

  await Policy.create([
    {
      policy_number: 'YEEX9MOIBU7X', premium_amount: 1180.83, premium_amount_written: 100, policy_type: 'Single',
      policy_start_date: new Date('2018-11-02'), user_id: lura._id, agent_id: agent._id,
      company_id: carrier._id, category_id: lob._id, account_id: account._id,
    },
    {
      policy_number: 'SECOND1', premium_amount: 819.17, policy_type: 'Package',
      policy_start_date: new Date('2019-01-01'), user_id: lura._id, agent_id: agent._id,
      company_id: carrier._id, category_id: lob._id, account_id: account._id,
    },
    {
      policy_number: '7CZ3CLKWMSKH', premium_amount: 2105.9, policy_type: 'Single',
      policy_start_date: new Date('2018-11-09'), user_id: torie._id, agent_id: agent._id,
      company_id: carrier._id, category_id: lob._id,
    },
  ]);

  return { lura, torie };
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('health + routing', () => {
  it('GET /health reports ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', pid: process.pid });
  });

  it('unknown route returns a JSON 404', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toBe('Route not found');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});

describe('Task 1.2 -- search policy info by username', () => {
  it('returns every policy of the matching user, references populated', async () => {
    await seed();
    const res = await request(app).get('/search?username=Lura').expect(200);

    expect(res.body.matchedUsers).toHaveLength(1);
    expect(res.body.matchedUsers[0].firstname).toBe('Lura Lucca');
    expect(res.body.meta.total).toBe(2);
    expect(res.body.policies[0].company_id.company_name).toBe('Integon Gen Ins Corp');
    expect(res.body.policies[0].agent_id.name).toBe('Alex Watson');
    expect(res.body.policies[0].category_id.category_name).toBe('Commercial Auto');
  });

  it('matches case-insensitively on a substring, and exactly with ?exact=true', async () => {
    await seed();
    await request(app).get('/search?username=lura').expect(200);
    await request(app).get('/search?username=lura&exact=true').expect(404);
    await request(app).get('/search?username=Lura%20Lucca&exact=true').expect(200);
  });

  it('treats regex characters in the username as literal text', async () => {
    await seed();
    await request(app).get('/search?username=.%2A').expect(404); // ".*" must not match everything
  });

  it('400 without a username, 404 for an unknown one', async () => {
    await seed();
    const bad = await request(app).get('/search').expect(400);
    expect(bad.body.error).toBe('Validation failed');
    await request(app).get('/search?username=zzzznope').expect(404);
  });

  it('paginates', async () => {
    await seed();
    const res = await request(app).get('/search?username=Lura&page=2&limit=1').expect(200);
    expect(res.body.policies).toHaveLength(1);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('is reachable under /api as well', async () => {
    await seed();
    const res = await request(app).get('/api/policies/search?username=Lura').expect(200);
    expect(res.body.meta.total).toBe(2);
  });
});

describe('Task 1.3 -- aggregated policy by user', () => {
  it('groups policies per user with counts and premium totals', async () => {
    await seed();
    const res = await request(app).get('/aggregate').expect(200);

    expect(res.body.meta.totalUsers).toBe(2);
    const lura = res.body.users.find((u: { username: string }) => u.username === 'Lura Lucca');
    expect(lura.policyCount).toBe(2);
    expect(lura.totalPremium).toBe(2000); // 1180.83 + 819.17
    expect(lura.totalPremiumWritten).toBe(100);
    expect(lura.policyNumbers).toEqual(expect.arrayContaining(['YEEX9MOIBU7X', 'SECOND1']));
  });

  it('filters to one user with ?username', async () => {
    await seed();
    const res = await request(app).get('/aggregate?username=Torie').expect(200);
    expect(res.body.meta.totalUsers).toBe(1);
    expect(res.body.users[0].policyCount).toBe(1);
  });

  it('sorts by policy count and paginates', async () => {
    await seed();
    const page1 = await request(app).get('/aggregate?page=1&limit=1').expect(200);
    const page2 = await request(app).get('/aggregate?page=2&limit=1').expect(200);
    expect(page1.body.users[0].username).toBe('Lura Lucca'); // 2 policies first
    expect(page2.body.users[0].username).toBe('Torie Buchanan');
    expect(page1.body.meta.totalPages).toBe(2);
  });
});

describe('Task 1.4 -- one collection per entity', () => {
  it('GET /api/stats counts every collection separately', async () => {
    await seed();
    const res = await request(app).get('/api/stats').expect(200);
    expect(res.body).toMatchObject({ agents: 1, carriers: 1, lobs: 1, users: 2, accounts: 1, policies: 3 });
  });

  it('GET /api/data/:collection browses documents, rejects unknown names', async () => {
    await seed();
    const res = await request(app).get('/api/data/policies?limit=2').expect(200);
    expect(res.body.docs).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
    await request(app).get('/api/data/foobar').expect(400);
  });
});

describe('Task 2.2 -- scheduled messages', () => {
  it('POST /scheduleMessage stores the message with a computed sendAt', async () => {
    const res = await request(app)
      .post('/scheduleMessage')
      .send({ message: 'renewal reminder', day: '2027-01-01', time: '09:30' })
      .expect(201);

    expect(res.body.data).toMatchObject({ message: 'renewal reminder', status: 'scheduled' });
    expect(new Date(res.body.data.sendAt).getHours()).toBe(9);
    expect(await Message.countDocuments()).toBe(1);
  });

  it('rejects bad input, including a date that does not exist', async () => {
    await request(app).post('/scheduleMessage').send({ message: 'x', day: '01-09-2026', time: '09:30' }).expect(400);
    await request(app).post('/scheduleMessage').send({ message: 'x', day: '2026-09-01', time: '25:00' }).expect(400);
    await request(app).post('/scheduleMessage').send({ message: '', day: '2026-09-01', time: '09:30' }).expect(400);

    const res = await request(app).post('/scheduleMessage').send({ message: 'x', day: '2026-02-31', time: '09:30' }).expect(400);
    expect(JSON.stringify(res.body)).toContain('real calendar date');
  });

  it('lists, filters and fetches messages under /api', async () => {
    const created = await request(app).post('/api/messages').send({ message: 'a', day: '2027-01-01', time: '09:30' }).expect(201);
    const id = created.body.data._id;

    const list = await request(app).get('/api/messages?status=scheduled').expect(200);
    expect(list.body.meta.total).toBe(1);

    const one = await request(app).get(`/api/messages/${id}`).expect(200);
    expect(one.body._id).toBe(id);

    await request(app).get('/api/messages/not-an-id').expect(400);
    await request(app).get('/api/messages/64b7f0c2f1a2b3c4d5e6f7a8').expect(404);
  });
});

describe('Task 2.1 -- CPU endpoint', () => {
  it('GET /api/cpu returns a live sample and the configured threshold', async () => {
    const res = await request(app).get('/api/cpu').expect(200);
    expect(res.body.threshold).toBeGreaterThan(0);
    expect(res.body.current.processCpu).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('validates the stress payload', async () => {
    await request(app).post('/api/cpu/stress').send({ seconds: 999 }).expect(400);
  });
});

describe('Task 1.1 -- upload endpoint guards', () => {
  it('400 when no file is attached', async () => {
    const res = await request(app).post('/upload').expect(400);
    expect(res.body.error).toContain('file is required');
  });

  it('400 for an unsupported extension', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.from('nope'), 'notes.txt').expect(400);
    expect(res.body.error).toContain('allowed');
  });

  it('404 for an unknown job id', async () => {
    await request(app).get('/api/upload/does-not-exist').expect(404);
  });
});
