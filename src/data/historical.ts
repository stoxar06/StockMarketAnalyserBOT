import { getAuthenticatedKite } from "../auth";
import { upsertCandles, type CandleRow } from "./db";

/**
 * Max days per request by interval (Kite historical API limits).
 * Longer ranges are fetched as multiple chunked requests.
 */
const MAX_DAYS: Record<string, number> = {
  minute: 60, "3minute": 100, "5minute": 100, "10minute": 100,
  "15minute": 200, "30minute": 200, "60minute": 400, day: 2000,
};

const DAY_MS = 86_400_000;
const RATE_LIMIT_MS = 400; // stay under the historical API's ~3 req/s ceiling

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await sleep(500 * 2 ** i); // exponential backoff
    }
  }
  throw lastErr;
}

/** Format a date as an IST ISO string (preserves the +05:30 offset; avoids UTC date-shift bugs). */
function toIstIso(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const g = (t: string): string => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}+05:30`;
}

/**
 * Fetch historical candles for [fromISO, toISO] and store them (idempotently) in the DB.
 * Requires a valid Kite session (`npm run login` first). Returns the number of candles stored.
 */
export async function fetchHistorical(
  token: number, interval: string, fromISO: string, toISO: string,
): Promise<number> {
  const kc = getAuthenticatedKite();
  const maxDays = MAX_DAYS[interval] ?? 60;
  const end = new Date(toISO);
  let chunkStart = new Date(fromISO);
  let total = 0;

  while (chunkStart < end) {
    const chunkEnd = new Date(Math.min(end.getTime(), chunkStart.getTime() + maxDays * DAY_MS));
    // kiteconnect types `interval` as a strict union; we accept any interval string and pass it through.
    const data = (await withRetry(() =>
      (kc as unknown as { getHistoricalData: (...args: unknown[]) => Promise<unknown> })
        .getHistoricalData(token, interval, chunkStart, chunkEnd, false),
    )) as Array<{ date: string | Date; open: number; high: number; low: number; close: number; volume?: number }>;

    const rows: CandleRow[] = (data ?? []).map((c) => ({
      ts: toIstIso(c.date),
      open: c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume ?? 0,
    }));
    total += upsertCandles(token, interval, rows);

    chunkStart = new Date(chunkEnd.getTime() + DAY_MS);
    await sleep(RATE_LIMIT_MS);
  }
  return total;
}
