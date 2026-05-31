import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "market.db");

/** Fake instrument token used by the demo seeder (so the dashboard has DB data without keys). */
export const DEMO_TOKEN = 9999;

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  initSchema(db);
  return db;
}

function initSchema(d: Database.Database): void {
  d.exec(`
    CREATE TABLE IF NOT EXISTS instruments (
      instrument_token INTEGER PRIMARY KEY,
      tradingsymbol TEXT NOT NULL,
      name TEXT,
      exchange TEXT,
      segment TEXT,
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(tradingsymbol, exchange);

    CREATE TABLE IF NOT EXISTS candles (
      instrument_token INTEGER NOT NULL,
      interval TEXT NOT NULL,
      ts TEXT NOT NULL,            -- IST ISO timestamp, e.g. 2026-05-01T09:15:00+05:30
      open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL, close REAL NOT NULL,
      volume INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (instrument_token, interval, ts)   -- makes re-fetch idempotent
    );

    CREATE TABLE IF NOT EXISTS series_meta (
      instrument_token INTEGER NOT NULL,
      interval TEXT NOT NULL,
      last_fetched_at TEXT,
      PRIMARY KEY (instrument_token, interval)
    );
  `);
}

export interface CandleRow { ts: string; open: number; high: number; low: number; close: number; volume: number; }
export interface InstrumentRow { instrument_token: number; tradingsymbol: string; name?: string; exchange?: string; segment?: string; }

/** Idempotent insert/update of candles (re-fetching the same window never duplicates). */
export function upsertCandles(token: number, interval: string, rows: CandleRow[]): number {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO candles (instrument_token, interval, ts, open, high, low, close, volume)
    VALUES (@token, @interval, @ts, @open, @high, @low, @close, @volume)
    ON CONFLICT(instrument_token, interval, ts) DO UPDATE SET
      open=excluded.open, high=excluded.high, low=excluded.low, close=excluded.close, volume=excluded.volume
  `);
  const tx = d.transaction((items: CandleRow[]) => {
    for (const r of items) {
      stmt.run({ token, interval, ts: r.ts, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume });
    }
  });
  tx(rows);
  d.prepare(`INSERT INTO series_meta (instrument_token, interval, last_fetched_at) VALUES (?,?,?)
             ON CONFLICT(instrument_token, interval) DO UPDATE SET last_fetched_at=excluded.last_fetched_at`)
    .run(token, interval, new Date().toISOString());
  return rows.length;
}

export function getCandles(token: number, interval: string, limit = 1000): CandleRow[] {
  return getDb()
    .prepare(`SELECT ts, open, high, low, close, volume FROM candles
              WHERE instrument_token=? AND interval=? ORDER BY ts ASC LIMIT ?`)
    .all(token, interval, limit) as CandleRow[];
}

export function countCandles(token: number, interval: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM candles WHERE instrument_token=? AND interval=?`)
    .get(token, interval) as { n: number };
  return row.n;
}

export function upsertInstruments(rows: InstrumentRow[]): number {
  const d = getDb();
  const now = new Date().toISOString();
  const stmt = d.prepare(`
    INSERT INTO instruments (instrument_token, tradingsymbol, name, exchange, segment, updated_at)
    VALUES (@instrument_token, @tradingsymbol, @name, @exchange, @segment, @updated_at)
    ON CONFLICT(instrument_token) DO UPDATE SET
      tradingsymbol=excluded.tradingsymbol, name=excluded.name, exchange=excluded.exchange,
      segment=excluded.segment, updated_at=excluded.updated_at
  `);
  const tx = d.transaction((items: InstrumentRow[]) => {
    for (const r of items) {
      stmt.run({
        instrument_token: r.instrument_token, tradingsymbol: r.tradingsymbol,
        name: r.name ?? null, exchange: r.exchange ?? null, segment: r.segment ?? null, updated_at: now,
      });
    }
  });
  tx(rows);
  return rows.length;
}

export function tokenForSymbol(tradingsymbol: string, exchange = "NSE"): number | null {
  const row = getDb()
    .prepare(`SELECT instrument_token FROM instruments WHERE tradingsymbol=? AND exchange=? LIMIT 1`)
    .get(tradingsymbol, exchange) as { instrument_token: number } | undefined;
  return row?.instrument_token ?? null;
}
