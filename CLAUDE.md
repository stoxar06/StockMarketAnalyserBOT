# CLAUDE.md

Project instructions for Claude Code. Read this before doing anything in this repo.

## What this project is

An automated trading system for **Zerodha Kite Connect** (Indian stock market), built in Python. The owner wants a legitimate, risk-controlled algo-trading bot — built and tested in phases, not a get-rich-quick script.

## Ground truths — do not violate these

- **There is no 100% accuracy.** If the owner asks for a strategy guaranteed to win, or 1–3% daily returns, gently push back and steer toward realistic, backtested, risk-managed approaches. Do not build or imply guaranteed returns.
- **Survival before profit.** A strategy that loses slowly while learning is fine; one that risks blowing up the account is not.
- **Honesty over enthusiasm.** Report backtest results truthfully, including losses and costs. Never hide drawdowns to make a strategy look good.

## Tech stack

- Node.js (LTS 20+) + TypeScript (strict mode)
- `kiteconnect` (official Zerodha JS/TS client)
- `technicalindicators` for indicators; plain typed arrays for data
- `better-sqlite3` for historical data + trade logs
- Money in integer paise (or `decimal.js`) — never raw floats for costs/P&L
- `dotenv` for secrets; `vitest` for tests
- Product: equity cash, CNC (delivery) for the first strategy

## Build order (phases)

1. **Setup** — project structure, venv, auth, fetch profile.
2. **Data** — historical candles to SQLite, live WebSocket ticker.
3. **Strategy + backtest** — ONE simple rule, honest backtest with costs.
4. **Paper trade** — log simulated trades, no real orders.
5. **Live (small) trading** — only after paper trading passes, with full risk controls.

Do not skip ahead. Do not write live order placement before paper trading is in place and validated.

## Hard coding rules

- **Never hardcode API keys.** Always read from `.env`. Never print secrets to logs.
- **Never commit `.env`, `*.db`, or `logs/`.** Keep them in `.gitignore`.
- **Every live strategy must include:** a per-trade stop-loss, position sizing (default: risk ≤1% of capital per trade), and a max-daily-loss kill switch that halts trading for the day.
- **Backtests must subtract brokerage + slippage.** Verify Zerodha's actual charges; don't assume zero cost.
- Keep functions small and readable. Comment *why* a trade decision is made, not just what.
- Handle Kite API rate limits and errors gracefully (retries with backoff; never spam orders).

## Before placing ANY real order

Confirm with the owner explicitly. Live trading code should default to a `DRY_RUN=True` flag that must be manually turned off.

## Style

- Be direct. If a request is risky or unrealistic, say so before coding it.
- Prefer simple, debuggable solutions over clever ones.
- When unsure about Zerodha API behaviour, check the official Kite Connect docs rather than guessing.
