import { syncInstruments } from "../src/instruments";
import { fetchHistorical } from "../src/data/historical";
import { tokenForSymbol } from "../src/data/db";

/**
 * Fetch ~1 year of daily candles for one NSE symbol into data/market.db.
 *   Usage: npm run fetch -- INFY
 * Requires a valid Kite session first: `npm run login`.
 */
async function main(): Promise<void> {
  const symbol = process.argv[2];
  if (!symbol) {
    console.error("Usage: npm run fetch -- SYMBOL   (e.g. npm run fetch -- INFY)");
    process.exit(1);
  }

  console.log("Syncing NSE instruments...");
  const n = await syncInstruments("NSE");
  console.log(`  stored ${n} instruments.`);

  const token = tokenForSymbol(symbol, "NSE");
  if (!token) {
    console.error(`Symbol "${symbol}" not found on NSE.`);
    process.exit(1);
  }

  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);

  console.log(`Fetching 1y daily candles for ${symbol} (token ${token})...`);
  const stored = await fetchHistorical(token, "day", from.toISOString(), to.toISOString());
  console.log(`Done. Stored ${stored} daily candles for ${symbol} in data/market.db.`);
}

main().catch((e) => {
  console.error("fetch failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
