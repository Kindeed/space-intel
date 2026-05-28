# Agent Development Rules

This repository is governed by `SPACE_INTEL_DEV_CONSTRAINTS.md`.

## Mandatory Context

Before planning or changing this project, agents and contributors must read:

1. `SPACE_INTEL_DEV_CONSTRAINTS.md`
2. `SPACE_INTEL_TASKS.md`
3. `VPS-CF-MIGRATION-CONFIG.md` when a change may touch Cloudflare, DNS, VPS, nginx, Pages, Workers, R2, D1, RSSHub, TrendRadar, or deployment.

## Non-Negotiable Constraints

- Do not commit secrets, API tokens, SSH keys, private service paths, subscription links, private UUIDs, or credentials.
- Public Cloudflare resource identifiers required by Wrangler bindings, such as D1 `database_id`, may remain in `wrangler*.toml`; they are not credentials and must not be confused with API tokens or secrets.
- Do not affect existing services under `pass.bytebaud.com`, `nezha.bytebaud.com`, `xui.bytebaud.com`, `blog.bytebaud.com`, or `tle.bytebaud.com`.
- Use Cloudflare-first architecture unless `SPACE_INTEL_DEV_CONSTRAINTS.md` is explicitly revised.
- Use GitHub as the source of truth for code, configuration, CI, PR review, and deployment triggers.
- Reference projects are design inputs only; they cannot override Cloudflare-first architecture, copyright limits, security rules, or existing-service protection.
- Do not store full copyrighted articles. Store metadata, summaries, tags, related entities, and original links only.
- Capital-market content must be treated as information aggregation only and must show a non-investment-advice notice.

## Development Workflow

- Update `SPACE_INTEL_TASKS.md` when starting, completing, blocking, or changing a major task.
- Keep changes scoped to the current task.
- Add or update tests when changing ingestion, parsing, deduplication, database schema, APIs, or visible UI behavior.
- For layout changes, verify desktop and mobile views before marking the task complete.
- For source configuration changes, document the source purpose, risk, and expected content category.

## Required Verification Before Completion

- TypeScript typecheck passes.
- Lint passes.
- Tests relevant to the changed area pass.
- Build passes.
- No secrets or private operational data are present in new or modified files.
- The implementation still matches `SPACE_INTEL_DEV_CONSTRAINTS.md`.
