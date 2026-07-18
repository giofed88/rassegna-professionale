# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Static dashboard aggregating daily Italian professional news (fiscale, contabile, consulenza del lavoro, condominio, contenzioso, crisi d'impresa, finanza agevolata) for accountants/tax professionals. No backend, no build step, no frontend framework: three Node scripts produce a single JSON file (`data/news.json`) that a plain HTML+vanilla-JS page reads and renders. A GitHub Action runs the scripts daily, commits the new data, and deploys the site to GitHub Pages.

All user-facing docs, code comments, config `_note` fields, and console output are in Italian — keep new content in Italian to stay consistent.

## Commands

```bash
npm install                                    # install deps (playwright, rss-parser)
npx playwright install --with-deps chromium    # required only for fetch:scraped / fetch:auth

npm run fetch          # scripts/fetch-news.mjs — RSS feeds -> data/news.json (overwrites)
npm run fetch:scraped  # scripts/fetch-scraped.mjs — Playwright scraping of public non-RSS sources -> appends to data/news.json
npm run fetch:auth     # scripts/fetch-authenticated.mjs — Playwright login-scraping of paid sources -> appends to data/news.json
npm run fetch:all      # runs the three in sequence (order matters, see below)
```

There is no test suite, linter, or build/typecheck command in this repo. To verify a change, run the relevant `fetch*` script and inspect `data/news.json`, or open `index.html` (or serve it statically) in a browser.

`fetch:auth` needs `MYSOLUTION_USERNAME`/`MYSOLUTION_PASSWORD` and `EUTEKNE_USERNAME`/`EUTEKNE_PASSWORD` in the environment; without them it just skips those sources with a warning (non-fatal).

## Architecture

**Pipeline, always in this order** (each later step reads and appends to the file the previous step wrote, they don't run independently):

1. `scripts/fetch-news.mjs` reads `config/sources.json` (feeds grouped by category), fetches every RSS feed via `rss-parser`, dedupes, sorts by date, and **writes** `data/news.json` from scratch (`{ generatedAt, categories, items: { <category>: [...] } }`).
2. `scripts/fetch-scraped.mjs` reads `config/scraped-sources.json`, launches Playwright/Chromium, scrapes each public page (no login) with the CSS selectors defined per source, and **appends** results into the existing `data/news.json` (re-dedupes and re-sorts per category, updates `generatedAt`).
3. `scripts/fetch-authenticated.mjs` reads `config/authenticated-sources.json`, launches Playwright, logs into each paid source using credentials from env vars (`usernameEnv`/`passwordEnv`), then scrapes with selectors — same append/dedupe/sort behavior as step 2.
4. `index.html` is a static page with inline `<style>`/`<script>`; on load it `fetch('data/news.json')` and renders category filter chips + search + item list purely client-side. The "Esporta HTML" button clones the current DOM and inlines the fetched JSON as a literal `Promise.resolve(...)`, producing a self-contained snapshot HTML file (no server needed to view it later).
5. `.github/workflows/daily-update.yml` runs all three fetch scripts daily at 05:00 UTC (or via `workflow_dispatch`), commits `data/news.json` if changed, and deploys the whole repo root to GitHub Pages.

**Config-driven scrapers**: `fetch-scraped.mjs` and `fetch-authenticated.mjs` are generic — new sources are added by editing the JSON config, not by writing code. Each entry declares `newsUrl`, `itemSelector`, and per-field selectors (`titleSelector`, `linkSelector`, `dateSelector`, `summarySelector`); authenticated entries additionally declare `loginUrl`, `usernameSelector`/`passwordSelector`/`submitSelector`, and env var names for credentials. A source with missing/wrong selectors is skipped with a logged warning — it never blocks other sources. See the selector details and known-good configs for MySolution/Eutekne/Cliclavoro/DGT in `README.md`.

**Item shape** (uniform across all three fetchers): `{ category, source, title, link, date (ISO string or null), summary }`.

**Categories** are a fixed set defined by `CATEGORY_LABELS` in `fetch-news.mjs`: `fiscale`, `contabile`, `lavoro`, `condominio`, `contenzioso`, `crisi_impresa`, `finanza_agevolata`. `config/sources.json` top-level keys must match these.

**Placeholder sources**: many entries in `config/sources.json` have an empty `"url"` — these are known sources without a verified RSS feed yet, not bugs. Don't "fix" them without a real, verified feed URL.

**Sandbox limitation**: this dev environment has no network access to the target news domains, so scraper selectors for `scraped-sources.json`/`authenticated-sources.json` are configured from HTML inspected elsewhere and can only be verified for real when the GitHub Action runs. Treat scraper changes as unverified until confirmed in a real Action run.

## Security note

Credentials for authenticated sources (Eutekne, MySolution) must only ever live in GitHub Actions Secrets, never in code, config files, or commits — `fetch-authenticated.mjs` reads them exclusively from `process.env` via the `usernameEnv`/`passwordEnv` names in `config/authenticated-sources.json`.
