# Ingestion Architecture

## Purpose

The ingestion pipeline is config-first. Source URLs, purpose, risk notes, expected content, and dedupe strategy live in `config/sources.yaml`. UI components must not hardcode source-specific behavior.

YAML config files are canonical. Generated JSON files are build artifacts kept in Git for Workers/Pages imports. Run `pnpm generate:config` after changing config YAML, and CI runs `pnpm check:config` to prevent YAML/JSON drift.

Source `type` is an internal collector routing field. User-facing pages should use the public source category and display helpers instead of rendering collector names such as API, RSS, RSSHub, or Google News RSS. Access notes in source config describe whether a source is likely direct, limited, blocked, or unknown from domestic and global networks; these notes are lightweight user/operations signals and do not disable foreign sources.

## Source Flow

1. Parse and validate source config.
2. Select enabled sources.
3. Route each source to a collector by `type`.
4. Convert collector output into `NormalizedItem`.
5. Preserve publisher/source display metadata separately from the internal collector key.
6. Generate a dedupe hash from external ID when available, otherwise from source, canonical URL, and original title.
7. Translate eligible English title and summary metadata when the Hy-MT translation adapter is configured.
8. Store summaries, metadata, tags, companies, launch relations, publisher labels, and original links only.

## Scheduled Ingestion

Production scheduled ingestion is handled by a dedicated Cloudflare Worker, not the Pages Functions project. Keep the split explicit:

- `wrangler.toml` configures the Pages app, API Functions, D1 binding, and R2 binding.
- `wrangler.scheduled.toml` configures the `space-intel-scheduled` Worker, its D1 binding, and Cron Triggers.
- `src/workers/scheduled.ts` maps the minute cron (`* * * * *`) to one enabled source per invocation and the daily cron event to catalog/curation maintenance. Selection uses the scheduled event minute, not delivery time. With 60 enabled sources, each source is selected once per 60-minute cycle; the cycle length follows the enabled source count. The historical hourly cron is recognized for compatibility but is no longer configured in production source code.
- GitHub Actions deploys the scheduled Worker after `main` branch verification succeeds. This requires the `CLOUDFLARE_API_TOKEN` GitHub Secret.
- Use `pnpm deploy:scheduled` as the manual fallback after changing cron config, Worker code, ingestion orchestration, source config imports, or D1 bindings.
- Scheduled source invocations isolate hard CPU terminations as well as caught source failures. One failed source cannot prevent the next minute's source invocation. This reduces per-invocation work but does not guarantee that every single source fits the Workers Free CPU budget.
- Hourly RSS and official-page sources run with bounded concurrency. API-style sources stay serial unless explicitly changed.
- Daily runs synchronize configured sources, companies, and topics into D1, then sync curations.
- Stale-log maintenance runs before source work at the top of each UTC hour, and daily maintenance also closes logs that have stayed open for more than two hours and prunes retained operational data in bounded batches.
- Every scheduled invocation emits a `space_intel_ingestion` summary with the scheduled time, selected source keys, failed/successful counts and writes. Use these live logs to observe a rotation; a platform `Ok` alone does not prove persistence.
- Retention defaults keep article metadata and article relation rows for 730 days, ingestion logs for 90 days, and launch cache rows for 730 days after `window_start`. Source, company, tag, and curation catalog rows are retained until config or editorial changes remove them.

## D1 Write Path

Article writes remain dedupe-first through `dedupe_hash`. D1-capable connections batch inserts, identity resolution and relation updates in chunks of 40 records; duplicate records still receive updated tag/company/launch relations. Missing translation/publisher columns retain their compatibility retries. Adapters without batch/result support use sequential execution. Each D1 batch consumes one binding request; individual SQL statement/parameter limits still apply.

## Read Budget And Health

`GET /api/health` reads at most one article ID via the primary key and reports actual row-read availability, including a reachable empty table. A constant `SELECT 1` can still succeed after row-read quota exhaustion, so it is not a valid recovery probe. No log scans or business aggregates run by default. Missing/rejected database access returns uncached HTTP 503. The asset check reports binding presence only.

Detailed diagnostics require `?diagnostics=1`. Ingestion timestamps and failures cover only the last 240 log IDs, stated in the response. Global open-log and upcoming-launch counts stop at 200; `*CountExact: false` means the actual count exceeds that cap. Their SQL explicitly requires the relevant indexes, preventing accidental full scans on an unmigrated database. Missing indexes produce unavailable diagnostics and HTTP 503 instead of synthetic zero totals. The default lightweight check remains independent of these indexes.

Migration `0009_health_query_indexes.sql` adds the article date index, future-launch index and a partial index containing only unfinished logs. The partial index also supports stale-log maintenance. Do not build full-history log indexes or repeatedly run aggregate diagnostics during a Free recovery. Public unauthenticated JSON reads use a 120-second edge cache; health and admin remain uncached.

Launch Library uses the supported 2.3.0 upcoming endpoint with normal metadata to preserve provider/rocket/site fields. The one-request-per-rotation cadence is unchanged; 429 is an upstream failure, not a signal to retry rapidly or use development data.

## Translation

English article metadata can be translated before persistence through a self-hosted Hy-MT 1.8B OpenAI-compatible service. The scheduled Worker and admin backfill endpoint read `TRANSLATION_*` secrets from the runtime environment. The adapter translates only titles and summaries, stores the original title and original summary, and marks each row as `translated`, `skipped`, or `failed`. Translation failures must not fail source ingestion, and dedupe hashes must continue to use original source metadata rather than translated text.

## Collector Boundary

Each collector owns one source family:

- `api`: Spaceflight News API and similar public APIs.
- `rss`: standard RSS feeds.
- `google_news_rss`: Google News keyword RSS feeds.
- `rsshub`: optional Chinese platform feeds through RSSHub.
- `official_page`: official policy pages that need conservative page parsing.
- `procurement_page`: public procurement listing pages that need conservative list parsing.

Collectors may normalize field names and timestamps, but they must not store full copyrighted article bodies.

## VPS Enrichment

Python or VPS-based enrichment is non-blocking for v1. It should only be considered when Cloudflare Workers cannot reliably handle a specific enrichment job such as title/summary translation, complex page extraction, long-running AI processing, or high-risk parser isolation. Any future VPS worker must output summaries, tags, entities, status, and source links only.
