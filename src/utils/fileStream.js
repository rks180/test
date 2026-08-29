'use strict';

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const ExcelJS = require('exceljs');

// Streams a CSV/XLSX file row by row as header-keyed objects -- flat memory regardless of file size.
async function* streamRows(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const stream = fs.createReadStream(filePath).pipe(
      csvParser({ mapHeaders: ({ header }) => header.trim() })
    );
    for await (const row of stream) yield row;
    return;
  }

  if (ext === '.xlsx' || ext === '.xlsm') {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: 'emit',
      sharedStrings: 'cache',
      worksheets: 'emit',
    });

    let headers = null;
    for await (const worksheet of reader) {
      for await (const row of worksheet) {
        // row.values is 1-indexed; index 0 is always empty.
        const values = row.values;
        if (!headers) {
          headers = values.map((v) => (v == null ? '' : String(v).trim()));
          continue;
        }
        const obj = {};
        for (let i = 1; i < headers.length; i++) {
          if (headers[i]) obj[headers[i]] = values[i];
        }
        yield obj;
      }
      break; // first sheet only
    }
    return;
  }

  throw new Error(`Unsupported file type: ${ext} (only .csv and .xlsx are supported)`);
}

module.exports = { streamRows };
