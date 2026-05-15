# Ingestion Architecture

## Purpose

The ingestion pipeline is config-first. Source URLs, purpose, risk notes, expected content, and dedupe strategy live in `config/sources.yaml`. UI components must not hardcode source-specific behavior.

## Source Flow

1. Parse and validate source config.
2. Select enabled sources.
3. Route each source to a collector by `type`.
4. Convert collector output into `NormalizedItem`.
5. Generate a dedupe hash from external ID when available, otherwise from source, canonical URL, and title.
6. Store summaries, metadata, tags, companies, launch relations, and original links only.

## Scheduled Ingestion

Production scheduled ingestion is handled by a dedicated Cloudflare Worker, not the Pages Functions project. Keep the split explicit:

- `wrangler.toml` configures the Pages app, API Functions, D1 binding, and R2 binding.
- `wrangler.scheduled.toml` configures the `space-intel-scheduled` Worker, its D1 binding, and Cron Triggers.
- `src/workers/scheduled.ts` maps hourly cron events to source ingestion and the daily cron event to curation sync.
- Deploy or update the scheduled Worker with `pnpm deploy:scheduled` after changing cron config, Worker code, ingestion orchestration, source config imports, or D1 bindings.

## Collector Boundary

Each collector owns one source family:

- `api`: Spaceflight News API and similar public APIs.
- `rss`: standard RSS feeds.
- `google_news_rss`: Google News keyword RSS feeds.
- `rsshub`: optional Chinese platform feeds through RSSHub.
- `official_page`: official policy pages that need conservative page parsing.
- `capital_filing`: public disclosure and filing links.

Collectors may normalize field names and timestamps, but they must not store full copyrighted article bodies.

## VPS Enrichment

Python or VPS-based enrichment is non-blocking for v1. It should only be considered when Cloudflare Workers cannot reliably handle a specific enrichment job such as complex page extraction, long-running AI processing, or high-risk parser isolation. Any future VPS worker must output summaries, tags, entities, status, and source links only.
