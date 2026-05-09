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
