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
- Evidence: `config/sources.yaml` enables four `capital_filing` SEC sources, but `src/ingestion/scheduled.ts` only schedules SNAPI, Launch Library 2, RSS, Google News RSS, and `official_page` sources. `SPACE_INTEL_DEV_CONSTRAINTS.md` and `docs/INGESTION_ARCHITECTURE.md` both describe `capital_filing` as a source family that should have collector coverage.
- Fix: Disabled the four `capital_filing` SEC sources in `config/sources.yaml` until a conservative SEC collector and scheduled route are defined. This prevents source status and catalog sync from presenting unscheduled filing feeds as active.
- Regression Check: Verified with `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, and `.\node_modules\.bin\vite.cmd build`.
- Notes: The Capital page still receives market rows from article keyword seeding. Re-enable SEC sources only together with a tested `capital_filing` collector.

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
- Evidence: `https://space.bytebaud.com/` renders shell content, but the homepage article area stays in skeleton/empty state. `/api/home?limit=12`, `/api/articles?limit=5`, `/api/articles/1`, `/api/companies/spacex`, and `/api/topics/satellite-internet` return HTTP 500. Routes not using article summary translation fields, including `/api/launches`, `/api/market`, `/api/companies`, `/api/topics`, and `/api/health`, return 200. Chrome page checks confirm `/articles` stays shell-only while launches, companies, capital, and topic list pages render data.
- Fix: Implemented a public API compatibility fallback for article summary queries. The code first uses the current translation-field schema, then retries with legacy-safe selected values when D1 reports missing `original_summary`, `translation_status`, or `translation_provider`. This covers home, article list/detail, company detail, and topic detail queries until the production D1 migration state is guaranteed.
- Regression Check: Local fallback tests passed with `.\node_modules\.bin\vitest.cmd run src/db/articleQueries.test.ts src/db/homeQueries.test.ts src/db/companyQueries.test.ts src/db/topicQueries.test.ts`; full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `git diff --check`, and elevated `.\node_modules\.bin\vite.cmd build` passed. Production D1 schema query and remote regression remain blocked locally because `CLOUDFLARE_API_TOKEN` is not available in this shell.
- Notes: The durable database fix is still to confirm/apply `migrations/0004_article_translation_fields.sql` on production D1; the code fallback prevents missing migration state from taking public pages down.

### 2026-05-29 - SI-ISSUE-006 - Production health reports open ingestion logs and recent official-page failures

- Priority: P2
- Status: OPEN
- Area: ingestion
- Found In: production `/api/health` check
- Evidence: `/api/health` returns `openIngestionLogCount: 15` and recent failed source logs for `deepblueaerospace-news`, `changguang-satellite-news`, `cas-space-news`, `landspace-news`, and `orienspace-news`; each recent failed log has `successCount: 0`, `failureCount: 1`, and `hasError: true`.
- Fix: Inspect production ingestion logs and official-page collector behavior, then either harden parsing/timeouts for these sources or disable failing sources until route health is stable.
- Regression Check: Unverified; production health endpoint confirms the symptoms but does not expose internal error details.
- Notes: This may reduce domestic official/company-source freshness even though the rest of the site can still render launch, market, company, and topic data.

## Historical Review Artifacts

- `docs/REVIEW_REPORT.md`
- `docs/REVIEW_REPORT_ROUND2.md`
- `docs/REVIEW_REPORT_ROUND3.md`
- `docs/REVIEW_REPORT_ROUND4.md`
- `docs/REVIEW_REPORT_ROUND5.md`
- `docs/REVIEW_REPORT_CLOUDFLARE_REBUILD_INGESTION.md`

These files remain useful as evidence and audit history. Current open/closed issue state should be reflected in this ledger.
