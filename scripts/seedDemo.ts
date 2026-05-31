import { upsertCandles, upsertInstruments, countCandles, DEMO_TOKEN, type CandleRow } from "../src/data/db";
import { sampleCandles } from "../src/dashboard/sampleData";

/**
 * Seed the SQLite DB with demo daily candles for "DEMOEQ" so the dashboard
 * shows real database-backed data without needing Kite API keys.
 * Idempotent — running it twice does not duplicate rows.
 *   Usage: npm run seed:demo
 */
function main(): void {
  upsertInstruments([
    { instrument_token: DEMO_TOKEN, tradingsymbol: "DEMOEQ", name: "Demo Equity", exchange: "NSE", segment: "NSE" },
  ]);

  const rows: CandleRow[] = sampleCandles(150).map((c) => ({
    ts: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
    volume: 10_000 + Math.round(Math.random() * 5_000),
  }));
  upsertCandles(DEMO_TOKEN, "day", rows);

  console.log(`Seeded DEMOEQ → ${countCandles(DEMO_TOKEN, "day")} daily candles in data/market.db.`);
  console.log("Open the dashboard (npm run dashboard) — it now reads candles from the database.");
}

main();
