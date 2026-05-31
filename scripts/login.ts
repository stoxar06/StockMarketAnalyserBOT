import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig } from "../src/config";
import { getLoginUrl, exchangeRequestToken, getAuthenticatedKite } from "../src/auth";

/**
 * Daily login flow (Kite access tokens expire every morning):
 *  1. Open the printed Kite login URL in a browser and log in to Zerodha.
 *  2. After login you are redirected to a URL containing `request_token=...`.
 *  3. Paste that request_token here; we exchange it for today's access token.
 *  4. We then fetch your profile as the Phase 1 success check.
 */
async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log(
    cfg.dryRun
      ? "DRY_RUN is ON — no real orders will ever be placed."
      : "WARNING: DRY_RUN is OFF — live order placement is enabled.",
  );
  console.log("\n1) Open this URL, log in to Zerodha, and approve:\n");
  console.log("   " + getLoginUrl(cfg) + "\n");
  console.log("2) You'll be redirected to a URL like:");
  console.log("   https://<your-redirect>/?...&request_token=XXXXXX&...\n");

  const rl = readline.createInterface({ input, output });
  const requestToken = (await rl.question("3) Paste the request_token here: ")).trim();
  rl.close();

  if (!requestToken) {
    console.error("No request_token provided. Aborting.");
    process.exit(1);
  }

  console.log("\nExchanging request_token for an access token...");
  await exchangeRequestToken(requestToken, cfg);
  console.log("Session cached for today.\n");

  // Phase 1 success check: prove authentication works.
  const kc = getAuthenticatedKite(cfg);
  const profile: any = await kc.getProfile();
  console.log("Logged in as:", profile.user_name, `(${profile.user_id})`);
  console.log("Email:", profile.email);
}

main().catch((err) => {
  console.error("\nLogin failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
