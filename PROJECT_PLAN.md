# Zerodha Kite Algo-Trading Bot — Project Plan (Node.js / TypeScript)

## Reality check (read this first)
- **No 100% accuracy. No fixed daily %.** ~90% of individual F&O traders lose money (SEBI data). Anyone promising 99% accuracy or guaranteed/daily returns is selling a fantasy.
- **Survival before profit.** A strategy that loses slowly while learning is fine; one that can blow up the account is not.
- **Honesty over enthusiasm.** Report backtests truthfully — losses, drawdowns, and costs included.
- **The benchmark to beat is a low-cost index.** If the bot can't beat simply buying and holding an index (after costs, risk-adjusted), indexing wins — and that's a valid, honest outcome.
- **Starting capital (e.g. ₹20k) is validation/learning capital, not income.** At ≤1% risk, costs dominate small accounts; don't expect daily income.

## Decisions locked
- **Stack:** Node.js LTS (20+) + TypeScript (strict).
- **Broker:** Zerodha Kite Connect — official `kiteconnect` JS/TS client. Paid plan (₹500/mo; historical data bundled).
- **Product:** Equity cash, **CNC (delivery)** for the first strategy. No F&O / MIS leverage yet.
- **Universe:** liquid large-caps (Nifty 50/100).
- **First strategy:** 20/50 MA crossover — purpose is honest pipeline validation, not guaranteed alpha.
- **`DRY_RUN` defaults true**; going live needs explicit owner OK.

## Verified Kite facts (May 2026 — re-verify, these change)
- ₹500/mo paid Connect plan; **historical data bundled** (separate charge dropped Feb 2025). Free "Personal" API has no market data → paid plan needed.
- **Bracket Orders discontinued (2020)** → we self-manage stop-loss/target (SL-M + monitoring).
- **Static IP required to place orders via API (since Apr 2025)** → live bot runs on a registered static-IP host.
- **Access token expires daily**; interactive login + TOTP → a manual morning login each trading day.
- **Historical API:** per-interval day caps (minute 60d, 5-min 100d, 15–30m 200d, 60m 400d, day 2000d); ~2 req/s; **for backtesting only** — build live candles from the WebSocket tick stream.
- Kite history is **split/bonus-adjusted (not dividends)**; no unadjusted feed.
- SEBI retail-algo framework: under ~10 orders/sec = regular API user (no special registration); our slow bot is well under.

## Build phases (do not skip ahead)

### Phase 1 — Setup & secure auth
- Node/TS project: `package.json`, `tsconfig.json` (strict), `.env` (+ committed `.env.example`), `.gitignore`.
- `config.ts` loads/validates env; **`DRY_RUN` default true**; never log secrets.
- `auth.ts`: login URL → `request_token` → `generateSession` → `access_token`; **cache token for the day** (date-stamped); detect expiry → prompt re-login. `scripts/login.ts` runs the daily login.
- **Success check:** fetch & print Kite profile + margins. *(Deferred until paid app + keys exist; code ready meanwhile.)*

### Phase 2 — Data
- Instruments dump → **symbol/token map**.
- Historical fetch: **chunked** by per-interval caps + **2 req/s** + backoff; **idempotent UPSERT** (`UNIQUE(token,interval,ts)`); store fetch-date per series.
- **Corporate actions:** re-fetch/overwrite around ex-dates; document the dividend (non-adjusted) caveat.
- Live ticker: `KiteTicker`; build candles from ticks (**diff cumulative volume**; align to **IST** boundaries); auto-reconnect + **gap backfill**; keep the tick handler light (no heavy sync DB writes); **validate self-built candles vs historical**.
- **Success check:** idempotent pull of ≥1y daily + recent intraday; live candles print correctly.

### Phase 3 — Strategy & honest backtest
- 20/50 MA crossover, long-only, CNC; **signal on CLOSED bars only; enter next bar's open**.
- `costs.ts`: itemized Zerodha CNC costs (brokerage, STT, exchange, SEBI, GST, stamp), **per-order**, in **paise**; verify vs Zerodha's calculator.
- Backtest engine: **no look-ahead**; indicator alignment + **streaming==batch parity** (unit-tested); train/test + walk-forward; survivorship caveat.
- Metrics: trades, win rate, avg win/loss, profit factor, expectancy, Sharpe/Sortino, max drawdown, max consecutive losses, exposure, CAGR — **net of costs**.
- **Success criteria:** minimum trade count (significance) + out-of-sample + **beat buy-and-hold index, risk-adjusted**. If not, do **not** proceed to money.

### Phase 4 — Paper trade
- Run live during market hours in **`DRY_RUN`** through the **same execution path** live uses; simulate fills (next-tick + slippage); log to the **trade journal** (SQLite) with real-time P&L.
- Compare vs backtest over 5–10 sessions; survive reconnects/restarts without crashing.

### Phase 5 — Small live + risk controls (only after Phase 4 passes)
- **Stop-loss** (SL-M; **not guaranteed** — circuits/gaps can slip past it); **position sizing ≤1%** with guards (max-position cap, min stop distance, divide-by-zero guard, whole shares); **persisted day-reset kill switch** (% of start-of-day equity; best-effort flatten); max positions/exposure; square-off cutoff; **startup state reconciliation**.
- Order handling: partial fills / rejections / pending via status + **postbacks**; **idempotent** crash recovery; per-symbol **state machine** (no duplicate orders).
- Static-IP host; flip `DRY_RUN=false` only on explicit OK; **start tiny**, scale slowly.

## Discipline & fail-safe (the real edge)
- **Discipline by design:** the bot executes pre-set rules mechanically — no fear/greed/revenge. It removes the *emotional* manual option but **keeps safety controls**.
- **Anti-tilt features:** override logging, confirmation + written reason on manual overrides, cooling-off after losses, alerts-not-actions in early phases, an "intervention-cost" report.
- **No "perfect bot":** bugs, bad data, broker/network failures, and black swans are inevitable → **fail safely**. On any uncertainty/error → halt / do nothing / alert. Bounded damage via ≤1% + kill switch — **no single error can ruin you**.
- **Emergency STOP + monitoring** are always available; operation is **supervised**; full autonomy is earned over months.

## Project structure
```
kite-algo/  (this repo)
├── .env / .env.example / .gitignore
├── package.json / tsconfig.json (strict) / README.md
├── src/
│   ├── config.ts            # .env load/validate; DRY_RUN default true
│   ├── auth.ts              # login URL, token exchange, daily token cache; mid-session token-fail handling
│   ├── money.ts             # paise/decimal helpers + rounding
│   ├── instruments.ts       # instruments dump → symbol/token map
│   ├── marketCalendar.ts    # IST (Asia/Kolkata, host-independent) hours + holidays/half-days/Muhurat; isMarketOpen()
│   ├── data/{ db.ts, historical.ts, liveTicker.ts }
│   ├── strategy/{ base.ts, maCrossover.ts }
│   ├── costs.ts             # itemized Zerodha CNC costs, per-order, paise
│   ├── backtest/engine.ts   # next-bar fills, no look-ahead, parity-tested, metrics + index benchmark
│   ├── risk/riskManager.ts  # sizing guards, stop (not guaranteed), persisted day-reset kill switch, caps
│   ├── execution/executor.ts# ONE path; DRY_RUN→simulate; real orders: postbacks, partial-fill/reject, state machine, idempotent, reconciliation
│   ├── journal.ts           # trade log → SQLite + daily P&L; held-position corp-action adj
│   └── notify.ts            # alerts + emergency-stop hooks (log now; Telegram/webhook later)
├── scripts/{ login.ts, fetchData.ts, runBacktest.ts, runBot.ts }
├── tests/{ costs, riskManager, backtest, indicators }.test.ts
├── data/market.db   (gitignored)   └── logs/ (gitignored)
```

## Timezone
All market-time logic uses **IST (`Asia/Kolkata`, fixed UTC+5:30, no DST)** via `luxon`, **enforced in code, independent of the host's timezone** (live may run on a VPS elsewhere). Store timestamps in UTC/epoch; convert to IST for session checks and candle alignment. Kite API timestamps arrive as IST (`+05:30`) and are parsed as such.

## Hard rules (non-negotiable)
1. Never commit `.env`, API keys, `*.db`, or `logs/`. Never log secrets/tokens.
2. No live order before paper trading passes; `DRY_RUN` defaults true; flipping needs explicit owner OK.
3. Every live strategy has a stop-loss + **persisted** max-daily-loss kill switch + an emergency stop.
4. Backtests subtract **full Zerodha costs + slippage** — costless backtests are fiction.
5. Risk-critical code (sizing, kill switch, costs) must have **passing unit tests**.
6. On startup, **reconcile against real broker state**; never assume in-memory truth.
7. Respect rate limits; retry with backoff; never spam/loop orders.
8. On any error or uncertainty, **fail safe** (halt/alert), never guess-and-trade.
9. If you can't explain *why* a trade was made, don't automate it.

## Honest expectations
Realistic equity returns are roughly **10–15%/yr** (volatile, with drawdowns), not 1–3%/day; world-class is ~15–30%/yr. This is a personal, educational project — **not investment advice and not a SEBI-registered advisory service.** Trade only money you can afford to lose.
