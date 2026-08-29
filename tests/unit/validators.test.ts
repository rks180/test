import { describe, it, expect } from 'vitest';
import { createBody, listQuery } from '../../src/validators/message.schema';
import { searchQuery } from '../../src/validators/policy.schema';
import { stressBody } from '../../src/validators/cpu.schema';
import { pagination } from '../../src/validators/common.schema';

describe('message schema', () => {
  it('accepts a valid day + time', () => {
    expect(createBody.parse({ message: 'hi', day: '2026-09-01', time: '14:30' })).toMatchObject({ time: '14:30' });
  });

  it('rejects wrong formats and impossible clock times', () => {
    expect(() => createBody.parse({ message: 'hi', day: '01-09-2026', time: '14:30' })).toThrow();
    expect(() => createBody.parse({ message: 'hi', day: '2026-09-01', time: '25:00' })).toThrow();
    expect(() => createBody.parse({ message: '', day: '2026-09-01', time: '14:30' })).toThrow();
  });

  it('rejects a calendar-invalid date', () => {
    expect(() => createBody.parse({ message: 'hi', day: '2026-02-31', time: '10:00' })).toThrow();
  });
});

describe('pagination', () => {
  it('coerces query strings and applies defaults', () => {
    expect(pagination.parse({})).toEqual({ page: 1, limit: 20 });
    expect(pagination.parse({ page: '3', limit: '5' })).toEqual({ page: 3, limit: 5 });
  });

  it('bounds limit and page', () => {
    expect(() => pagination.parse({ limit: '5000' })).toThrow();
    expect(() => pagination.parse({ page: '0' })).toThrow();
  });
});

describe('search + stress schemas', () => {
  it('requires a username', () => {
    expect(() => searchQuery.parse({})).toThrow();
    expect(searchQuery.parse({ username: 'Lura' })).toMatchObject({ username: 'Lura', exact: false, page: 1 });
  });

  it('defaults and caps stress seconds', () => {
    expect(stressBody.parse({})).toEqual({ seconds: 10 });
    expect(() => stressBody.parse({ seconds: 120 })).toThrow();
  });

  it('accepts a status filter on the message list', () => {
    expect(listQuery.parse({ status: 'sent' }).status).toBe('sent');
    expect(() => listQuery.parse({ status: 'nope' })).toThrow();
  });
});
