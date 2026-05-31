# Zerodha Kite Algo-Trading Project — Plan

## Reality Check (read this first)

- **100% accuracy does not exist.** No system, fund, or model predicts market moves perfectly. Anything claiming this is wrong or a scam.
- **1–3% per day is not a realistic target.** That compounds to thousands of % a year. Top quant funds aim for 15–30% *annually*.
- **Goal of this project:** Build a *legitimate, automated, risk-controlled* trading system on Zerodha Kite Connect, test it honestly, and only risk real money after it proves itself. Survival first, profit second.

---

## Tech Stack

- **Language:** Python 3.11+
- **Broker API:** Zerodha Kite Connect (`kiteconnect` official library) — ~₹2,000/month per app
- **Data storage:** SQLite (local) for historical candles + trade logs
- **Live feed:** Kite WebSocket ticker (`KiteTicker`)
- **Config/secrets:** `.env` file (python-dotenv) — never hardcode keys
- **Analysis:** pandas, numpy
- **Backtesting:** custom engine (start simple) or `backtesting.py`

---

## Phase 1 — Setup (Day 1)

1. Sign up for Kite Connect at kite.trade. Create an app. Note the **API key** + **API secret**.
2. Create project structure (see below) and a Python virtual environment.
3. Install dependencies: `kiteconnect`, `pandas`, `numpy`, `python-dotenv`.
4. Build the login/auth flow: generate request token → exchange for access token → save session.
5. **Success check:** fetch and print your Kite profile.

## Phase 2 — Data (Days 2–4)

1. Fetch historical candle data (e.g. NIFTY 50 stocks, 1-day and 5-min candles).
2. Store candles in SQLite so you don't re-hit rate limits.
3. Connect the WebSocket ticker; print live ticks for a few instruments.
4. **Success check:** one command pulls a year of daily candles for a symbol into the DB.

## Phase 3 — Strategy + Backtest (Week 2)

1. Define ONE simple, fully-specified rule. Example: buy when 20-period MA crosses above 50-period MA, exit on reverse cross or stop-loss.
2. Build a backtest loop over historical data.
3. Report: win rate, avg gain/loss, max drawdown, total return, number of trades — **after** subtracting brokerage + slippage (~0.03–0.05% per side as a rough estimate; verify Zerodha's actual charges).
4. **Success check:** an honest backtest report. If it loses money on paper, the strategy is wrong — do NOT proceed to real money.

## Phase 4 — Paper Trade (Weeks 3–4)

1. Run the strategy live during market hours, but **log trades to a file instead of placing orders**.
2. Compare what it *would* have done vs actual market fills for 5–10 sessions.
3. **Success check:** paper results roughly match backtest expectations.

## Phase 5 — Small Live Trading + Risk Controls

Only after Phase 4 looks sane. Mandatory before any real order:

- **Per-trade stop-loss** (hard, automatic).
- **Position sizing rule** (e.g. risk max 1% of capital per trade).
- **Max daily loss limit** — if hit, the bot shuts down for the day automatically.
- **Start tiny** (1 share / smallest viable size). Scale only after weeks of stable behaviour.

---

## Project Structure

```
kite-algo/
├── .env                  # API keys (gitignored, never commit)
├── .gitignore
├── requirements.txt
├── config.py             # loads .env, constants
├── auth.py               # Kite login / session management
├── data/
│   ├── fetch_historical.py
│   ├── live_ticker.py
│   └── market.db         # SQLite (gitignored)
├── strategy/
│   └── ma_crossover.py   # the rule(s)
├── backtest/
│   └── engine.py
├── risk/
│   └── risk_manager.py   # stop-loss, sizing, daily loss limit
├── live/
│   ├── paper_trade.py
│   └── live_trade.py
└── logs/
```

---

## Hard Rules (non-negotiable)

1. Never commit `.env` or any API key to git.
2. Never place a live order before paper trading passes.
3. Every live strategy must have a stop-loss and a max-daily-loss kill switch.
4. Backtest results that ignore costs are fiction — always include brokerage + slippage.
5. If you can't explain why a trade was made, don't automate it.

---

## First Command to Give Claude Code

> "Set up the kite-algo project structure from PROJECT_PLAN.md. Start with Phase 1: create the folders, requirements.txt, .gitignore, config.py, and auth.py for Zerodha Kite Connect login. Use python-dotenv for secrets. Don't write any trading logic yet — just get authentication working and print my profile."
