# 商业航天全量情报站问题账本

本文件用于按时间记录 bug、线上问题、回归风险和关闭依据。任务计划和里程碑放在 `SPACE_INTEL_TASKS.md`。

## Status Legend

- `OPEN`：已发现，尚未开始处理。
- `IN_PROGRESS`：正在排查或修复。
- `FIXED`：已有修复，但尚未完成回归验证。
- `VERIFIED`：修复已通过回归验证。
- `WONTFIX`：确认不修复，必须写明原因。

## Priority Legend

- `P0`：阻断生产、数据安全、secret 泄露、严重合规或核心链路不可用。
- `P1`：主要用户流程、采集链路、部署链路或数据正确性明显受损。
- `P2`：可见体验、回归风险、维护性或非核心功能问题。
- `P3`：低风险改进、文案、清理或观察项。

## Issue Template

```markdown
### YYYY-MM-DD - SI-ISSUE-000 - Short title

- Priority: P1
- Status: OPEN
- Area: ingestion | api | frontend | deployment | docs | security | data
- Found In: source report, PR, local run, production check, or user report
- Evidence: exact symptom, file, command, URL, or log summary
- Fix: planned or completed fix
- Regression Check: verification command, screenshot, production check, or reason unverified
- Notes: optional context
```

## Current Issues

### 2026-05-30 - SI-ISSUE-008 - Review follow-up for ingestion failures and entity-link consistency

- Priority: P1
- Status: FIXED
- Area: ingestion | data | frontend
- Found In: local project review and production `/api/health` check
- Evidence: Production health on 2026-05-29 reported `openIngestionLogCount: 20` with recent failures from `ars-technica-space-rss`, `ccgp-central-procurement`, and `deepblueaerospace-news`; local review also found RSS records were persisted without default tags/companies, admin entity enrichment deleted all `article_tags` and `article_companies` before rebuilding, translation-field schema fallback did not cover entity matching/backfill paths, and static frontend company/topic lists could drift from D1/config.
- Fix: Added RSS User-Agent, broader accept header, `max_items`, and source default tag/company propagation; changed entity enrichment to incremental upsert so source-default links are preserved; scheduled daily runs now upsert entity links after catalog sync; entity matching and translation backfill degrade safely when production D1 lacks translation fields; frontend filter and command palette options now read companies/topics from APIs, and catalog/source queries no longer poll every five minutes.
- Regression Check: Verified with `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` with 23 files / 85 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, `git diff --check`, and secret-pattern scan over runtime code changes. Local direct requests to the three failing source URLs returned HTTP 200 with explicit User-Agent headers.
- Notes: Production health still needs recheck after deployment and the next scheduled ingestion window. This issue does not apply the durable production D1 migration; `SI-ISSUE-005` remains the schema-confirmation tracker.

### 2026-05-29 - SI-ISSUE-001 - Launch Library 2 production refetch still needs verification

- Priority: P2
- Status: OPEN
- Area: ingestion
- Found In: `SPACE_INTEL_TASKS.md` current task
- Evidence: Launch Library 2 endpoint had HTTP 429 risk from default request headers; collector now sends explicit User-Agent, but production refetch and `/api/launches` future-launch verification remain listed as current work.
- Fix: Re-run production `/api/admin/ingest/launches` after the relevant deployment and confirm `/api/launches` returns future launch cache entries.
- Regression Check: Unverified in this documentation-only pass.
- Notes: This issue tracks the same operational follow-up as the active task so it is not lost during task ledger cleanup.

### 2026-05-29 - SI-ISSUE-002 - Governance files mixed constraints, tasks, and issue history

- Priority: P2
- Status: VERIFIED
- Area: docs
- Found In: local governance review
- Evidence: `SPACE_INTEL_DEV_CONSTRAINTS.md` contained progress snapshots and next steps; `SPACE_INTEL_TASKS.md` contained long historical DONE records and bug references; there was no dedicated issue ledger for dated regression tracking.
- Fix: Split stable constraints, task state, and issue records into dedicated files.
- Regression Check: Verified with `git diff --check`, secret-pattern scan, `.\node_modules\.bin\tsc.cmd -b --noEmit`, and `.\node_modules\.bin\eslint.cmd .`.
- Notes: Created during the 2026-05-29 governance cleanup.

### 2026-05-29 - SI-ISSUE-003 - Enabled capital filing sources are not scheduled for ingestion

- Priority: P1
- Status: VERIFIED
- Area: ingestion
- Found In: local architecture review
- Evidence: Earlier `config/sources.yaml` enabled four `capital_filing` SEC sources, but `src/ingestion/scheduled.ts` only scheduled SNAPI, Launch Library 2, RSS, Google News RSS, and `official_page` sources.
- Fix: The interim fix disabled those SEC sources. The 2026-05-29 policy pivot fully removed the capital feature, `capital_filing` source type, and market seed path.
- Regression Check: Verified with `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, and `.\node_modules\.bin\vite.cmd build`.
- Notes: Reintroducing capital data in the future would require a new product decision and a tested collector/schema path.

### 2026-05-29 - SI-ISSUE-004 - Fixed-key scheduled sources ignore enabled flags

- Priority: P2
- Status: VERIFIED
- Area: ingestion
- Found In: local architecture review
- Evidence: `src/ingestion/scheduled.ts` finds `snapi` and `launch-library-2` by key and runs them without checking `source.enabled`, while RSS, Google News RSS, and `official_page` branches filter by `item.enabled`.
- Fix: Scheduled ingestion now checks `enabled` before dispatching both fixed-key collectors. Added a regression test proving disabled `snapi` and `launch-library-2` do not fetch, create ingestion logs, or write source data.
- Regression Check: Verified with `.\node_modules\.bin\vitest.cmd run src\ingestion\scheduled.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, and `.\node_modules\.bin\vite.cmd build`.
- Notes: This restores the config-first source architecture for API-style scheduled sources.

### 2026-05-29 - SI-ISSUE-005 - Production article APIs return 500 and leave article content empty

- Priority: P1
- Status: FIXED
- Area: api
- Found In: production browser/API check
- Evidence: `https://space.bytebaud.com/` renders shell content, but the homepage article area stays in skeleton/empty state. `/api/home?limit=12`, `/api/articles?limit=5`, `/api/articles/1`, `/api/companies/spacex`, and `/api/topics/satellite-internet` return HTTP 500. Routes not using article summary translation fields, including `/api/launches`, `/api/companies`, `/api/topics`, and `/api/health`, return 200. Chrome page checks confirm `/articles` stays shell-only while launches, companies, and topic list pages render data.
- Fix: Implemented a public API compatibility fallback for article summary queries. The code first uses the current translation-field schema, then retries with legacy-safe selected values when D1 reports missing `original_summary`, `translation_status`, or `translation_provider`. This covers home, article list/detail, company detail, and topic detail queries until the production D1 migration state is guaranteed.
- Regression Check: Local fallback tests passed with `.\node_modules\.bin\vitest.cmd run src/db/articleQueries.test.ts src/db/homeQueries.test.ts src/db/companyQueries.test.ts src/db/topicQueries.test.ts`; full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `git diff --check`, and elevated `.\node_modules\.bin\vite.cmd build` passed. Production D1 schema query and remote regression remain blocked locally because `CLOUDFLARE_API_TOKEN` is not available in this shell.
- Notes: The durable database fix is still to confirm/apply `migrations/0004_article_translation_fields.sql` on production D1; the code fallback prevents missing migration state from taking public pages down.

### 2026-05-29 - SI-ISSUE-006 - Production health reports open ingestion logs and recent official-page failures

- Priority: P2
- Status: FIXED
- Area: ingestion
- Found In: production `/api/health` check
- Evidence: `/api/health` returns `openIngestionLogCount: 15` and recent failed source logs for `deepblueaerospace-news`, `changguang-satellite-news`, `cas-space-news`, `landspace-news`, and `orienspace-news`; each recent failed log has `successCount: 0`, `failureCount: 1`, and `hasError: true`.
- Fix: Added legacy D1 insert fallback in `persistArticleRecords` for production databases missing translation columns. This prevents official-page/procurement crawlers from failing after collection when the durable migration has not yet been applied.
- Regression Check: Passed `vitest` targeted DB/ingestion tests, full `vitest`, `tsc -b --noEmit`, `eslint .`, `vite build`, `generate-config --check`, `verify-layout`, and `git diff --check`. Production health will need recheck after deployment and the next scheduled ingestion.
- Notes: The durable database fix remains applying `0004_article_translation_fields.sql`; this compatibility fix keeps crawler writes working until schema drift is closed.

### 2026-05-29 - SI-ISSUE-007 - Policy page renders empty because policy filters are too narrow

- Priority: P1
- Status: FIXED
- Area: api | frontend | ingestion
- Found In: user report and production browser check
- Evidence: `https://space.bytebaud.com/policy` renders successfully but shows `暂无政策信息。`; the API filter only accepts `official_page` articles with `policy-and-regulation`, so policy-tagged procurement and RSS records are excluded, and official-page failures can empty the page.
- Fix: Broadened policy API filtering to all `policy-and-regulation` tagged records and expanded the policy source selector to official pages, procurement pages, and RSS sources.
- Regression Check: Production `/api/articles?tag=policy-and-regulation&limit=5` confirmed existing policy-tagged records are present; local targeted tests, full tests, typecheck, lint, build, config check, layout check, and diff check passed.
- Notes: The fix reuses real source-backed records; no placeholder content was added.

## Historical Review Artifacts

- `docs/REVIEW_REPORT.md`
- `docs/REVIEW_REPORT_ROUND2.md`
- `docs/REVIEW_REPORT_ROUND3.md`
- `docs/REVIEW_REPORT_ROUND4.md`
- `docs/REVIEW_REPORT_ROUND5.md`
- `docs/REVIEW_REPORT_CLOUDFLARE_REBUILD_INGESTION.md`

These files remain useful as evidence and audit history. Current open/closed issue state should be reflected in this ledger.
