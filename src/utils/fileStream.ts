import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import type { RawRow } from './rowMapper';

// Streams a CSV/XLSX file row by row as header-keyed objects -- flat memory regardless of file size.
export async function* streamRows(filePath: string): AsyncGenerator<RawRow> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const stream = fs
      .createReadStream(filePath)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }));
    for await (const row of stream) yield row as RawRow;
    return;
  }

  if (ext === '.xlsx' || ext === '.xlsm') {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: 'emit',
      sharedStrings: 'cache',
      worksheets: 'emit',
    });

    let headers: string[] | null = null;
    for await (const worksheet of reader) {
      for await (const row of worksheet) {
        // row.values is 1-indexed; index 0 is always empty.
        const values = row.values as unknown[];
        if (!headers) {
          headers = values.map((v) => (v == null ? '' : String(v).trim()));
          continue;
        }
        const obj: RawRow = {};
        for (let i = 1; i < headers.length; i++) {
          const key = headers[i];
          if (key) obj[key] = values[i];
        }
        yield obj;
      }
      break; // first sheet only
    }
    return;
  }

  throw new Error(`Unsupported file type: ${ext} (only .csv and .xlsx are supported)`);
}
