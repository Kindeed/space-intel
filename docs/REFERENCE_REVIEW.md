# Reference Review Notes

Date: 2026-05-09

Purpose: capture implementation ideas from reference projects without copying code or overriding the Cloudflare-first, metadata-only constraints in `SPACE_INTEL_DEV_CONSTRAINTS.md`.

## Scope

- Glance: dashboard and widget layout reference.
- Miniflux: RSS reader API and feed behavior reference.
- feeds.fun: tagging, scoring, and AI-assisted RSS triage reference.
- AI-Now: no single authoritative repository was confirmed from public search results. Treat this as a generic input for plugin-style AI/news automation, not a specific implementation source.

## Findings

### Glance

Source: https://github.com/glanceapp/glance and https://github.com/glanceapp/glance/blob/main/docs/configuration.md

- Useful idea: page layout is configured as pages, columns, and widgets, which maps well to our home dashboard sections.
- Applicable pattern: keep each homepage block independently backed by a query or config source, instead of one large hardcoded component.
- Constraint for this project: Glance is a dashboard, while this project is a news intelligence site. The UI should keep article readability, source attribution, and original-link behavior ahead of decorative widgets.

### Miniflux

Source: https://miniflux.app/docs/api.html

- Useful idea: API-first feed reader behavior with list endpoints, filtering, pagination, and entry metadata.
- Applicable pattern: keep article APIs predictable and filterable by source, category/tag, and status.
- Constraint for this project: do not store full copyrighted articles. Use Miniflux-like feed discipline, but persist only metadata, summaries, tags, related entities, and original links.

### feeds.fun

Source: https://github.com/Tiendil/feeds.fun and https://www.sourcepulse.org/projects/12002917

- Useful idea: separate fetching/parsing from tagging/scoring. Public descriptions mention loader-style fetching and librarian/tag-processor style analysis.
- Applicable pattern: our collector registry plus future tag processors should stay modular: source ingestion, dedupe, entity matching, topic tagging, scoring/ranking.
- Constraint for this project: AI tagging and scoring must be optional and cost-aware, and any LLM provider key must stay in Cloudflare/GitHub secrets, never in the repo.

### AI-Now / AI News Automation Class

Source note: public search did not identify one stable reference repository named exactly `AI-Now` that clearly matches the task list. Comparable AI/news automation projects commonly combine RSS/source adapters, scheduled jobs, summarization, and downstream publishing.

- Useful idea: source adapters should be isolated and testable.
- Applicable pattern: keep each source type behind a collector interface and make scheduled orchestration call those collectors, rather than embedding source-specific code in UI or route handlers.
- Constraint for this project: any AI summary/translation remains deferred; v1 should work with non-AI metadata ingestion.

## Decisions Applied

- Keep Cloudflare-first architecture: Pages Functions + D1 + config files.
- Keep source plugin architecture: collectors live under `src/ingestion/collectors`.
- Keep UI information-dense but readable: X/Weibo-like feed plus compact dashboard panels.
- Keep ranking explicit: manual curation weight, publish time, then source credibility.
- Keep copyright boundary strict: no full article storage or rendering.

