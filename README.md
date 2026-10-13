# TICOH ICT SMART TRADER — Screenshot Analysis Edition

A mobile-first, static HTML/CSS/JavaScript trading analysis workspace. It can be hosted on GitHub Pages or Vercel and does not require a backend for its current features.

## Features implemented

- H4 and M15 PNG/JPG/WEBP uploads with preview and 8 MB per-image limit.
- Symbol selection and manual H4 bias / M15 structure fields.
- Structured trade plan with BUY / SELL / WAIT / NO TRADE.
- Entry, stop loss and TP1–TP3 fields.
- Risk-to-reward calculation when levels are entered and direction is valid.
- Confluence checklist (a checklist count, not a win probability).
- Basic risk calculator using balance, risk %, price distance, target and manually entered costs.
- Local browser storage for plans and journal entries.
- Copy plan, JSON export, saved history, responsive dark UI.
- Explicit disconnected-live-data status.

## Important limitations

This edition is **not an automated chart-vision AI**. It displays uploaded charts and lets the trader record verified observations. It does not reliably infer exact prices, OCR all chart labels, calculate indicators from pixels, or confirm ICT setups automatically. Do not treat manually selected bias, checklist counts, or user-entered prices as independently verified market facts.

The risk calculator does not compute broker-specific lot size because reliable sizing requires the instrument's tick size, tick value, contract size, account currency, commissions and execution conditions. R:R is based on entered prices only.

No live MT5 integration, automatic alerts, broker connection, cloud sync, backtesting engine, or order execution is implemented in this first version.

## Run locally

1. Download or clone this folder.
2. Open `index.html` in a modern browser, or use a local static server for the most consistent browser behavior.
3. Upload screenshots and create a plan.

## Deploy to GitHub Pages

1. Create a GitHub repository named `TICOH-ICT-SMART-TRADER`.
2. Upload `index.html`, `style.css`, `app.js`, and this README.
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

## Deploy to Vercel

1. Push these files to a GitHub repository.
2. In Vercel, import that repository.
3. Use the Other framework preset or static site configuration. No build command is required; the output directory is the repository root.
4. Deploy.

## Local persistence and privacy

Records are stored in this browser using `localStorage`. They do not sync across devices. Clearing browser site data can remove saved records. Do not use shared/public devices for private journals. The JSON export contains saved analysis and journal text but intentionally excludes screenshot image bytes.

## Suggested next phase for genuine automated analysis

- Add a vision/OCR service to read chart labels and visible structure, with explicit uncertainty and human confirmation.
- Add a Python FastAPI service and a connected MT5 terminal on a compatible Windows machine/VPS.
- Read broker OHLC/tick data and broker symbol specifications; compute indicators from actual data.
- Use a secure authenticated API and never place MT5 credentials in frontend JavaScript.
- Add database persistence, historical tests with spread/slippage, and alert delivery.
- Keep order execution disabled unless separately designed, tested and explicitly authorized.

Trading involves substantial risk. This application is an educational decision-support tool and does not guarantee outcomes.
