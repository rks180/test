// Minimal type shim -- csv-parser ships no declarations of its own.
declare module 'csv-parser' {
  import { Transform } from 'stream';

  interface CsvParserOptions {
    separator?: string;
    quote?: string;
    escape?: string;
    newline?: string;
    headers?: readonly string[] | boolean;
    mapHeaders?: (args: { header: string; index: number }) => string | null;
    mapValues?: (args: { header: string; index: number; value: string }) => unknown;
    strict?: boolean;
    skipLines?: number;
  }

  function csvParser(options?: CsvParserOptions | readonly string[]): Transform;
  export = csvParser;
}
