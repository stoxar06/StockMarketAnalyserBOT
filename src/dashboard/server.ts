import express from "express";
import path from "node:path";
import { sampleCandles, sampleTrades, sampleBacktestSummary } from "./sampleData";
import { getCandles, DEMO_TOKEN } from "../data/db";

const PORT = 4322;
const HOST = "127.0.0.1"; // localhost only — never expose account data to the network.

const app = express();
app.use(express.static(path.join(process.cwd(), "public")));

/*
 * The dashboard is READ-ONLY — it never places or modifies orders.
 * /api/candles now reads from the SQLite DB (real data path); if the DB is empty
 * it falls back to in-memory sample data so the UI still renders. profile/trades/
 * backtest stay sample until Phases 1/3/4 populate them.
 */

app.get("/api/profile", (_req, res) => {
  res.json({ sample: true, user_name: "Demo User", user_id: "DEMO123", email: "demo@example.com", broker: "ZERODHA" });
});

app.get("/api/candles", (_req, res) => {
  const rows = getCandles(DEMO_TOKEN, "day", 1000);
  if (rows.length > 0) {
    res.json({
      source: "db",
      symbol: "DEMOEQ",
      candles: rows.map((r) => ({ time: r.ts.slice(0, 10), open: r.open, high: r.high, low: r.low, close: r.close })),
    });
  } else {
    res.json({ source: "sample", symbol: "DEMOEQ", candles: sampleCandles() });
  }
});

app.get("/api/trades", (_req, res) => {
  res.json({ sample: true, trades: sampleTrades() });
});

app.get("/api/backtest", (_req, res) => {
  res.json({ sample: true, summary: sampleBacktestSummary() });
});

app.listen(PORT, HOST, () => {
  console.log(`Dashboard running at http://${HOST}:${PORT}  (localhost only, read-only)`);
});
