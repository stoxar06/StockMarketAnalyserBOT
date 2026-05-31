import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

const ROOT = process.cwd();

export interface Config {
  apiKey: string;
  apiSecret: string;
  /** When true (the default), no real orders are ever placed. */
  dryRun: boolean;
  /** Where the daily access-token session is cached (gitignored). */
  sessionFile: string;
  dataDir: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return v.trim();
}

/**
 * Loads and validates configuration from .env.
 *
 * DRY_RUN defaults to true on purpose: live trading must be turned on
 * explicitly, so an accidental run can never place a real order.
 */
export function loadConfig(): Config {
  const dataDir = path.join(ROOT, "data");
  return {
    apiKey: required("KITE_API_KEY"),
    apiSecret: required("KITE_API_SECRET"),
    dryRun: process.env.DRY_RUN !== "false",
    sessionFile: path.join(dataDir, "session.json"),
    dataDir,
  };
}
