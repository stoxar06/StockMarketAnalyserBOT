# StockMarketAnalyserBOT

An honest, risk-controlled algo-trading bot for **Zerodha Kite Connect** (Indian equity cash), built in careful phases — see `PROJECT_PLAN.md`. This is a personal, educational project — **not investment advice**, and trading carries real risk of loss.

## Status: Phase 1 — Setup & secure auth

No trading logic yet. This phase gets secure authentication working and fetches your Kite profile.

## Prerequisites
- Node.js 20+
- A **paid** Zerodha Kite Connect app (~₹500/month) → API key + secret from <https://kite.trade>

## Setup
```bash
npm install
cp .env.example .env     # then edit .env and add KITE_API_KEY and KITE_API_SECRET
```

`DRY_RUN` defaults to `true` — the bot will **never place a real order** until you explicitly set it to `false` (much later, only after paper trading passes).

## Daily login (tokens expire every morning)
```bash
npm run login
```
Open the printed URL, log in to Zerodha, then paste the `request_token` from the redirect URL. On success it prints your profile — that is the Phase 1 success check.

## Security
- `.env` and the cached session token (`data/session.json`) are **gitignored** — never commit them.
- The bot never stores your Zerodha password; you log in on Zerodha's own page each day.

## Scripts
- `npm run login` — daily Kite login + profile check
- `npm run typecheck` — TypeScript type check
