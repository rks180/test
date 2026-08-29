import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ExcelJS from 'exceljs';

import { streamRows } from '../../src/utils/fileStream';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-stream-'));
const csvPath = path.join(dir, 'rows.csv');
const xlsxPath = path.join(dir, 'rows.xlsx');

beforeAll(async () => {
  fs.writeFileSync(
    csvPath,
    ' firstname , policy_number ,premium_amount\nLura Lucca,YEEX9MOIBU7X,1180.83\nTorie Buchanan,7CZ3CLKWMSKH,2105.9\n'
  );

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('data');
  ws.addRow(['firstname', 'policy_number', 'premium_amount']);
  ws.addRow(['Lura Lucca', 'YEEX9MOIBU7X', 1180.83]);
  await wb.xlsx.writeFile(xlsxPath);
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

async function collect(file: string) {
  const rows = [];
  for await (const row of streamRows(file)) rows.push(row);
  return rows;
}

describe('streamRows', () => {
  it('yields CSV rows keyed by trimmed headers', async () => {
    const rows = await collect(csvPath);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ firstname: 'Lura Lucca', policy_number: 'YEEX9MOIBU7X' });
    expect(Object.keys(rows[0])).toContain('premium_amount'); // header was " premium_amount"
  });

  it('yields XLSX rows with the same shape', async () => {
    const rows = await collect(xlsxPath);
    expect(rows[0]).toMatchObject({ firstname: 'Lura Lucca', policy_number: 'YEEX9MOIBU7X' });
  });

  it('rejects unsupported file types', async () => {
    await expect(collect(path.join(dir, 'x.pdf'))).rejects.toThrow('Unsupported file type');
  });
});
