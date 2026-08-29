import { describe, it, expect } from 'vitest';
import { mapRow, str, toDate, toNum, userKey, accountKey } from '../../src/utils/rowMapper';

const row = {
  agent: 'Alex Watson',
  userType: 'Active Client',
  policy_mode: '12',
  producer: 'Brandie Placencia',
  policy_number: 'YEEX9MOIBU7X',
  premium_amount_written: '',
  premium_amount: '1180.83',
  policy_type: 'Single',
  company_name: 'Integon Gen Ins Corp',
  category_name: 'Commercial Auto',
  policy_start_date: '2018-11-02',
  policy_end_date: '2019-11-02',
  csr: 'Tami Ellison',
  account_name: 'Lura Lucca & Owen Dodson',
  email: 'MAdler@Yahoo.ca',
  firstname: 'Lura Lucca',
  city: 'MOCKSVILLE',
  account_type: 'Commercial',
  phone: '8677356559',
  address: '170 MATTHIAS CT',
  state: 'NC',
  zip: '27028',
  dob: '1960-02-11',
};

describe('cell coercion', () => {
  it('trims strings and unwraps exceljs cell objects', () => {
    expect(str('  hi  ')).toBe('hi');
    expect(str(null)).toBe('');
    expect(str({ text: ' linked ' })).toBe('linked');
    expect(str({ result: 42 })).toBe('42');
  });

  it('parses dates, rejects junk', () => {
    expect(toDate('2018-11-02')?.toISOString().slice(0, 10)).toBe('2018-11-02');
    expect(toDate('not a date')).toBeNull();
    expect(toDate('')).toBeNull();
  });

  it('strips currency noise from numbers and defaults to 0', () => {
    expect(toNum('$1,180.83')).toBe(1180.83);
    expect(toNum('')).toBe(0);
    expect(toNum('abc')).toBe(0);
  });
});

describe('mapRow', () => {
  it('splits one flat row into the six entities', () => {
    const m = mapRow(row)!;
    expect(m.agent).toBe('Alex Watson');
    expect(m.carrier).toBe('Integon Gen Ins Corp');
    expect(m.lob).toBe('Commercial Auto');
    expect(m.user.firstname).toBe('Lura Lucca');
    expect(m.user.email).toBe('madler@yahoo.ca'); // lowercased for dedupe
    expect(m.account?.account_name).toBe('Lura Lucca & Owen Dodson');
    expect(m.policy.policy_number).toBe('YEEX9MOIBU7X');
    expect(m.policy.premium_amount).toBe(1180.83);
    expect(m.policy.premium_amount_written).toBe(0);
  });

  it('links account and policy to the user through the same key', () => {
    const m = mapRow(row)!;
    const expected = userKey('Lura Lucca', new Date('1960-02-11'));
    expect(m.user.key).toBe(expected);
    expect(m.account?.userKey).toBe(expected);
    expect(m.policy.userKey).toBe(expected);
    expect(m.policy.accountKey).toBe(accountKey('Lura Lucca & Owen Dodson', expected));
  });

  it('drops rows with no firstname or no policy_number', () => {
    expect(mapRow({ ...row, firstname: '' })).toBeNull();
    expect(mapRow({ ...row, policy_number: '  ' })).toBeNull();
  });

  it('keeps the policy when the row has no account', () => {
    const m = mapRow({ ...row, account_name: '' })!;
    expect(m.account).toBeNull();
    expect(m.policy.accountKey).toBeNull();
  });

  it('gives two people with the same name different keys via dob', () => {
    const a = mapRow(row)!;
    const b = mapRow({ ...row, dob: '1975-01-01', policy_number: 'OTHER1' })!;
    expect(a.user.key).not.toBe(b.user.key);
  });
});
