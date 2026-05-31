import { getAuthenticatedKite } from "./auth";
import { upsertInstruments, type InstrumentRow } from "./data/db";

/**
 * Download the instruments dump for an exchange from Kite and store the
 * symbol -> instrument_token map in the DB. Requires a valid Kite session.
 * Returns the number of instruments stored.
 */
export async function syncInstruments(exchange = "NSE"): Promise<number> {
  const kc = getAuthenticatedKite();
  // kiteconnect's Instrument type marks instrument_token as a string and restricts the
  // exchange arg; we read it loosely and coerce the token to a number ourselves.
  const list = (await (kc as unknown as { getInstruments: (e: string[]) => Promise<unknown> })
    .getInstruments([exchange])) as Array<{
    instrument_token: number | string; tradingsymbol: string; name?: string; exchange?: string; segment?: string;
  }>;
  const rows: InstrumentRow[] = list.map((i) => ({
    instrument_token: Number(i.instrument_token),
    tradingsymbol: i.tradingsymbol,
    name: i.name,
    exchange: i.exchange,
    segment: i.segment,
  }));
  return upsertInstruments(rows);
}
