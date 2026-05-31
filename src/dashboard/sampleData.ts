/**
 * Sample data for the dashboard, so the UI is visible before real data exists.
 * Numbers are deliberately modest/realistic (no fantasy returns).
 * These functions will be replaced by reads from data/market.db (candles, trades)
 * and the Kite API (profile) once Phase 2+ and your API keys are in place.
 */

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  date: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  pnl: number;
}

export interface BacktestSummary {
  strategy: string;
  trades: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalReturnPct: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Seeded random walk so the demo chart looks like real OHLC and is repeatable. */
export function sampleCandles(days = 150, startPrice = 1500): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  let seed = 42;
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const start = new Date();
  start.setDate(start.getDate() - days);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const open = price;
    const close = Math.max(1, open + (rand() - 0.48) * price * 0.02);
    const high = Math.max(open, close) * (1 + rand() * 0.01);
    const low = Math.min(open, close) * (1 - rand() * 0.01);
    candles.push({
      time: d.toISOString().slice(0, 10),
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
    });
    price = close;
  }
  return candles;
}

export function sampleTrades(): Trade[] {
  return [
    { date: "2026-05-04", symbol: "DEMOEQ", side: "BUY", qty: 10, price: 1485.2, pnl: 0 },
    { date: "2026-05-12", symbol: "DEMOEQ", side: "SELL", qty: 10, price: 1523.8, pnl: 386.0 },
    { date: "2026-05-18", symbol: "DEMOEQ", side: "BUY", qty: 12, price: 1502.1, pnl: 0 },
    { date: "2026-05-25", symbol: "DEMOEQ", side: "SELL", qty: 12, price: 1478.4, pnl: -284.4 },
    { date: "2026-05-29", symbol: "DEMOEQ", side: "BUY", qty: 11, price: 1466.0, pnl: 0 },
  ];
}

export function sampleBacktestSummary(): BacktestSummary {
  // Modest, honest-looking numbers — this is a marginal strategy, as expected.
  return {
    strategy: "20/50 MA crossover (SAMPLE)",
    trades: 24,
    winRatePct: 46,
    profitFactor: 1.18,
    maxDrawdownPct: 9.4,
    totalReturnPct: 7.2,
  };
}
