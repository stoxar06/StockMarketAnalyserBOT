import { KiteConnect } from "kiteconnect";
import fs from "node:fs";
import { loadConfig, type Config } from "./config";

/** Instance type of the Kite client (the `KiteConnect` export is the constructor). */
type KiteClient = InstanceType<typeof KiteConnect>;

interface CachedSession {
  accessToken: string;
  /** IST calendar date (YYYY-MM-DD) the token was created. Kite tokens expire daily. */
  date: string;
}

/**
 * Today's date in IST (Asia/Kolkata) as YYYY-MM-DD.
 * Forced to the India timezone regardless of the host machine's timezone,
 * because the live bot may run on a server in another region.
 */
export function istDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function ensureDataDir(cfg: Config): void {
  if (!fs.existsSync(cfg.dataDir)) fs.mkdirSync(cfg.dataDir, { recursive: true });
}

/** Build a KiteConnect client for the configured API key. */
export function makeKite(cfg: Config = loadConfig()): KiteClient {
  return new KiteConnect({ api_key: cfg.apiKey });
}

/** The Kite login URL the user opens in a browser to log in and obtain a request_token. */
export function getLoginUrl(cfg: Config = loadConfig()): string {
  return makeKite(cfg).getLoginURL();
}

/**
 * Exchange a request_token (from the post-login redirect) for an access_token
 * and cache it for the day. The access_token is a secret, so the session file
 * is gitignored and written with owner-only permissions.
 */
export async function exchangeRequestToken(
  requestToken: string,
  cfg: Config = loadConfig(),
): Promise<string> {
  const kc = makeKite(cfg);
  // NOTE: verify exact return shape against the kiteconnect (Node) docs as the lib evolves.
  const session: any = await kc.generateSession(requestToken, cfg.apiSecret);
  const accessToken: string = session.access_token;
  ensureDataDir(cfg);
  const cached: CachedSession = { accessToken, date: istDate() };
  fs.writeFileSync(cfg.sessionFile, JSON.stringify(cached, null, 2), { mode: 0o600 });
  return accessToken;
}

/** Returns today's cached access token, or null if absent/stale (re-login needed). */
export function loadTodaysToken(cfg: Config = loadConfig()): string | null {
  if (!fs.existsSync(cfg.sessionFile)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(cfg.sessionFile, "utf8")) as CachedSession;
    return cached.date === istDate() ? cached.accessToken : null;
  } catch {
    return null;
  }
}

/**
 * Returns a KiteConnect client authenticated with today's cached token.
 * Throws (with instructions) if there is no valid token — Kite tokens expire
 * every morning, so a daily re-login is required.
 */
export function getAuthenticatedKite(cfg: Config = loadConfig()): KiteClient {
  const token = loadTodaysToken(cfg);
  if (!token) {
    throw new Error(
      "No valid Kite session for today. Run `npm run login` to log in (tokens expire daily).",
    );
  }
  const kc = makeKite(cfg);
  kc.setAccessToken(token);
  return kc;
}
