# Ingestion Architecture

## Purpose

The ingestion pipeline is config-first. Source URLs, purpose, risk notes, expected content, and dedupe strategy live in `config/sources.yaml`. UI components must not hardcode source-specific behavior.

YAML config files are canonical. Generated JSON files are build artifacts kept in Git for Workers/Pages imports. Run `pnpm generate:config` after changing config YAML, and CI runs `pnpm check:config` to prevent YAML/JSON drift.

## Source Flow

1. Parse and validate source config.
2. Select enabled sources.
3. Route each source to a collector by `type`.
4. Convert collector output into `NormalizedItem`.
5. Generate a dedupe hash from external ID when available, otherwise from source, canonical URL, and original title.
6. Translate eligible English title and summary metadata when the Hy-MT translation adapter is configured.
7. Store summaries, metadata, tags, companies, launch relations, and original links only.

## Scheduled Ingestion

Production scheduled ingestion is handled by a dedicated Cloudflare Worker, not the Pages Functions project. Keep the split explicit:

- `wrangler.toml` configures the Pages app, API Functions, D1 binding, and R2 binding.
- `wrangler.scheduled.toml` configures the `space-intel-scheduled` Worker, its D1 binding, and Cron Triggers.
- `src/workers/scheduled.ts` maps hourly cron events to source ingestion and the daily cron event to curation sync.
- GitHub Actions deploys the scheduled Worker after `main` branch verification succeeds. This requires the `CLOUDFLARE_API_TOKEN` GitHub Secret.
- Use `pnpm deploy:scheduled` as the manual fallback after changing cron config, Worker code, ingestion orchestration, source config imports, or D1 bindings.
- Hourly runs isolate failures per source. One failed feed or API records a failed source result but does not stop the remaining sources.
- Hourly RSS and official-page sources run with bounded concurrency. API-style sources stay serial unless explicitly changed.
- Hourly runs seed `market_items` from the updated article metadata so the capital page can refresh without a separate manual admin call.
- Daily runs synchronize configured sources, companies, and topics into D1, then sync curations.
- Daily maintenance closes ingestion logs that have stayed open for more than two hours and prunes retained operational data in bounded batches.
- Retention defaults keep article metadata and article relation rows for 730 days, ingestion logs for 90 days, market items for 1095 days, and launch cache rows for 730 days after `window_start`. Source, company, tag, and curation catalog rows are retained until config or editorial changes remove them.

## D1 Write Path

Article writes remain dedupe-first through `dedupe_hash`. Article-to-tag, article-to-company, and article-to-launch relation writes use D1 `batch` when available and fall back to sequential statement execution for tests or D1-compatible mocks.

## Translation

English article metadata can be translated before persistence through a self-hosted Hy-MT 1.8B OpenAI-compatible service. The scheduled Worker and admin backfill endpoint read `TRANSLATION_*` secrets from the runtime environment. The adapter translates only titles and summaries, stores the original title and original summary, and marks each row as `translated`, `skipped`, or `failed`. Translation failures must not fail source ingestion, and dedupe hashes must continue to use original source metadata rather than translated text.

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

Python or VPS-based enrichment is non-blocking for v1. It should only be considered when Cloudflare Workers cannot reliably handle a specific enrichment job such as title/summary translation, complex page extraction, long-running AI processing, or high-risk parser isolation. Any future VPS worker must output summaries, tags, entities, status, and source links only.
