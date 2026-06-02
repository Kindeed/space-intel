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

### 2026-06-02 - SI-ISSUE-353 - Domestic latest feed is uneven because scheduled ingestion times out or fails on several domestic sources

- Priority: P1
- Status: FIXED
- Area: ingestion | operations | data-quality
- Found In: user report and production API/health checks
- Evidence: Production `/api/articles?region=cn&limit=20` returned current domestic rows including `2026-06-02` CASIC and `2026-06-01` CNSA items, so the public article query itself is working. Production `/api/health` on 2026-06-02 reported `latestSuccessfulIngestionAt: 2026-06-02T06:02:54.663Z` and `openIngestionLogCount: 0`, but recent failures included `国家航天局政策公告` with a 25.18s run matching the 25s source timeout, `Spaceflight News` closed as a stale 2-hour log, and fast failures for `中国政府采购网中央公告`, `中国政府采购网地方公告`, and `全国公共资源交易平台航天公告`. Public source-filter checks showed several newly added domestic sources still have no production articles, including `中国政府采购网中央公告`, `中国政府采购网地方公告`, `全国公共资源交易平台航天公告`, `未来天玑动态`, and `中关村商业航天联盟`.
- Fix: Added safe ingestion diagnostics for public `/api/health`, including `durationMs` and a sanitized `errorCategory` such as `timeout`, `http_error`, `db_error`, `parse_error`, `aborted`, or `ingestion_error` without exposing raw error text or internal source keys. Added protected `/api/admin/ingest/logs` for admin-only recent failure inspection with raw error text, and protected `/api/admin/ingest/source?key=...` for manually rerunning a single enabled article source such as `cnsa-policy`, `casic-news`, or procurement sources.
- Regression Check: Verified locally with targeted `.\node_modules\.bin\vitest.cmd run functions\api\health.test.ts functions\api\_admin.test.ts functions\api\admin\ingest\source.test.ts functions\api\admin\ingest\logs.test.ts functions\api\admin\ingest\rss.test.ts functions\api\admin\ingest\_sources.test.ts src\ingestion\scheduled.test.ts` passing 7 files / 29 tests, follow-up targeted diagnostics tests passing 3 files / 9 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 62 files / 446 tests, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`. Production recheck remains pending until deployment.
- Notes: PR #26 and the scheduled Worker deploy both completed successfully on 2026-05-31, so this is not explained by an unmerged PR or skipped scheduled Worker deployment. Local collect-only reproduction on 2026-06-02 showed `cnsa-news`, `cnsa-policy`, `casic-news`, and `zcaia-news` can be parsed from the current network environment, while the procurement pages currently yielded zero relevant items locally. Wrangler log inspection was blocked locally because `CLOUDFLARE_API_TOKEN` is not set.

### 2026-05-31 - SI-ISSUE-352 - Official column and public source coverage are too narrow

- Priority: P2
- Status: VERIFIED
- Area: ingestion | frontend | api | sources | docs
- Found In: user report and local source/navigation review
- Evidence: User reported that information sources were still too few, crawler coverage was too weak, local government space-policy/procurement content was sparse, and the page name should become “航天信息”. Local review confirmed the visible fourth navigation entry was still “政策”, `/api/articles?category=policy` mixed policy-tagged RSS/media with official records, procurement collection still fell back to crawl time for invalid dates, and source governance wording could be read as over-restricting public forums/websites.
- Fix: Renamed public brand surfaces to “航天信息”, added `/official` while keeping `/policy` compatible, added `category=official` for official-page/procurement records with policy/procurement tags, updated the Live HUD and navigation to “官方”, expanded `config/sources.yaml` with public official/procurement/industry sources, rewrote source governance to allow public RSS, webpage, forum/community, RSSHub, and search-aggregation sources with risk tiers, and changed procurement collection to skip candidates without real source dates.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\db\articleQueries.test.ts src\pages\PolicyPage.test.tsx src\constants.test.ts src\components\LiveHud.test.tsx src\ingestion\ingestion.test.ts` passing 6 files / 116 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 440 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, local Playwright mobile check of `http://127.0.0.1:4173/official`, `git diff --check`, and added-line sensitive-pattern scan returning no matches.
- Notes: RSSHub/forum/social sources remain supported by governance but should stay lower-trust trend inputs unless route health and compliance are reviewed.

### 2026-05-31 - SI-ISSUE-351 - Official-page news uses crawl time and links to home or section pages

- Priority: P1
- Status: VERIFIED
- Area: ingestion | api | data-quality | sources
- Found In: user report and production article/home API checks
- Evidence: Production `/api/articles?limit=20` and `/api/home` showed top items from official/company pages sharing crawl-time timestamps such as `2026-05-31 01:01:43`, while titles contained older source dates like `17 05月 2025`. Some top rows linked to non-news pages such as `https://www.e-casic.com/`, `https://www.cmse.gov.cn/kjkx/kjkxyjyyy/`, and other section/homepage URLs.
- Fix: Official-page ingestion now requires a real source date before emitting an item, rejects homepage/section/index/default URLs, parses trailing Chinese source dates such as `06 02月 2026`, removes that date chrome from public titles, and public queries hide historical official-page rows where crawl time was stored as article time.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts src\db\articleQueries.test.ts src\db\homeQueries.test.ts src\db\companyQueries.test.ts src\db\topicQueries.test.ts` passing 6 files / 118 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 438 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and added-line sensitive-pattern scan returning no matches.
- Notes: This is a broader follow-up to `SI-ISSUE-350`; the previous CNSA-specific cleanup was not sufficient for company and official pages with weak date/link structure.

### 2026-05-31 - SI-ISSUE-350 - Latest feed is polluted by CNSA navigation pages and stale sources

- Priority: P1
- Status: VERIFIED
- Area: ingestion | api | data-quality | sources
- Found In: user report and production latest/source checks
- Evidence: Production latest articles returned many `国家航天局新闻` rows that were section/navigation pages such as `咨询建议`, `意见征集`, `互动交流`, `空间科学`, `专题专栏`, and `机构简介`, all with same crawl-time timestamps rather than article timestamps. Production `/api/sources` also exposed stale enabled source rows no longer present in generated source config, including SEC filing collectors.
- Fix: CNSA collection now requires real content URLs before accepting candidates, public article/home/company/topic queries hide existing CNSA navigation rows, a cleanup migration removes historical polluted rows and disables stale SEC source rows, and the public source API now hides DB-enabled sources unless they are still enabled in generated source config.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\db\articleQueries.test.ts src\db\homeQueries.test.ts src\db\companyQueries.test.ts src\db\topicQueries.test.ts functions\api\sources.test.ts` passing 6 files / 90 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 435 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and added-line sensitive-pattern scan returning no matches.
- Notes: Google News Chinese keyword feeds are being enabled only as limited backup aggregators because direct domestic source coverage is currently insufficient; the source metadata keeps the domestic access warning.

### 2026-05-31 - SI-ISSUE-349 - Short navigation filtering misses zero-width title variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up short-title filtering review after `SI-ISSUE-348`
- Evidence: Shared short-title normalization removes ordinary whitespace before checking generic navigation and date-only link text, but not zero-width format characters. Titles such as `查\u200b看全部` or `详\u200b情` can visually look like navigation entries while bypassing the existing compact title set.
- Fix: Reused compact separator removal for short-title normalization so generic navigation and date-only checks ignore common zero-width format characters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects generic short-link and date-only filtering; article title extraction and URL normalization keep their existing behavior.

### 2026-05-31 - SI-ISSUE-348 - Contact-protocol href filtering misses obfuscated variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up non-web href review after `SI-ISSUE-347`
- Evidence: Plain `mailto:` hrefs are rejected by HTTP(S) URL normalization, but whitespace or zero-width obfuscated variants such as `mail to:contact@example.com` or `te\u200bl:+8613800000000` can be resolved as relative URLs when a base URL is provided.
- Fix: Added compact non-web protocol detection for obfuscated `mailto:` and `tel:` hrefs before HTTP(S) URL normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only rejects non-article contact protocol hrefs; normal relative article URLs keep their existing behavior.

### 2026-05-31 - SI-ISSUE-347 - Pseudo-protocol href filtering misses zero-width obfuscation

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up pseudo-protocol href review after `SI-ISSUE-346`
- Evidence: Compact pseudo-protocol detection removes JavaScript-trimmed whitespace, including NBSP, before checking `javascript:`, `vbscript:`, and `data:` hrefs. It does not remove common zero-width format characters such as U+200B, so `java\u200bscript:alert(1)` can avoid compacting to `javascript:` before URL normalization.
- Fix: Removed common zero-width format characters during pseudo-protocol compaction before checking `javascript:`, `vbscript:`, and `data:` hrefs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects obfuscated non-web pseudo-protocol href rejection; valid relative article URLs keep their existing behavior.

### 2026-05-31 - SI-ISSUE-346 - Pseudo-protocol href filtering misses Unicode whitespace obfuscation

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up pseudo-protocol href review after `SI-ISSUE-345`
- Evidence: Shared compact pseudo-protocol detection removes ASCII control/space characters before checking `javascript:`, `vbscript:`, and `data:`. Raw HTML attributes can include Unicode whitespace such as NBSP, so `java\u00a0script:alert(1)` may not compact to `javascript:` before URL normalization.
- Fix: Made compact pseudo-protocol detection remove all JavaScript-trimmed whitespace characters, including NBSP, before checking `javascript:`, `vbscript:`, and `data:` hrefs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects obfuscated non-web pseudo-protocol href rejection; valid relative article URLs keep their existing behavior.

### 2026-05-31 - SI-ISSUE-345 - Pseudo-protocol href filtering misses whitespace-obfuscated variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up placeholder href review after `SI-ISSUE-344`
- Evidence: Shared placeholder href filtering rejects `javascript:` and related script placeholders, but whitespace-obfuscated variants such as `java script:alert(1)`, `java\tscript:alert(1)`, or `data :text/html,hi` can be interpreted as relative URLs when a base URL is provided.
- Fix: Added compact pseudo-protocol detection before HTTP(S) URL normalization, so whitespace/control-obfuscated `javascript:`, `vbscript:`, and `data:` hrefs are rejected as placeholders.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only rejects obfuscated non-web pseudo-protocol hrefs; normal relative article links keep their existing behavior.

### 2026-05-31 - SI-ISSUE-344 - Placeholder href filtering misses script placeholder variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up placeholder href review after `SI-ISSUE-343`
- Evidence: Shared placeholder href filtering rejects `void(0)` and `javascript:` values, but script placeholders such as `void 0` or `return false` are not treated as placeholders. In official-page markup these values can be resolved as relative URLs before title relevance filtering.
- Fix: Added placeholder href recognition for `void 0`, `return false`, and `return false;` before HTTP(S) URL normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only rejects non-navigational placeholder hrefs; normal relative and absolute HTTP(S) article URLs keep their existing behavior.

### 2026-05-31 - SI-ISSUE-343 - Placeholder href filtering only strips one brace layer

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | url-normalization | tests
- Found In: follow-up placeholder href review after `SI-ISSUE-342`
- Evidence: Shared placeholder href filtering trims a single outer `{}` layer before checking pseudo-links. Template placeholders such as `{{javascript:;}}` or `{{#}}` can remain wrapped after normalization and may be treated as relative URLs before candidate filtering.
- Fix: Repeatedly trims balanced outer `{}` wrappers before placeholder href checks, so nested template pseudo-links are rejected before HTTP(S) URL normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects placeholder/non-web href rejection; valid HTTP(S) URL normalization keeps the existing shared helper.

### 2026-05-31 - SI-ISSUE-342 - Short-link filtering misses nested bracket wrappers

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up short-title normalization review after `SI-ISSUE-341`
- Evidence: Shared short-title filtering removes only one wrapper layer before checking generic navigation and date-only titles. Nested wrappers such as `【[详情]】` or `（【2026-05-28】）` can bypass the existing detail/date-only filters and enter extraction as low-quality candidates.
- Fix: Made short-title normalization peel nested square, corner, ASCII round, and full-width round wrappers before generic navigation and date-only checks.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects generic short-link and date-only filtering; article title extraction and URL normalization keep their existing behavior.

### 2026-05-31 - SI-ISSUE-341 - Numeric HTML entity decoding misses semicolonless forms

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML entity decoding review after `SI-ISSUE-340`
- Evidence: Shared HTML decoding handles numeric entities only when they include a trailing semicolon, such as `&#x5e74;` or `&#24180;`. Older official pages can emit semicolonless numeric references such as `&#x5e74` or `&#24180`, leaving visible entity text in titles or date context and weakening date parsing.
- Fix: Added delimiter-aware semicolonless numeric entity decoding for decimal and hexadecimal references while preserving invalid and control code point handling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only broadens numeric entity compatibility; invalid or control code points should continue to be preserved.

### 2026-05-31 - SI-ISSUE-340 - Year-first Chinese dates with separator spaces are missed

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up date parsing review after `SI-ISSUE-339`
- Evidence: Shared date parsing accepts `2026年5月30日` and `2026-05-30`, but not common government-page variants with spaces around separators such as `2026 年 5 月 30 日`. These dates can appear in list context or title prefixes, causing official/procurement collectors to fall back to crawl time or keep date chrome in public titles.
- Fix: Made year-first date matching whitespace-tolerant across nearby context lookup, date-only link filtering, `extractDate`, and leading-title cleanup while preserving real-date validation and existing slash-date behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 434 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only broadens year-first date shape recognition; invalid date validation remains unchanged.

### 2026-05-31 - SI-ISSUE-339 - Leading title timestamp cleanup leaves time fragments

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up leading title date cleanup review after `SI-ISSUE-338`
- Evidence: Shared title cleanup strips a leading date such as `2026-05-30`, but if a source title starts with an ISO-like or clock timestamp such as `2026-05-30T08:00:00Z 商业航天公告` or `2026-05-30 08:00 商业航天公告`, the public title can keep the leftover `T08:00:00Z` or `08:00` fragment after the date is removed.
- Fix: Extended leading title date cleanup to remove adjacent ISO-like or clock time fragments after a valid source date while preserving the existing real-date validation for malformed prefixes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 25 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 433 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects public title cleanup for official/procurement-derived titles; `publishedAt` extraction already uses the date portion.

### 2026-05-31 - SI-ISSUE-338 - Standalone nearby-date lookup can prefer invalid date-shaped text

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up standalone date-context review after `SI-ISSUE-337`
- Evidence: Shared standalone anchor extraction selects the nearest date-shaped text before or after an anchor. If the closest same-card text is malformed, such as `2026-13-40`, it can be used as the only date context and prevent a slightly farther valid same-card date such as `2026-05-30` from reaching collector date extraction.
- Fix: Validated nearby standalone date candidates before using them as anchor context, so malformed date-shaped text is skipped and the nearest valid same-card date can still be used.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 25 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 433 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects standalone anchor date context selection; global date extraction already rejects invalid dates when it sees them.

### 2026-05-31 - SI-ISSUE-337 - Standalone link nearby-date lookup can cross adjacent cards

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up standalone HTML card date-context review after `SI-ISSUE-336`
- Evidence: Shared standalone anchor extraction looks up dates within 220 characters before or after an anchor. Dense card markup such as `<div><a>Article A</a></div><div><span>2026-05-30</span><a>Article B</a></div>` can let Article A inherit Article B's nearby date even though the date belongs to the next card.
- Fix: Added an adjacent block-boundary check before accepting standalone nearby-date context, so dates separated from an anchor by neighboring card containers are ignored while same-card nearby dates are preserved.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 24 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 432 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects standalone anchor date context used by official/procurement page collectors; list row/block context and URL/title filtering keep their existing behavior.

### 2026-05-31 - SI-ISSUE-336 - Leading title date cleanup strips invalid date-shaped prefixes

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up leading title date cleanup review after `SI-ISSUE-335`
- Evidence: Shared title cleanup removes date-shaped prefixes from public titles by regex shape only. A malformed source title such as `2026-13-40 商业航天公告` would lose the leading text even though date extraction rejects that invalid date and falls back to another publication time.
- Fix: Validated leading date-shaped prefixes before stripping them from public titles, so malformed prefixes are preserved while valid source dates still clean visible titles.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 431 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects public title cleanup; date extraction, URL normalization, relevance filtering, and original-title preservation keep their existing behavior.

### 2026-05-31 - SI-ISSUE-335 - Semicolonless entity decoding is too permissive

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML entity decoding review after `SI-ISSUE-334`
- Evidence: Shared HTML decoding accepts `&amp` and `&nbsp` with an optional semicolon. That also matches ordinary text prefixes such as `&amplifier` or `&nbspword`, which can corrupt visible titles or source context while trying to tolerate malformed entities.
- Fix: Made semicolonless `&amp` and `&nbsp` decoding delimiter-aware so ordinary prefixes such as `&amplifier` and `&nbspword` are preserved.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 431 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This narrows the compatibility added in `SI-ISSUE-334` to clear malformed-entity boundaries while preserving standard semicolon entities and all existing URL safety checks.

### 2026-05-31 - SI-ISSUE-334 - HTML entity decoding misses common semicolonless entities

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML entity decoding review after `SI-ISSUE-333`
- Evidence: Shared HTML decoding handles common named entities only when they include a trailing semicolon. Older official or procurement pages can emit malformed but common forms such as `&amp` in href query strings or `&nbsp` in visible text, leaving noisy URL parameters or title whitespace in extracted candidates.
- Fix: Added support for semicolonless `&amp` and `&nbsp` decoding in shared HTML text and href normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 431 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only adds compatibility for two very common malformed named entities; numeric entity decoding, URL safety checks, tag stripping, and collector relevance rules keep their existing behavior.

### 2026-05-31 - SI-ISSUE-333 - HTML short-link filtering misses round-bracket wrappers

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML short navigation filtering review after `SI-ISSUE-332`
- Evidence: Shared HTML extraction already strips square and corner brackets before checking generic short links and date-only links, so `[查看全部]` and `【详情】` are filtered. It does not strip round brackets such as `(查看全部)` or `（详情）`, allowing equivalent short navigation or detail anchors to enter candidate extraction before URL/title dedupe.
- Fix: Normalized ASCII and full-width round-bracket wrappers in shared short-title filtering, so round-bracketed detail, view-all, and date-only anchors are filtered consistently with square and corner bracket variants.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 431 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects generic short-link and date-only filtering; article title cleanup, URL normalization, and collector relevance rules keep their existing behavior.

### 2026-05-31 - SI-ISSUE-332 - HTML anchor title extraction can read child element titles

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML anchor title parsing review after `SI-ISSUE-331`
- Evidence: Shared HTML extraction searches the whole `<a>...</a>` fragment for a `title` attribute. Article cards that place an image or icon inside the anchor, such as `<a href="./article.html"><img title="缩略图">商业航天真实标题</a>`, can have the child element title treated as the public article title instead of the visible anchor text.
- Fix: Restricted anchor title-attribute lookup to the opening `<a ...>` tag only, so child image or icon title attributes no longer override visible article text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 431 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects title-attribute preference; link extraction, child text extraction, URL normalization, and collector relevance rules keep their existing behavior.

### 2026-05-31 - SI-ISSUE-331 - HTML anchor parsing can treat data attributes as real links

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML anchor attribute parsing review after `SI-ISSUE-330`
- Evidence: Shared HTML extraction uses word-boundary attribute matching for `href` and `title`. In markup such as `<a data-href="./tracking.html" href="./article.html" data-title="tracking" title="真实标题">...`, the parser can match `data-href` or `data-title` before the real attributes, causing wrong URLs or low-quality tracking labels to enter candidate extraction.
- Fix: Tightened shared anchor attribute matching so `href` and `title` must be real whitespace-delimited attributes, preventing `data-href` and `data-title` from being treated as public link or title fields.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 22 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 430 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only changes shared HTML attribute parsing; URL normalization, entity decoding, navigation filtering, date extraction, and collector relevance rules keep their existing behavior.

### 2026-05-31 - SI-ISSUE-330 - HTML card title attributes miss whitespace-around-equals forms

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML card attribute parsing review after `SI-ISSUE-329`
- Evidence: HTML list extraction already accepts legacy `href = "..."` attributes, but card title extraction still only matches `title="..."` or `title='...'` without whitespace around `=`. Official or company pages that emit `<a title = "真实标题">正文摘要...</a>` would fall back to the full anchor body and could mix source dates or summaries into public titles.
- Fix: Added support for whitespace-around-equals and unquoted title attribute values in shared HTML anchor title parsing, preserving the existing preference for title attributes over noisy card body text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts` passing 1 file / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 429 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only affects title-attribute preference; URL extraction, navigation filtering, date context handling, and relevance filtering keep their existing behavior.

### 2026-05-31 - SI-ISSUE-329 - Procurement page titles keep leading source dates

- Priority: P3
- Status: VERIFIED
- Area: ingestion | procurement | data-quality | tests
- Found In: follow-up procurement title cleanup review after `SI-ISSUE-328`
- Evidence: Procurement page collection uses list text dates for `publishedAt`, but kept titles such as `【2026年5月30日】某卫星遥感数据采购项目中标公告` unchanged. That duplicates date chrome in visible procurement titles and summaries even though the date is already represented by `publishedAt`.
- Fix: Added shared leading-date title cleanup and reused it from official-page and procurement-page collectors. Procurement records now keep the original title while publishing cleaned titles and summaries.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 75 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 428 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only changes collector-level public titles and summaries; URL normalization, procurement relevance filtering, tags, and `publishedAt` extraction keep their existing behavior.

### 2026-05-31 - SI-ISSUE-328 - Official page titles keep bracketed leading dates

- Priority: P3
- Status: VERIFIED
- Area: ingestion | official-pages | data-quality | tests
- Found In: follow-up official page date/title cleanup review after `SI-ISSUE-327`
- Evidence: Official page collection already uses leading dates for `publishedAt` and strips bare leading dates from public titles, but it did not strip common bracketed forms such as `【2026年5月30日】商业航天政策公告发布`. These records would keep date chrome in visible titles and summaries even though the date is already represented by `publishedAt`.
- Fix: Extended official page public title cleanup to remove optional square/corner/round brackets around leading source dates while preserving the original title.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 73 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 426 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only changes official-page public title cleanup; raw original titles, URL normalization, relevance filtering, and date extraction keep their existing behavior.

### 2026-05-31 - SI-ISSUE-327 - HTML list extraction misses legacy href attribute forms

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML list anchor parsing review after `SI-ISSUE-326`
- Evidence: HTML list extraction matched only quoted `href="..."` or `href='...'` attributes without whitespace around `=`. Some legacy official pages can emit valid anchors such as `href=./article.html` or `href = "./article.html"`, causing real list items to be silently skipped before relevance filtering.
- Fix: Added a shared anchor matcher that supports double-quoted, single-quoted, unquoted, and whitespace-around-equals href forms, and reused it for list-block and standalone anchor extraction.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 72 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 425 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only broadens HTML anchor parsing; URL normalization, generic navigation filtering, date context handling, and duplicate suppression keep their existing behavior.

### 2026-05-31 - SI-ISSUE-326 - HTML list href entity values are normalized too late

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | data-quality | tests
- Found In: follow-up HTML list URL boundary review after `SI-ISSUE-325`
- Evidence: HTML list extraction passed raw `href` attribute text to URL normalization. Upstream pages commonly encode query separators as `&amp;`, which could store URLs with literal `amp;` query names. Encoded pseudo-protocols such as `javascript&#58;alert(1)` could also be treated as relative paths before the placeholder/non-web URL checks saw the decoded value.
- Fix: Decode HTML entities in `href` values before placeholder detection and HTTP(S) URL normalization, so normal query strings are canonicalized and encoded non-web pseudo-links are dropped.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 71 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This only changes HTML-list link extraction; source config URLs, public API serializers, and frontend external-link handling keep their existing shared URL boundary.

### 2026-05-31 - SI-ISSUE-325 - Frontend external-link components lack credentialed-URL regression coverage

- Priority: P3
- Status: VERIFIED
- Area: frontend | security | tests
- Found In: follow-up frontend external-link review after `SI-ISSUE-324`
- Evidence: Frontend article card, article detail, launch detail, company detail, and topic detail views all rely on shared `safeExternalUrl` before rendering external links. Their component tests covered unsafe schemes such as `javascript:` or `data:`, but did not directly guard against future component drift that could render `https://user:pass@example.com/...` as a clickable public link.
- Fix: Added component-level regression assertions proving credentialed article, launch source, company website, and topic curation URLs are not rendered as external links.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 5 files / 52 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This complements the shared helper and public API serializer coverage from `SI-ISSUE-321` through `SI-ISSUE-324`.

### 2026-05-31 - SI-ISSUE-324 - Company and topic public serializers lack credentialed-URL regression coverage

- Priority: P3
- Status: VERIFIED
- Area: api | security | tests
- Found In: follow-up public serializer review after `SI-ISSUE-323`
- Evidence: Company website/logo serializers and topic curation serializers already route external URLs through shared `normalizeHttpUrl`, but their public serializer tests only covered `javascript:`, `data:`, blank values, and valid public URLs. After credentialed URL rejection was added centrally, these API contracts did not directly guard against future serializer drift that could expose `https://user:pass@example.com/...` links.
- Fix: Added company website/logo and topic curation serializer regression tests proving credentialed URLs are returned as `null` or dropped from public output.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts` passing 2 files / 16 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This is test coverage for the public API boundary; the shared rejection behavior remains owned by `SI-ISSUE-321`.

### 2026-05-31 - SI-ISSUE-323 - Public API serializers lack credentialed-URL regression coverage

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | security | tests
- Found In: follow-up public serializer review after `SI-ISSUE-322`
- Evidence: Public article and launch serializers already route external URLs through shared `normalizeHttpUrl`, but their boundary tests only covered `javascript:`, `data:`, and blank values. After credentialed URL rejection was added centrally, these public API contracts did not directly guard against future serializer drift that could expose `https://user:pass@example.com/...` links.
- Fix: Added public article URL and launch source URL serializer regression tests proving credentialed URLs are returned as `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts functions\api\_launches.test.ts` passing 2 files / 33 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This is test coverage for the public API boundary; the shared rejection behavior remains owned by `SI-ISSUE-321`.

### 2026-05-31 - SI-ISSUE-322 - Config URL validation message hides credentialed-URL rejection

- Priority: P3
- Status: VERIFIED
- Area: config | source-config | catalog | curations | tests
- Found In: follow-up config validation review after `SI-ISSUE-321`
- Evidence: After shared URL normalization began rejecting credentialed URLs, source, catalog, and curation schema errors still said the URL "must use http or https". That message is incomplete for rejected values such as `https://user:pass@example.com/feed.xml`, because the protocol is valid but the URL is not acceptable for public content or repository-backed configuration.
- Fix: Source, catalog, and curation URL schema errors now state that URLs must be public http or https URLs, and source/curation config tests cover credentialed URL rejection.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\catalog\config.test.ts src\curations\config.test.ts src\config\url.test.ts` passing 4 files / 75 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning only the expected `url.password` URL-property guard match.
- Notes: This only improves validation feedback and test coverage; the rejection behavior is implemented by `SI-ISSUE-321`.

### 2026-05-31 - SI-ISSUE-321 - Shared HTTP URL normalization accepts credentialed URLs

- Priority: P2
- Status: VERIFIED
- Area: config | frontend | ingestion | security | tests
- Found In: follow-up shared URL boundary review after `SI-ISSUE-320`
- Evidence: Shared `normalizeHttpUrl` only checked the `http/https` protocol. Values such as `https://user:pass@example.com/article` could therefore pass through public link rendering, company/curation/source config parsing, collector URL normalization, and API serializers even though credentials in URLs are not appropriate for public content or repository-backed configuration.
- Fix: Shared HTTP URL normalization now rejects URLs with a `username` or `password` component after optional relative URL resolution, while preserving existing `http/https` canonicalization for ordinary public URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\config\url.test.ts src\utils.test.ts src\catalog\config.test.ts` passing 3 files / 63 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 424 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning only the expected `url.password` URL-property guard match.
- Notes: This does not add secret handling; credentialed URLs are rejected rather than redacted or stored.

### 2026-05-31 - SI-ISSUE-320 - Detail route helpers encode accidental boundary whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | routing | URL-quality | tests
- Found In: follow-up route helper review after `SI-ISSUE-319`
- Evidence: Shared detail route helpers encoded the raw dynamic value. If a historical API row or future serializer passed a padded slug or external id such as ` rocket-lab `, the frontend would generate URLs like `/companies/%20rocket-lab%20`; backend detail queries have trim-level compatibility, but the visible URL remains noisy.
- Fix: Shared route segment encoding now trims leading and trailing whitespace before `encodeURIComponent`, while still encoding internal spaces, slashes, query characters, and launch external IDs safely.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\routes.test.ts src\components\ArticleCard.test.tsx` passing 2 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 423 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code/test sensitive-pattern scan returning no matches.
- Notes: This does not change static route names, query-parameter filters, or internal whitespace inside route identifiers.

### 2026-05-31 - SI-ISSUE-319 - Company sector lists keep duplicate or whitespace-drifted taxonomy values

- Priority: P3
- Status: VERIFIED
- Area: catalog | config | api | data-quality | tests
- Found In: follow-up catalog taxonomy review after `SI-ISSUE-318`
- Evidence: Company `sector` parsing normalized internal whitespace but still preserved duplicate effective sector entries such as `Launch, launch`; public taxonomy label helpers also only trimmed values, so historical rows or manual sync data containing `Satellite   internet` could fall back to `赛道待确认` or show duplicate labels.
- Fix: Shared company taxonomy helpers now collapse internal whitespace for country and sector label lookup, and sector labels dedupe repeated non-empty values by case-insensitive key. Company sector config parsing also dedupes non-empty sector values after whitespace normalization while preserving the first configured spelling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts functions\api\_companies.test.ts` passing 2 files / 19 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 422 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code/test sensitive-pattern scan returning no matches.
- Notes: This leaves supported taxonomy IDs and existing public labels unchanged; trailing empty sector values still fail validation.

### 2026-05-31 - SI-ISSUE-318 - Catalog taxonomy fields reject internal whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: catalog | config | taxonomy | data-quality | tests
- Found In: follow-up catalog taxonomy review after `SI-ISSUE-317`
- Evidence: Company `country` and comma-separated `sector` values were trimmed but not normalized for internal whitespace before enum validation. Future catalog entries such as `United   States` or `Satellite   internet` would be rejected even though they are human-readable variants of supported taxonomy values.
- Fix: Company country and sector taxonomy parsing now collapses internal whitespace before validation, and sector lists are normalized around comma separators before storage.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused catalog config/test sensitive-pattern scan returning no matches.
- Notes: This keeps supported taxonomy IDs, public labels, slugs, URLs, and existing catalog record counts unchanged.

### 2026-05-31 - SI-ISSUE-317 - Curation notes keep internal whitespace noise

- Priority: P3
- Status: VERIFIED
- Area: curations | config | generated-config | data-quality | tests
- Found In: follow-up curation configuration review after `SI-ISSUE-316`
- Evidence: Curation `note` fields were trimmed but could keep repeated spaces or tabs. Topic detail display has later whitespace fallback, but parsed curation records and config sync can still carry noisy note metadata.
- Fix: Home, pinned, and topic curation notes now collapse internal whitespace during curation config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts` passing 1 file / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused curation config/test sensitive-pattern scan returning no matches.
- Notes: This keeps curation URLs, target keys, weights, enablement, and duplicate-target checks unchanged.

### 2026-05-31 - SI-ISSUE-316 - Catalog display text keeps internal whitespace noise

- Priority: P3
- Status: VERIFIED
- Area: catalog | config | generated-config | data-quality | tests
- Found In: follow-up catalog configuration review after `SI-ISSUE-315`
- Evidence: Company names, English names, profiles, stock symbols, topic names, and topic keywords were trimmed at parse time but could keep repeated spaces or tabs. Public serializers and frontend display helpers normalize many of these values later, but generated config and catalog sync can still receive noisy catalog metadata.
- Fix: Company and topic display text now collapses internal whitespace during catalog config parsing, and topic keyword dedupe uses the normalized keyword text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused catalog config/test sensitive-pattern scan returning no matches.
- Notes: This keeps slugs, taxonomy enums, URL normalization, and existing catalog record counts unchanged.

### 2026-05-31 - SI-ISSUE-315 - Source default relation metadata keeps internal whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | entity-relations | data-quality | tests
- Found In: follow-up source relation metadata review after `SI-ISSUE-314`
- Evidence: Source `default_tags` and `default_companies` were trimmed and deduped through a lowercase reference key, but internal whitespace was not normalized. Future source defaults such as `Rocket   Lab` could be preserved in collector output or fail default-reference validation against catalog identifiers written as `Rocket Lab`.
- Fix: Source default relation lists and default-reference validation now collapse internal whitespace before dedupe and lookup comparison, preserving the normalized first configured value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This only changes parser-level source default relation metadata; catalog slugs, relation persistence SQL, source access, and source enablement remain unchanged.

### 2026-05-31 - SI-ISSUE-314 - Source display and governance text keeps internal whitespace noise

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | generated-config | catalog-sync | data-quality | tests
- Found In: follow-up source configuration review after `SI-ISSUE-313`
- Evidence: Source `name`, `purpose`, `expected_content`, `risk_notes`, `access_note`, and `public_badge` were trimmed at parse time but could keep repeated spaces or tabs. Public display helpers normalize some of these fields later, but generated config and D1 source catalog sync can still receive noisy source metadata.
- Fix: Required source display/governance text and optional public source metadata now collapse internal whitespace during source config parsing before generated config, catalog sync, and collector use.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This keeps source keys, URLs, access statuses, category enums, dedupe strategy, and source enablement unchanged.

### 2026-05-31 - SI-ISSUE-313 - Source include and exclude terms keep whitespace and case variants

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | filtering | data-quality | tests
- Found In: follow-up source configuration review after `SI-ISSUE-312`
- Evidence: Source `include_terms` and `exclude_terms` were trimmed and deduped by exact string only. A future source config containing `Commercial   Space` and `commercial space`, or an English phrase with repeated whitespace, would keep duplicate effective terms and could fail substring matching against normally spaced article text.
- Fix: Source include and exclude terms now collapse internal whitespace and dedupe case-insensitively while preserving the first configured spelling after normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: Default tag and company references keep their existing reference-key normalization; this change is limited to source filtering term metadata.

### 2026-05-31 - SI-ISSUE-312 - HTML list extraction can leave escaped tags in official and procurement metadata

- Priority: P3
- Status: VERIFIED
- Area: ingestion | html-list | official-pages | procurement | data-quality | tests
- Found In: follow-up HTML list extraction review after `SI-ISSUE-311`
- Evidence: The HTML list extraction helper removed literal tags before HTML entity decoding, but did not remove tags that appeared only after decoding escaped markup such as `&lt;span&gt;...&lt;/span&gt;`. Official page and procurement collectors can therefore cache visible tag text in extracted titles, context text, summaries, or relevance signals.
- Fix: HTML list text extraction now removes script/style blocks and tags before and after entity decoding. Literal `span` tags keep their separator role for common date/title layouts, while decoded escaped `span` tags are treated as inline markup noise.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 71 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 421 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused HTML list/collector/test sensitive-pattern scan returning no matches.
- Notes: This only changes extracted text cleanup; URL filtering, relevance terms, date parsing, source access, and source enablement remain unchanged.

### 2026-05-31 - SI-ISSUE-311 - Collector text cleanup can leave escaped HTML tags in cached metadata

- Priority: P3
- Status: VERIFIED
- Area: ingestion | collectors | article-text | data-quality | tests
- Found In: follow-up collector text cleanup review after `SI-ISSUE-310`
- Evidence: The shared collector text helpers removed literal tags before HTML entity decoding, while `collectorDisplayText` previously only decoded entities. Upstream values such as `&lt;b&gt;Rocket&lt;/b&gt;` could therefore be decoded back into visible `<b>` tags and enter normalized article titles, source names, publisher names, summaries, or launch metadata before later public display fallbacks.
- Fix: Collector text cleanup now removes script/style blocks and HTML tags both before and after entity decoding, while preserving block-level spacing and deleting inline tags without adding noisy spaces. Google News title parsing now uses the same collector display cleanup for title, publisher, and original title fields.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused collector/test sensitive-pattern scan returning no matches.
- Notes: This keeps the existing source access, source enablement, URL normalization, date normalization, and dedupe behavior unchanged.

### 2026-05-31 - SI-ISSUE-310 - SNAPI article text is cached with only trim-level cleanup

- Priority: P3
- Status: VERIFIED
- Area: ingestion | snapi | article-text | tests
- Found In: follow-up collector text normalization review after `SI-ISSUE-309`
- Evidence: The Spaceflight News API collector only trimmed article titles, publisher/source names, and summaries. Upstream strings with repeated whitespace or simple HTML in summaries could therefore enter normalized article records before persistence, leaving later public serializers to clean up data that should already be normalized at the collector boundary.
- Fix: SNAPI article titles and source/publisher names now use the shared collector display normalization, and summaries use shared HTML stripping and whitespace normalization before persistence.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused SNAPI collector/test sensitive-pattern scan returning no matches.
- Notes: This keeps the existing URL, raw id, launch relation, and date normalization behavior.

### 2026-05-31 - SI-ISSUE-309 - Launch metadata text is cached without collector-level normalization

- Priority: P3
- Status: VERIFIED
- Area: ingestion | launch-cache | data-quality | tests
- Found In: follow-up launch metadata review after `SI-ISSUE-308`
- Evidence: Launch Library mission, rocket, provider, site, and status strings were copied directly from the upstream payload. Public serializers normalize display text later, but padded or repeated-whitespace metadata could still be stored in `launches` and affect search/filter quality before the public fallback layer.
- Fix: Launch Library collection now normalizes launch text metadata at the collector boundary, including mission fallback, optional rocket/provider/site fields, and status fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused launch collector/test sensitive-pattern scan returning no matches.
- Notes: Route identifiers, raw source URL validation, and launch window ISO normalization keep their existing behavior.

### 2026-05-31 - SI-ISSUE-308 - Launch window dates are not canonicalized before persistence

- Priority: P3
- Status: VERIFIED
- Area: ingestion | launch-cache | data-ordering | tests
- Found In: follow-up launch metadata review after `SI-ISSUE-307`
- Evidence: Launch Library `net` values were copied directly into `windowStart`. If the upstream response provides a valid but non-ISO date string, or an invalid placeholder string, the value can enter `launches.window_start` and affect text-based upcoming filters, ordering, and retention cleanup.
- Fix: Launch window parsing now reuses collector ISO date normalization. Valid launch windows are stored as ISO strings, while blank or invalid launch window values become `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused launch collector/test sensitive-pattern scan returning no matches.
- Notes: This only changes launch cache metadata normalization; source URLs and launch IDs keep their existing boundaries.

### 2026-05-31 - SI-ISSUE-307 - Collector dates are validated but not canonicalized

- Priority: P3
- Status: VERIFIED
- Area: ingestion | collectors | data-ordering | tests
- Found In: follow-up collector metadata review after `SI-ISSUE-306`
- Evidence: `collectorPublishedAt` checked whether a feed/API date was parseable, but returned the original trimmed string. RSS feeds commonly provide RFC date text such as `Sat, 09 May 2026 01:00:00 GMT`; storing that directly in `articles.published_at` can make D1 text ordering, retention comparisons, and recent-window stats less stable than ISO timestamps.
- Fix: Collector publication dates now return `Date#toISOString()` after successful parsing and continue to fall back to `context.now().toISOString()` for blank or invalid dates.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused collector/test sensitive-pattern scan returning no matches.
- Notes: This keeps existing fallback behavior while making valid upstream dates canonical before persistence.

### 2026-05-31 - SI-ISSUE-306 - Configured dedupe strategy is not applied during collection

- Priority: P3
- Status: VERIFIED
- Area: ingestion | deduplication | source-config | tests
- Found In: follow-up dedupe strategy review after `SI-ISSUE-305`
- Evidence: `collectSource` created dedupe hashes with only the normalized item fields, and `createDedupeKey` inferred canonical URL/title dedupe only from `google-news-*` source keys. A future RSSHub or other source configured with `dedupe_strategy: canonical_url_title` would still be deduped as `article:<sourceKey>:...`, so the configured strategy would not take effect.
- Fix: Dedupe key/hash generation now accepts the configured source dedupe strategy, and `collectSource` passes `source.dedupe_strategy` when creating ingestion record hashes. The legacy no-strategy fallback remains for direct helper callers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 420 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused ingestion/test sensitive-pattern scan returning no matches.
- Notes: Existing Google News behavior is preserved because those sources already configure `canonical_url_title`; this change makes the strategy config authoritative for future source types too.

### 2026-05-31 - SI-ISSUE-305 - Source dedupe strategy accepts unsupported values

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | catalog-sync | tests
- Found In: follow-up source configuration schema review after `SI-ISSUE-304`
- Evidence: Source `dedupe_strategy` was parsed as any non-empty trimmed string. A future source config typo such as `url-title-source` would therefore pass source parsing and be synced into the D1 `sources.dedupe_strategy` column even though the repository only defines `url_title_source`, `canonical_url_title`, and `external_id` strategy semantics.
- Fix: Source config parsing now validates `dedupe_strategy` against the supported strategy list, normalizes case variants to lowercase, and narrows the `SourceConfig` type to the supported strategy union.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\db\catalog.test.ts` passing 2 files / 52 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 418 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This is a configuration hygiene guard for future source edits; existing repository source strategies remain unchanged.

### 2026-05-31 - SI-ISSUE-304 - Source URLs are validated but not canonicalized

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | generated-config | tests
- Found In: follow-up source URL normalization review after `SI-ISSUE-303`
- Evidence: Source `url` fields were trimmed and checked with `normalizeHttpUrl`, but parsed source records kept the pre-normalized URL string. A future source config using `HTTPS://API.SPACEFLIGHTNEWSAPI.NET/v4/articles/` would therefore carry non-canonical URL text into generated config and collector requests despite passing the same HTTP(S) validation boundary.
- Fix: Source URL parsing now stores the canonical `normalizeHttpUrl` result for all configured source URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 50 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This is a config hygiene cleanup for future source edits; unsafe non-web source URLs still fail validation.

### 2026-05-31 - SI-ISSUE-303 - Catalog company URLs are validated but not canonicalized

- Priority: P3
- Status: VERIFIED
- Area: catalog | config | public-api | tests
- Found In: follow-up catalog URL normalization review after `SI-ISSUE-302`
- Evidence: Company `website` and `logo_url` fields were trimmed and checked with `normalizeHttpUrl`, but parsed records kept the pre-normalized string. A future company config using `https://WWW.ROCKETLABUSA.com` or `https://EXAMPLE.com/logo.svg` would therefore carry non-canonical URL text into generated config and public company payloads despite passing the same HTTP(S) validation boundary.
- Fix: Optional catalog URL parsing now stores the canonical `normalizeHttpUrl` result for company website and logo URLs while preserving blank optional URL fields as empty strings.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused catalog config/test sensitive-pattern scan returning no matches.
- Notes: This is a config hygiene cleanup for future company edits; unsafe non-web company URLs still fail validation.

### 2026-05-31 - SI-ISSUE-302 - Curation URL duplicate checks run before URL canonicalization

- Priority: P3
- Status: VERIFIED
- Area: curations | config | data | tests
- Found In: follow-up curation config URL boundary review after `SI-ISSUE-301`
- Evidence: Curation URLs were trimmed and checked with `normalizeHttpUrl`, but the parsed record kept the pre-normalized URL string. A future manual curation using `https://EXAMPLE.com/top` beside `https://example.com/top` would pass duplicate-target checks even though both point to the same public URL after standard URL canonicalization.
- Fix: Curation URL parsing now stores the canonical `normalizeHttpUrl` result, so duplicate target checks and persisted curations compare canonical HTTP(S) URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts` passing 1 file / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused curation config/test sensitive-pattern scan returning no matches.
- Notes: This is limited to manually configured curations; unsafe non-web URLs still fail validation.

### 2026-05-31 - SI-ISSUE-301 - Topic keyword normalization keeps case-variant duplicates

- Priority: P3
- Status: VERIFIED
- Area: catalog | entity-matching | config | tests
- Found In: follow-up catalog keyword normalization review after `SI-ISSUE-300`
- Evidence: `matchArticleEntities` performs topic keyword matching case-insensitively, but `parseTopicsConfig` deduplicated keywords by exact trimmed strings. A future topic config containing `reusable rocket` and `Reusable Rocket` would therefore keep duplicate effective keywords in generated config and matching loops even though both match the same text.
- Fix: Topic keyword normalization now deduplicates by lowercase trimmed key while preserving the first configured keyword spelling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused catalog config/test sensitive-pattern scan returning no matches.
- Notes: This is a config hygiene cleanup for future topic edits; current repository topic keywords are expected to keep the same effective matching behavior.

### 2026-05-31 - SI-ISSUE-300 - Source default relation metadata dedupes case variants late

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | data | tests
- Found In: follow-up source default relation normalization review after `SI-ISSUE-299`
- Evidence: `assertValidSourceDefaultReferences`, article persistence, and entity backfill now compare configured default tags/companies case-insensitively, but `parseSourcesConfig` still deduplicated `default_tags` and `default_companies` by exact trimmed strings. A future source config with `Rocket Lab` and `rocket lab`, or `satellite-internet` and `Satellite-Internet`, would therefore carry duplicate relation metadata through collector output and rely on later persistence boundaries to collapse it.
- Fix: Source default tag and company lists now deduplicate by the same trimmed lowercase reference key used by validation, while preserving the first configured value. Include/exclude terms keep their existing exact normalized dedupe behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 50 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This is a parser-level cleanup for future source edits; current repository source defaults are expected to keep the same effective relations.

### 2026-05-31 - SI-ISSUE-299 - Source default reference validation is case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: ingestion | source-config | data | tests
- Found In: follow-up source default relation validation review after `SI-ISSUE-298`
- Evidence: Article persistence and entity backfill now resolve configured tag/company relations with case-insensitive lookup, but `assertValidSourceDefaultReferences` still built exact string sets from catalog slugs/names. A future source default such as `Reusable-Rockets` or `rocket lab` could therefore fail config validation even though downstream relation lookup can resolve the existing lowercase topic slug or differently cased company name.
- Fix: Source default reference validation now trims and lowercases both configured defaults and catalog reference keys before comparison while preserving the original configured value in error messages.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 50 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 417 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused source config/test sensitive-pattern scan returning no matches.
- Notes: This only widens validation compatibility; parsed source defaults and relation persistence values remain unchanged.

### 2026-05-31 - SI-ISSUE-298 - Entity backfill relation lookup is case-sensitive for matched slugs

- Priority: P3
- Status: VERIFIED
- Area: ingestion | admin | entity-backfill | data | tests
- Found In: follow-up entity backfill relation review after `SI-ISSUE-297`
- Evidence: Article persistence now normalizes tag and company relation lookups, but `upsertConfiguredEntityLinks` still built relation statements from raw `companySlugs` and `topicSlugs`, deduplicating exact strings and matching `slug = ?`. A future matcher or manual enrichment path returning `Rocket-Lab` / `Reusable-Rockets` variants could therefore create redundant no-op statements or miss existing lowercase catalog slugs during admin/daily entity backfill.
- Fix: Entity backfill relation slugs now trim, lowercase, drop blanks, dedupe after normalization, and compare catalog slugs through `LOWER(slug)`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\entityLinks.test.ts` passing 1 file / 3 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 416 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This keeps the incremental `INSERT OR IGNORE` semantics and does not clear source-default relations.

### 2026-05-31 - SI-ISSUE-297 - Article relation linking is case-sensitive for tags and companies

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data | article-relations | tests
- Found In: follow-up article relation persistence review after `SI-ISSUE-296`
- Evidence: Article relation persistence trimmed tag and company values but matched tags with `slug = ?` and companies with `slug = ? OR name = ? OR english_name = ?`. Historical collector output or future source defaults with case variants such as `Reusable-Rockets` or `Rocket Lab` could therefore miss existing lowercase slugs or differently cased catalog names and silently lose expected article relations.
- Fix: Article tag and company relation lookup values now deduplicate after lowercase normalization, and relation insert queries compare against `LOWER(slug)`, `LOWER(name)`, and `LOWER(english_name)` as appropriate.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\db.test.ts` passing 1 file / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 415 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This only affects relation lookup robustness during article persistence; public article serialization and existing relation rows are unchanged.

### 2026-05-31 - SI-ISSUE-296 - Prefixed legacy source filters can miss configured source keys

- Priority: P3
- Status: VERIFIED
- Area: api | source-filter | compatibility | tests
- Found In: follow-up source filter boundary review after `SI-ISSUE-295`
- Evidence: Source display cleanup now repeatedly removes collector prefixes, but public source filter mapping normalized incoming filter values only by whitespace and case. A stale link such as `/api/articles?source=Google News RSS - RSSHub - 微博商业航天关键词` could therefore bypass the configured public-name map and reach the article query as an unmapped source value, returning empty results even when the cleaned public source exists.
- Fix: Public source filter normalization now reuses the shared aggregator-prefix cleanup before mapping public labels or legacy raw labels to source keys.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_sourceFilters.test.ts src\utils.test.ts` passing 2 files / 53 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 414 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: Unknown source filters still fall back to the submitted value for compatibility; only known configured source labels gain the stronger cleanup path.

### 2026-05-31 - SI-ISSUE-295 - Chained aggregator prefixes can leak into public source labels

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | source-display | tests
- Found In: follow-up source display boundary review after `SI-ISSUE-294`
- Evidence: `stripAggregatorPrefix` removed only the first known collector prefix. A legacy or future label such as `Google News RSS - RSSHub - 微博商业航天关键词` would become `RSSHub - 微博商业航天关键词`, still exposing an implementation prefix in article/source display surfaces that reuse the shared helper.
- Fix: The shared source display helper now repeatedly removes known aggregator prefixes after whitespace normalization until no public collector prefix remains.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts` passing 1 file / 48 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 414 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This keeps Google News RSS and RSSHub as allowed collectors while preventing chained collector labels from becoming user-facing copy.

### 2026-05-31 - SI-ISSUE-294 - Public article launch references can keep fallback labels over later usable names

- Priority: P3
- Status: VERIFIED
- Area: api | public-contract | article-detail | launch-references | tests
- Found In: follow-up public article launch reference review after `SI-ISSUE-293`
- Evidence: Public article detail launch serialization deduplicated launches by a raw `id/externalId/name` key and preserved the first launch object. Legacy detail payloads with external-id case drift, or a first launch reference that only had a fallback label followed by a duplicate with a usable mission name, could therefore expose duplicate launch chips or keep an implementation-like fallback label.
- Fix: Public article launch serialization now deduplicates launch keys case-insensitively and replaces fallback labels when a later duplicate provides an explicit mission/name label, while preserving the first route identifier.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\db\articleQueries.test.ts` passing 3 files / 54 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 414 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is the article-detail defensive boundary for associated launch references.

### 2026-05-31 - SI-ISSUE-293 - Public article entities can duplicate slug variants and keep fallback labels

- Priority: P3
- Status: VERIFIED
- Area: api | public-contract | article-entities | tests
- Found In: follow-up public article entity serialization review after `SI-ISSUE-292`
- Evidence: Public article entity serialization trimmed blank slugs and deduplicated exact slug matches, but it used case-sensitive slug keys and preserved the first entity object. Legacy relation payloads with `satellite-internet` and `Satellite-Internet`, or a first blank name followed by a usable label for the same slug, could therefore expose duplicate chips or keep a slug fallback label even though a better display name was available.
- Fix: Public article entity serialization now deduplicates slugs case-insensitively, preserves first-seen route slug ordering, and replaces a fallback slug label when a later duplicate provides a usable explicit name.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\db\articleQueries.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 4 files / 63 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 413 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is the public API defensive boundary for nested company and topic references; clustering remains the upstream quality boundary.

### 2026-05-31 - SI-ISSUE-292 - Clustered entity links can keep blank labels over later usable names

- Priority: P3
- Status: VERIFIED
- Area: data | api | article-clustering | entity-links | tests
- Found In: follow-up entity-link clustering review after `SI-ISSUE-291`
- Evidence: `SI-ISSUE-291` merged topic and company links across duplicate story rows, but duplicate slugs preserved the first entity object. If the first row carried a valid slug with a blank name and a later duplicate row carried the same slug with a usable label, the clustered article list row could still reach public serialization with the blank label and fall back to displaying the slug.
- Fix: Entity-link merging now trims stored slugs and, for duplicate slugs, replaces a blank existing name with the later usable name while preserving first-seen ordering.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts functions\api\_articles.test.ts src\components\ArticleCard.test.tsx` passing 3 files / 50 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 413 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This only improves clustered list-row metadata quality; public API entity normalization remains a second defensive boundary.

### 2026-05-31 - SI-ISSUE-291 - Article clustering can drop entity links from duplicate story rows

- Priority: P3
- Status: VERIFIED
- Area: data | api | article-clustering | entity-links | tests
- Found In: follow-up article clustering review after `SI-ISSUE-290`
- Evidence: `clusterArticleRows` keeps the newest row for a repeated story and previously only carried forward `relatedSources`. If an older source row had company or topic links and a newer duplicate row did not, the returned article card could lose visible entity chips even though the cluster still represented the same story coverage.
- Fix: Article clustering now merges `tags` and `companies` across duplicate story rows by cleaned slug while preserving the newest article row for title, URL, time, and source display fields.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts functions\api\_articles.test.ts src\components\ArticleCard.test.tsx` passing 3 files / 49 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 412 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This keeps entity context attached to clustered list cards; article detail responses remain tied to the selected article id.

### 2026-05-31 - SI-ISSUE-290 - Article clustering can overcount duplicate related source labels

- Priority: P3
- Status: VERIFIED
- Area: data | api | article-clustering | source-display | tests
- Found In: follow-up related-source clustering review after `SI-ISSUE-289`
- Evidence: Public article serialization and frontend display now deduplicate related source labels after aggregator-prefix cleanup and case normalization, but `clusterArticleRows` still used raw `existing.relatedSources.includes(publisherLabel)`. Rows for the same story with labels such as `Spaceflight News API`, `spaceflight news api`, or `Google News RSS - Spaceflight News API` could therefore inflate `relatedSourceCount` before the public API compatibility layer corrected it.
- Fix: Article clustering now compares related-source labels with the shared aggregator-prefix cleanup and a case-insensitive key before adding a source to the cluster, preserving the first visible label.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 5 files / 109 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 411 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This reduces upstream cluster noise; the existing public API and frontend related-source guards remain in place.

### 2026-05-31 - SI-ISSUE-289 - Related source displays can repeat legacy duplicate labels

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | article-detail | source-display | tests
- Found In: follow-up related source display review after `SI-ISSUE-288`
- Evidence: Public article serialization deduplicates `relatedSources`, but the frontend `displayRelatedSourceNames` compatibility helper only stripped aggregator prefixes, collapsed whitespace, dropped blanks, and then applied the display limit. A stale or abnormal payload such as `SpaceNews`, `spacenews`, and `Google News RSS - SpaceNews` could therefore render the same source more than once on article cards or article details after display cleanup.
- Fix: `displayRelatedSourceNames` now deduplicates cleaned labels with a case-insensitive key before applying the display limit, preserving the first visible spelling and existing blank-label handling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 3 files / 71 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 410 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale related-source payloads; current API related-source serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-288 - Article title and summary surfaces can render legacy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | article-detail | article-mapping | tests
- Found In: follow-up article text display review after `SI-ISSUE-287`
- Evidence: Public article serialization normalizes titles, original titles, summaries, and original summaries, but `articleFromApi`, article cards, and article detail pages still rendered raw title and summary fields. Legacy payloads such as ` Reusable   rocket\tmilestone ` or ` Short\nsummary   only. ` could therefore show noisy titles, summaries, aria labels, and original-text blocks on article surfaces.
- Fix: Added shared article text display helpers with Chinese fallbacks, used them in `articleFromApi`, article cards, and article detail title/summary/original-text rendering while preserving existing source URL and routing behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 3 files / 70 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 409 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale article payloads; current API article serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-287 - Related source lists can render legacy source label noise

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | article-detail | source-display | tests
- Found In: follow-up related source display review after `SI-ISSUE-286`
- Evidence: Public article serialization normalizes `relatedSources`, but article cards and article detail pages still joined `item.relatedSources` / `article.relatedSources` directly. Legacy payloads such as `Google News RSS - 商业   航天`, padded source labels, or blank related-source entries could therefore show aggregator implementation prefixes or noisy whitespace in multi-source coverage displays.
- Fix: Added shared `displayRelatedSourceNames` normalization that strips aggregator prefixes, collapses whitespace, drops blank labels, and applies the existing four-source display limit. Article cards and article details now use this helper before rendering related source lists.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 3 files / 66 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 405 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale article payloads; current API article serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-286 - Article entity chips can render legacy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | article-detail | entity-chips | tests
- Found In: follow-up article entity chip review after `SI-ISSUE-285`
- Evidence: Public article serialization normalizes nested company, topic, and launch labels, but article cards still rendered `company.name` / `tag.name` directly and article detail helpers returned raw nested entity labels. Legacy payloads such as ` Rocket   Lab `, ` 可回收   火箭 `, or ` Demo   launch ` could therefore show noisy entity chips on article surfaces.
- Fix: Article cards now normalize company and topic chip labels before rendering, including `data-profile`; article detail entity helpers now reuse shared company/topic/launch display normalization while preserving existing route slug behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 3 files / 63 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 402 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale nested article payloads; current API article serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-285 - Command palette can render legacy whitespace in visible labels

- Priority: P3
- Status: VERIFIED
- Area: frontend | command-palette | search | tests
- Found In: follow-up command palette review after `SI-ISSUE-284`
- Evidence: Search URLs, company pages, topic pages, and article filter suggestions now normalize visible entity text, but the command palette still rendered raw `commandQuery.trim()`, `company.name`, and `topic.name`. Legacy payloads or typed input such as ` Rocket   Lab ` or ` 可回收   火箭 ` could therefore show noisy command menu labels while navigating to normalized routes.
- Fix: Added command-palette label helpers that normalize visible search labels and reuse the shared company/topic display helpers for command entity labels. Command item keys now use route targets instead of normalized labels to avoid collisions after cleanup.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SiteHeader.test.tsx src\utils.test.ts src\pages\CompaniesPage.test.tsx src\pages\TopicsPage.test.tsx` passing 4 files / 58 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 399 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale company/topic payloads and noisy command input; search URL behavior remains unchanged.

### 2026-05-31 - SI-ISSUE-284 - Article filter suggestions can render legacy entity whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-filter | datalist | tests
- Found In: follow-up article filter suggestion review after `SI-ISSUE-283`
- Evidence: Company and topic list/detail surfaces now normalize visible names, but `ArticleFilterPanel` still wrote raw `topic.name` and `company.name` into the topic/company datalist option values. Legacy payloads such as ` 可回收   火箭 ` or ` Rocket   Lab ` could therefore show noisy suggestions in the advanced article filter, even though submitted filter URLs are normalized later.
- Fix: Article filter datalist options now reuse `displayTopicName` and `displayCompanyName`, preserving existing Chinese fallbacks while keeping route slugs out of public suggestion values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticlesPage.test.tsx src\utils.test.ts src\pages\TopicsPage.test.tsx src\pages\CompaniesPage.test.tsx` passing 4 files / 56 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 397 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale company/topic metadata payloads; current API serializers remain unchanged.

### 2026-05-31 - SI-ISSUE-283 - Source filter options can miss legacy category label variants

- Priority: P3
- Status: VERIFIED
- Area: frontend | source-filter | policy-filter | tests
- Found In: follow-up source option review after `SI-ISSUE-282`
- Evidence: The public sources API normalizes source names, category labels, and public badges, but `SourceOptions` still filtered sources with exact `allowedCategoryLabels.includes(source.categoryLabel)` and rendered `source.name` / `source.publicBadge` directly. Legacy payloads such as ` 官方   机构 ` or ` 国家   航天局 ` could therefore hide valid policy filter options or show noisy option labels.
- Fix: `SourceOptions` now compacts category labels before matching allowed categories, normalizes source option names and public badges before rendering, and keeps the existing `来源` fallback for blank names.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SourceOptions.test.tsx src\pages\PolicyPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 3 files / 8 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 397 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for stale source metadata payloads; current API source serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-282 - Legacy topic labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | topic-list | topic-detail | tests
- Found In: follow-up topic display review after `SI-ISSUE-281`
- Evidence: Public topic serialization normalizes topic names and category labels, but topic list cards and topic detail titles still rendered `topic.name`, `categoryLabel`, and `state.data.name` directly. Legacy payloads such as ` 可回收   火箭 ` or ` 技术   路线 ` could therefore show noisy topic labels on visible topic surfaces.
- Fix: Added shared `displayTopicName` and `displayTopicCategory` normalization helpers and reused them in topic list cards and topic detail titles while preserving existing Chinese fallbacks.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 3 files / 58 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 396 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal topic payloads; current API topic serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-281 - Legacy company metadata labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | company-list | company-detail | tests
- Found In: follow-up company metadata review after `SI-ISSUE-280`
- Evidence: Public company serialization normalizes country labels, sector labels, and stock symbols, but company list cards and the company detail metadata grid still rendered `countryLabel`, `sectorLabel`, and `stockSymbol` directly. Legacy payloads such as ` 美   国 `, ` 发射   服务 `, or ` NASDAQ:   RKLB ` could therefore show noisy metadata on visible company surfaces.
- Fix: Added shared `displayCompanyMetadata` normalization and reused it in company list cards and company detail metadata while preserving existing Chinese fallbacks for unknown region, sector, and stock status.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx` passing 3 files / 59 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 393 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal company payloads; current API company serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-280 - Legacy company name labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | company-list | company-detail | tests
- Found In: follow-up company display review after `SI-ISSUE-279`
- Evidence: Public company serialization normalizes company names, but company list cards and the company detail page title still rendered raw `company.name` / `state.data.name`. Legacy payloads such as ` Rocket   Lab ` could therefore show noisy company titles on visible company surfaces.
- Fix: Added shared `displayCompanyName` normalization and reused it for company list card titles and company detail page titles while preserving existing Chinese fallbacks.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx` passing 3 files / 55 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 389 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal company payloads; current API company serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-279 - Legacy company profile text can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | company-detail | tests
- Found In: follow-up company detail review after `SI-ISSUE-278`
- Evidence: Public company serialization normalizes profile text, but the company detail page still rendered `state.data.profile` directly and only fell back when it was empty. Legacy payloads containing repeated spaces or newlines, such as `Commercial   launch\nprovider.`, could therefore show unstable profile text on the company detail page.
- Fix: Company detail profile rendering now collapses repeated whitespace and preserves the existing `暂无公开简介。` fallback for blank profile values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\CompanyDetailPage.test.tsx src\utils.test.ts` passing 2 files / 48 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 386 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal company payloads; current API company serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-278 - Legacy topic curation notes can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | topic-detail | curations | tests
- Found In: follow-up topic detail review after `SI-ISSUE-277`
- Evidence: Public topic serialization normalizes curation notes, but the topic detail page's local `curationLabel` helper only trimmed note text before rendering it. Legacy payloads such as ` 精选   资料 ` could therefore show noisy curation labels even though missing notes already fall back to a clean domain label.
- Fix: Topic detail curation labels now collapse repeated whitespace before rendering note text, while preserving the existing domain fallback when notes are blank.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\TopicDetailPage.test.tsx src\utils.test.ts` passing 2 files / 49 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 385 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal topic payloads; current API topic serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-277 - Legacy launch mission labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | launch-detail | launch-list | home-hud | tests
- Found In: follow-up launch metadata review after `SI-ISSUE-276`
- Evidence: Public launch serialization normalizes mission names, but launch detail titles, launch timeline cards, and home HUD launch strips still rendered `launch.mission` directly. Legacy payloads such as ` Demo   launch ` could therefore show noisy task names on visible launch surfaces.
- Fix: Added shared `displayLaunchMission` normalization and reused it for launch detail page titles, launch timeline card titles, and HUD launch strip titles while preserving existing fallback copy for unavailable records.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 4 files / 69 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 384 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal launch payloads; current API launch serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-276 - Legacy launch rocket and site labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | launch-detail | launch-list | tests
- Found In: follow-up launch metadata review after `SI-ISSUE-275`
- Evidence: Public launch serialization normalizes rocket and site labels, but launch detail metadata and launch timeline cards still rendered `launch.rocket` and `launch.site` directly. Legacy payloads such as ` Falcon   9 ` or ` Cape   Canaveral ` could therefore display noisy metadata in visible launch surfaces.
- Fix: Added shared launch rocket and site display helpers that collapse repeated whitespace and preserve the existing Chinese fallbacks, then reused them in launch detail metadata and launch timeline cards.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 4 files / 65 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 380 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal launch payloads; current API launch serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-275 - Legacy launch provider labels can render with noisy whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | launch-detail | launch-list | tests
- Found In: follow-up launch metadata review after `SI-ISSUE-274`
- Evidence: Public launch serialization normalizes provider labels, and `launchProviderFilterPath` already collapses repeated whitespace before creating filter URLs, but launch detail, launch timeline cards, and the home HUD still rendered `launch.provider` directly. Legacy payloads such as ` Rocket   Lab ` could therefore display noisy provider text while linking to the cleaned `provider=Rocket+Lab` filter.
- Fix: Added shared `displayLaunchProvider` normalization and reused it in launch detail metadata, launch timeline cards, and home HUD launch strips. Placeholder values such as `发射商   待定` still render as the existing fallback and do not create filter links.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 4 files / 62 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 377 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal launch payloads; current API provider serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-274 - Article detail region label can bypass display normalization

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-detail | region-filter | tests
- Found In: follow-up article detail review after `SI-ISSUE-273`
- Evidence: Article cards normalize `regionLabel` through `displayRegion`, and region filter aliases already handle whitespace variants, but article detail metadata rendered `article.regionLabel` directly and built its region link from the raw label. Legacy payloads such as `国   内` could therefore show noisy region text and fail to link to the domestic article filter.
- Fix: Article detail metadata now normalizes the visible region label with `displayRegion`, and `articleRegionFilterPath` also normalizes before deciding whether a domestic or international filter link is available.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 56 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 373 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, focused SI-274 doc diff inspection, and focused runtime/test sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility cleanup for abnormal detail payloads; current API region serialization remains unchanged.

### 2026-05-31 - SI-ISSUE-273 - Article detail source filter still uses raw publisher truthiness

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-detail | source-filter | tests
- Found In: follow-up article detail review after `SI-ISSUE-272`
- Evidence: `SI-ISSUE-272` fixed article card mapping, but article detail metadata still built its source filter link with `article.publisherName ? undefined : article.sourceName`. Legacy payloads such as `Google News RSS -    ` could therefore keep the detail source label visible while still suppressing the source filter link.
- Fix: Article detail metadata now reuses the shared `articleSourceFilterValue` helper, so article cards and detail pages use the same cleaned distinct-publisher check.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 55 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 372 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused article detail/source mapping sensitive-pattern scan returning no matches.
- Notes: This is a frontend consistency cleanup for legacy payloads; distinct publisher labels still do not generate misleading source filters.

### 2026-05-31 - SI-ISSUE-272 - Legacy publisher labels can suppress source filter pivots

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | source-filter | tests
- Found In: follow-up article mapping review after `SI-ISSUE-271`
- Evidence: `articleFromApi` hid source filter pivots whenever raw `publisherName` was truthy. Legacy or abnormal payloads such as `Google News RSS -    ` or a publisher label that only duplicates the source label could therefore suppress a valid source filter link even though no distinct publisher was present.
- Fix: Article mapping now determines whether a publisher is distinct after aggregator-prefix cleanup and source-label normalization. Empty or duplicate source-like publisher labels keep the source filter pivot; genuinely distinct publisher labels still suppress source filtering.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 54 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused frontend mapping sensitive-pattern scan returning no matches.
- Notes: This is a frontend compatibility guard for legacy payloads; current API publisher cleanup remains unchanged.

### 2026-05-31 - SI-ISSUE-271 - Article card category mapping can miss public label whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-card | category-display | tests
- Found In: follow-up public label normalization review after `SI-ISSUE-270`
- Evidence: `articleFromApi` maps public `sourceCategoryLabel` and `regionLabel` into visible article card categories, but policy-category and region checks used exact display labels. Legacy or abnormal payload values such as `官方   机构`, `国   内`, or `国   际` could therefore fall back to the generic `商业航天` category.
- Fix: Article card mapping now normalizes region labels through `displayRegion` and uses compact public category keys for policy category detection.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 4 files / 47 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused frontend mapping sensitive-pattern scan returning no matches.
- Notes: This is a frontend mapping compatibility cleanup; API category labels remain unchanged.

### 2026-05-31 - SI-ISSUE-270 - Placeholder filter labels can become clickable after whitespace normalization

- Priority: P3
- Status: VERIFIED
- Area: frontend | filter-url | placeholder | tests
- Found In: follow-up filter pivot placeholder review after `SI-ISSUE-269`
- Evidence: Filter pivot helpers now collapse repeated whitespace before creating URLs, but placeholder checks still compared exact display labels. Values such as `来   源` or `发射商   待定` normalized to `来 源` and `发射商 待定`, bypassing the placeholder guard and creating useless source/provider filter links.
- Fix: Source and launch-provider pivot helpers now use compact whitespace-free keys for placeholder detection while preserving the normalized display value for real filter URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\LaunchDetailPage.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 4 files / 57 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused frontend URL helper sensitive-pattern scan returning no matches.
- Notes: This only tightens frontend placeholder detection; valid source and provider filter links remain unchanged.

### 2026-05-31 - SI-ISSUE-269 - Filter pivot links can preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | filter-url | article-card | detail-pages | tests
- Found In: follow-up frontend URL helper review after `SI-ISSUE-268`
- Evidence: Shared form and pagination helpers now collapse internal whitespace, but pivot-link helpers for article sources, companies, topics, and launch providers still only trimmed labels before creating filter URLs. Legacy or abnormal payload labels such as `Spaceflight   Now`, `Rocket   Lab`, or `可回收   火箭` could produce noisy links and reduce filter hit quality.
- Fix: Source, company, topic, and launch-provider filter link helpers now reuse the same internal-whitespace normalization as shared URL parameters before creating public filter URLs, while still dropping blank or placeholder labels.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 6 files / 72 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused frontend URL helper sensitive-pattern scan returning no matches.
- Notes: This is a frontend URL-generation cleanup only; backend filter compatibility remains unchanged.

### 2026-05-31 - SI-ISSUE-268 - Frontend search and filter URLs preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | search | filter-url | tests
- Found In: follow-up frontend URL parameter normalization review after `SI-ISSUE-267`
- Evidence: Shared frontend URL helpers and visible header search only trimmed submitted values. User input such as `Rocket   Lab` could be preserved in `/articles?query=Rocket+++Lab` or API paths, lowering search hit quality and producing noisy filter URLs even though public display and API filter aliases already collapse internal whitespace in other paths.
- Fix: Shared search-parameter serialization and header search paths now collapse repeated whitespace to a single space before creating public URLs, while still dropping all-blank values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\SiteHeader.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\pages\LaunchesPage.test.tsx` passing 5 files / 49 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with LF/CRLF warnings only, and focused frontend URL helper sensitive-pattern scan returning no matches.
- Notes: This affects frontend URL generation only; route allowlists, page limits, and backend filter parsing are unchanged.

### 2026-05-31 - SI-ISSUE-267 - Article region display misses whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | article-display | tests
- Found In: follow-up public display normalization review after `SI-ISSUE-265`
- Evidence: Article region filter aliases already handle whitespace variants, but the shared `displayRegion` helper used by public article serialization only trimmed and lowercased raw region values. Historical values such as `国   内`, `国   际`, or `国   外` could therefore display as `地区待确认` instead of the intended public region label.
- Fix: Region display now collapses internal whitespace and compares compact CJK labels before returning `国内` or `国际`, while preserving the existing explicit fallback for unknown values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\utils.test.ts` passing 4 files / 65 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 371 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with only existing Markdown LF/CRLF warnings, and focused display helper sensitive-pattern scan returning no matches.
- Notes: This only affects public display labels; canonical stored region codes and article filter mapping are unchanged.

### 2026-05-31 - SI-ISSUE-266 - Launch status display misclassifies whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | launch-display | tests
- Found In: follow-up launch display normalization review after `SI-ISSUE-263`
- Evidence: Public launch status labels use `displayLaunchStatus`, but the display helper only lowercased the raw status and did not normalize internal whitespace. Historical or upstream values such as `No   Go` could display as `准备发射`, and `不   成功` could display as `发射成功`, even though the launch status filter aliases had already been hardened.
- Fix: Launch status display now collapses internal whitespace and uses compact matching for Chinese status aliases and spaced `No Go` variants before returning public Chinese status labels.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\utils.test.ts` passing 4 files / 56 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with only existing Markdown LF/CRLF warnings, and focused launch display sensitive-pattern scan returning no matches.
- Notes: This affects only public status label derivation; stored launch status values and status filter query behavior remain unchanged.

### 2026-05-31 - SI-ISSUE-265 - Article region and category filters miss whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: api | article-filter | policy-filter | tests
- Found In: follow-up public filter normalization review after `SI-ISSUE-264`
- Evidence: Public article region and category aliases supported labels such as `国内`, `国际`, `政策监管`, and `官方机构`, but alias normalization only trimmed and lowercased values. URL or form values with internal whitespace such as `国   内`, `国   际`, `政策   监管`, or `官方   机构` could bypass the alias map and reach article queries as unmatched raw values.
- Fix: Article region and category filter alias matching now collapses repeated whitespace and compares compact CJK labels before falling back to the normalized unknown value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\utils.test.ts` passing 4 files / 64 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with only existing Markdown LF/CRLF warnings, and focused public filter sensitive-pattern scan returning no matches.
- Notes: This only widens public filter alias compatibility; existing canonical filters such as `cn`, `global`, and `policy` are unchanged.

### 2026-05-31 - SI-ISSUE-264 - Source filter mapping misses whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: api | source-filter | article-filter | tests
- Found In: follow-up public filter normalization review after `SI-ISSUE-263`
- Evidence: Public source display names already collapse internal whitespace, but source filter mapping only trimmed and lowercased incoming values before mapping public labels back to source keys. A URL or form value such as `Spaceflight   News` or `RSSHub  -   微博商业航天关键词` could bypass the compatibility map and reach the article query as an unmapped source value.
- Fix: Public source filter mapping now normalizes repeated whitespace to a single space for configured public names, raw source names, source keys, and incoming filter values before lookup, while preserving the trimmed original value for unknown filters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_sourceFilters.test.ts functions\api\_articles.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\utils.test.ts` passing 5 files / 69 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with only existing Markdown LF/CRLF warnings, and focused source-filter/launch-filter sensitive-pattern scan returning no matches.
- Notes: This keeps existing source key compatibility and only widens matching for public source-name whitespace variants.

### 2026-05-31 - SI-ISSUE-263 - Launch status filters can misclassify whitespace variants

- Priority: P3
- Status: VERIFIED
- Area: api | launch-filter | tests
- Found In: follow-up launch public filter review after `SI-ISSUE-262`
- Evidence: Public launch status filters trim and lowercase aliases such as `No Go`, `发射成功`, and `不成功`, but did not normalize internal whitespace before matching. Query values like `No   Go` could miss the hold alias and then match the generic `go` rule, while `不   成功` could match the success alias before the failure alias.
- Fix: Launch status filter matching now collapses internal whitespace before alias lookup and uses a compact CJK comparison for Chinese status patterns, preserving existing raw fallback behavior for unknown filters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\utils.test.ts` passing 4 files / 56 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` with only existing Markdown LF/CRLF warnings, and focused runtime launch filter sensitive-pattern scan returning no matches.
- Notes: This only affects public launch filter query normalization; stored launch rows and displayed launch status labels are unchanged.

### 2026-05-31 - SI-ISSUE-262 - Article detail launch references can duplicate after cleanup

- Priority: P3
- Status: VERIFIED
- Area: api | article-detail | launch-display | tests
- Found In: follow-up article detail public serializer review after `SI-ISSUE-261`
- Evidence: Article detail launch references already trim route fields and normalize display labels, but the public payload mapped every joined launch reference through unchanged. Duplicate relation rows or join drift could return the same launch twice, causing repeated launch chips on article detail pages and repeated React keys because the frontend uses the launch route identifier for both path and key.
- Fix: Public article detail serialization now deduplicates launch references after public cleanup, using the same route-oriented priority as the frontend (`id`, then cleaned `externalId`, then display name) and preserving the first public launch label.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 4 files / 76 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime article serializer sensitive-pattern scan returning no matches.
- Notes: This keeps stored article-launch relations unchanged and only cleans the public detail response.

### 2026-05-31 - SI-ISSUE-261 - Article nested entity references can duplicate after slug cleanup

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | entity-display | tests
- Found In: follow-up article public serializer review after `SI-ISSUE-260`
- Evidence: Nested article topic and company references already drop blank slugs and normalize display names, but they did not deduplicate after slug cleanup. Historical relation rows, backfill drift, or query joins could return duplicate references such as ` reusable-rockets ` and `reusable-rockets`, causing repeated chips on article cards and detail pages.
- Fix: Public article entity serialization now deduplicates nested topic and company references by the cleaned slug, preserving the first public display label and keeping route slugs on their existing trim-only boundary.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 4 files / 76 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime article serializer sensitive-pattern scan returning no matches.
- Notes: This is a public payload cleanup only; database relation constraints and stored rows are unchanged.

### 2026-05-31 - SI-ISSUE-260 - Article nested entity and launch labels preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | text-display | tests
- Found In: follow-up article public serializer review after `SI-ISSUE-259`
- Evidence: Article titles, summaries, source labels, publisher labels, and related-source labels already collapse repeated whitespace, but nested article topic/company entity names and launch reference labels still only trimmed outer whitespace. Historical relation rows or backfills with values such as `可回收\t火箭`, `蓝箭   航天`, or `Demo   launch` could still reach article cards and detail pages with unstable spacing.
- Fix: Public article serialization now normalizes whitespace in nested company/topic entity names and article-detail launch names/mission labels, while preserving route slugs and external IDs on their existing trim-only boundaries.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 4 files / 76 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime article serializer sensitive-pattern scan returning no matches.
- Notes: This is a display-only API boundary cleanup; raw relation rows and routing identifiers remain unchanged.

### 2026-05-31 - SI-ISSUE-259 - Topic detail curation count can overstate public curations

- Priority: P3
- Status: VERIFIED
- Area: api | topic-display | external-links | tests
- Found In: follow-up topic detail API boundary review after `SI-ISSUE-258`
- Evidence: After invalid topic curation URLs are omitted from public detail payloads, `curationCount` still came from the raw topic row count. A topic with three enabled historical curation records but only one public `http/https` curation could return one `curations` item while still saying `curationCount: 3`.
- Fix: Topic detail serialization now derives `curationCount` from the same public curation array returned in the response, keeping the detail count aligned with visible and callable curated material.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicDetailPage.test.tsx src\pages\TopicsPage.test.tsx` passing 3 files / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime topic serializer/type sensitive-pattern scan returning no matches.
- Notes: Topic list counts still reflect the list query result because that query does not fetch curation URLs; this fix keeps the richer detail response internally consistent without widening list queries.

### 2026-05-31 - SI-ISSUE-258 - Topic detail API retains unusable curation records after URL cleanup

- Priority: P3
- Status: VERIFIED
- Area: api | topic-display | external-links | tests
- Found In: follow-up topic curation API boundary review after `SI-ISSUE-257`
- Evidence: `SI-ISSUE-257` normalized unsafe or blank topic curation `itemUrl` values to `null`, and the frontend already filtered those records before rendering links. The public topic detail API could still return curation objects that could not be opened, leaving API callers to distinguish between real curated material and sanitized historical rows.
- Fix: Topic curation public serialization now returns no public object for blank or unsafe URLs, topic detail payloads omit those invalid curation records, and the frontend `ApiTopicCuration` contract is back to a required string URL for returned curated material.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicDetailPage.test.tsx src\pages\TopicsPage.test.tsx` passing 3 files / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 370 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime topic serializer/type sensitive-pattern scan returning no matches.
- Notes: This keeps frontend defensive filtering in place for legacy or unexpected payloads, but makes the public API payload cleaner for current topic detail responses.

### 2026-05-31 - SI-ISSUE-257 - Company and topic public URLs preserve unsafe protocols

- Priority: P3
- Status: VERIFIED
- Area: api | company-display | topic-display | external-links | tests
- Found In: follow-up public URL boundary review after `SI-ISSUE-256`
- Evidence: Article and launch public serializers normalize public URLs through `normalizeHttpUrl`, but company `website/logoUrl` and topic curation `itemUrl` still only trim values. Frontend pages apply `safeExternalUrl` before rendering links, but public API payloads can still expose historical database values such as `javascript:alert(1)`, `data:text/html,hi`, or blank curation links to API callers.
- Fix: Company website and logo URLs, plus topic curation item URLs, now reuse `normalizeHttpUrl` at the API serialization boundary, returning `null` for unsafe or blank values while preserving valid `http/https` URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompanyDetailPage.test.tsx src\pages\CompaniesPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\TopicsPage.test.tsx` passing 6 files / 38 tests, follow-up targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 4 files / 30 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 369 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime company/topic serializer sensitive-pattern scan returning no matches.
- Notes: This aligns company/topic public API behavior with existing article and launch URL boundaries.

### 2026-05-31 - SI-ISSUE-256 - Entity and launch public text fields preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: api | company-display | topic-display | launch-display | text-display | tests
- Found In: follow-up public serializer review after `SI-ISSUE-255`
- Evidence: Article public text now collapses repeated whitespace, but company, topic, and launch serializers still only trim public display fields. Historical rows or manual data with values such as `Rocket   Lab`, `Launch\nprovider`, `可回收\t火箭`, or `Demo   launch` can reach company directories, topic pages, launch timelines, and detail pages with unstable spacing.
- Fix: Added public display-text normalization to company, topic, and launch serializers for names, optional text fields, profiles, curation notes, missions, rockets, providers, windows, and sites while leaving route identifiers, URLs, external IDs, and raw storage unchanged.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts functions\api\_launches.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 9 files / 55 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 367 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime company/topic/launch serializer sensitive-pattern scan returning no matches.
- Notes: This is a public-display normalization only; slug, URL, and external ID handling remain on their existing trim/protocol boundaries.

### 2026-05-31 - SI-ISSUE-255 - Article API public titles and summaries preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | text-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-254`
- Evidence: Public source-like labels now collapse repeated whitespace, but `publicArticleSummary` still only trims article title, summary, original title, and original summary. Historical RSS entries, HTML summaries, or manual corrections can preserve text such as `Reusable   rocket\tmilestone` or multi-line summaries, leaving visible article cards and detail pages with unstable spacing.
- Fix: Added public article text normalization for title, summary, original title, and original summary so repeated whitespace collapses to one space before fallback or nullable optional-field handling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 4 files / 76 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 367 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime article serializer sensitive-pattern scan returning no matches.
- Notes: This only affects public display text; raw article storage and original links remain unchanged.

### 2026-05-31 - SI-ISSUE-254 - Shared public source display metadata preserves internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: source-display | source-config | frontend | api | tests
- Found In: follow-up source display helper review after `SI-ISSUE-253`
- Evidence: Article public serialization now collapses repeated whitespace in source-like labels, but shared source display helpers still only trim outer whitespace. A future source configuration or historical source row with labels such as `Spaceflight  News`, `国内访问   可能受限`, or `专业\t媒体` could reach `/api/sources`, source filters, and home source status with unstable text; enabled source display-name uniqueness also compares the uncollapsed display text.
- Fix: Added shared display-text normalization for source display names, aggregator-prefix cleanup, optional access notes, and public badges. Enabled source display-name uniqueness now sees the collapsed public name through `sourceDisplayName`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\ingestion\ingestion.test.ts functions\api\sources.test.ts functions\api\_articles.test.ts` passing 4 files / 111 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 367 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime source-display sensitive-pattern scan returning no matches.
- Notes: This keeps source routing data unchanged and only hardens public display metadata.

### 2026-05-31 - SI-ISSUE-253 - Article API public source labels preserve internal whitespace

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-252`
- Evidence: Public source, publisher, and related-source labels strip aggregator prefixes and trim outer whitespace, but they do not collapse repeated internal whitespace. Historical RSS rows, feed titles, or manual corrections can preserve labels such as `Spaceflight  Now` or `Spaceflight\tNow`, making visible source names look unpolished and allowing related-source dedupe to treat whitespace variants as distinct coverage.
- Fix: Added a shared public display-label helper that strips aggregator prefixes, collapses repeated whitespace to one space, and trims before source fallback, publisher duplicate checks, and related-source dedupe.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 4 files / 75 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 365 tests, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs` passing desktop/tablet/mobile, focused `git diff --check`, and focused runtime article serializer sensitive-pattern scan returning no matches.
- Notes: This is a display-boundary hardening change only; raw article storage and collector output remain unchanged.

### 2026-05-31 - SI-ISSUE-252 - Article API duplicate publisher checks are case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-251`
- Evidence: `SI-ISSUE-249` and `SI-ISSUE-250` normalize publisher labels to `null` when they duplicate the public source name or raw source fallback label, but those comparisons were case-sensitive. Historical rows or different collectors can preserve case variants such as `Spaceflight News` / `spaceflight news` or `Google News` / `google news`, so duplicate publisher labels could still suppress configured-source filter links.
- Fix: Publisher duplicate checks now use the same case-insensitive public label key used by related-source dedupe.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This only affects whether a publisher is considered redundant; distinct publisher labels remain visible.

### 2026-05-31 - SI-ISSUE-251 - Article API related-source dedupe is case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-250`
- Evidence: Public related-source serialization trims labels and removes exact duplicates only. Historical aggregation or different collectors can produce case variants such as `SpaceNews` / `spacenews` or `Spaceflight Now` / `spaceflight now`, causing one source to count as multiple public sources and inflating `relatedSourceCount`.
- Fix: Related source labels now deduplicate by a case-insensitive key while preserving the first display label.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This only changes public coverage counting and display dedupe; raw article storage is unchanged.

### 2026-05-31 - SI-ISSUE-250 - Article API can expose aggregator fallback source labels as publishers

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-249`
- Evidence: Google News RSS records can use the configured source name as `publisherName` when the feed title does not contain a real media publisher, and historical rows may store source-like publisher values such as `Google News RSS - 商业航天` or `Google News - 商业航天`. Public serialization stripped the aggregator prefix and exposed `商业航天` as if it were a real publisher, which also suppresses configured-source filter links in frontend mapping.
- Fix: Public article serialization now treats publisher labels that clean to the raw source fallback label as absent, while preserving genuinely distinct publisher labels from aggregator feeds.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This extends `SI-ISSUE-249` to source-like aggregator fallback names that differ from the public configured source display name.

### 2026-05-31 - SI-ISSUE-249 - Article API can expose duplicate publisher labels that suppress source filters

- Priority: P3
- Status: VERIFIED
- Area: api | article-list | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-248`
- Evidence: RSS, official-page, and procurement collectors set `publisherName` to the same label as `sourceName`. That duplicate label adds no public context, but frontend mapping treats any non-null publisher as an aggregator publisher and disables configured-source filter links. As a result, records from configured sources can lose the direct `/articles?source=...` pivot even when the displayed label is just the same source name.
- Fix: Public article serialization now returns `publisherName: null` when the cleaned publisher label matches the public source name, while preserving genuinely distinct publisher labels such as Google News original publishers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This keeps publisher labels for aggregators while restoring source-filter affordances for direct configured sources.

### 2026-05-31 - SI-ISSUE-248 - Article API can expose generic source fallback as publisher

- Priority: P3
- Status: VERIFIED
- Area: api | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-247`
- Evidence: Public article serialization used the same fallback helper for configured source names and optional publisher names. If a raw publisher such as `Google News RSS -    ` cleaned to an empty label, the API returned `publisherName: "来源"` instead of `null`. Frontend detail and card mapping treat non-null `publisherName` as an aggregator publisher, so this could show a generic source label and suppress the configured-source filter link.
- Fix: Added a dedicated public publisher-label helper so the generic `来源` fallback remains limited to required source names. Optional `publisherName` now returns `null` when its cleaned public label is empty.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This keeps the API distinction between configured source and optional publisher clear.

### 2026-05-31 - SI-ISSUE-247 - Article API can count blank related-source lists as coverage

- Priority: P3
- Status: VERIFIED
- Area: api | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-246`
- Evidence: `publicRelatedSourceLabels` returned `undefined` both when `relatedSources` was absent and when the raw array existed but all entries cleaned to blank labels. `publicArticleSummary` therefore fell back to the stored `relatedSourceCount` in both cases, so historical payloads with only blank related-source entries could still claim multi-source coverage despite having no public source names.
- Fix: Changed `publicRelatedSourceLabels` to return `undefined` only when no related-source list is provided. If a raw list is provided but cleans to zero public labels, public serialization now emits `relatedSourceCount: 0` and keeps `relatedSources` hidden.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This is a narrower continuation of `SI-ISSUE-246` and keeps public coverage counts aligned with publicly displayable source labels.

### 2026-05-31 - SI-ISSUE-246 - Article API can expose single related-source lists after cleanup

- Priority: P3
- Status: VERIFIED
- Area: api | article-detail | source-display | tests
- Found In: follow-up public article serializer review after `SI-ISSUE-245`
- Evidence: `SI-ISSUE-245` prevents the detail page from rendering related-source names when `relatedSourceCount` is `1`, but `publicArticleSummary` still returned `relatedSources` whenever the cleaned list was non-empty. If raw related sources such as `Google News RSS - 商业航天` and `Google News - 商业航天` collapse to one public label, the API could still expose a one-item related-source list instead of treating it as a single-source record.
- Fix: Changed public article serialization to compute `relatedSourceCount` from cleaned unique public labels when raw related-source data is present, and to expose `relatedSources` only when more than one public label remains.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This complements the frontend guard in `SI-ISSUE-245`; it keeps the public API contract internally consistent.

### 2026-05-31 - SI-ISSUE-245 - Article detail related-source block can appear for single-source payloads

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-detail | source-display | tests
- Found In: follow-up article detail review after `SI-ISSUE-244`
- Evidence: After exposing related source names on article details, the rendering condition only checked whether `relatedSources` was present. A stale or defensive payload could include a one-item `relatedSources` array while `relatedSourceCount` remained `1`, causing the detail page to show both `单来源线索` semantics and a redundant `相关来源` block.
- Fix: Changed article detail rendering so related source names appear only when `relatedSourceCount > 1`. Single-source records keep the existing `单来源线索` metadata without a separate related-source block.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticleDetailPage.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: Multi-source details continue to show the cleaned first four related source names.

### 2026-05-31 - SI-ISSUE-244 - Article detail hides related source names for multi-source coverage

- Priority: P3
- Status: VERIFIED
- Area: frontend | article-detail | source-display | tests
- Found In: follow-up article detail review after `SI-ISSUE-243`
- Evidence: Article cards show related source names for multi-source clusters, but the article detail page only displayed the coverage count such as `3 源覆盖`. Users opening the detail page lost the source-name context that helps judge where the same story is being reported.
- Fix: Added a related-source metadata block to article details when cleaned `relatedSources` are present, capped to the same first four sources used by article cards.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticleDetailPage.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: Related source names are already cleaned by the public article serializer; this change only exposes that existing public detail payload on the detail page.

### 2026-05-31 - SI-ISSUE-243 - Source status cards can reuse global access totals as category text

- Priority: P3
- Status: VERIFIED
- Area: frontend | source-display | access-labels | tests
- Found In: follow-up source-status display review after `SI-ISSUE-242`
- Evidence: `LiveHud` normally receives per-category `accessSummaryLabel` values from `/api/sources` or `/api/home`, but its defensive fallback used the global `accessStats` summary when a category item lacked its own access label. That could repeat whole-site access totals under each individual category card, making a category look like it had the same access distribution as the entire source set.
- Fix: Changed the per-category fallback to display `待验证` when a source category item lacks its own `accessSummaryLabel`, instead of reusing global access totals. Added a regression test for malformed or stale source-stat payloads.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\LiveHud.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: Local source and home APIs still return per-category access summaries; this only hardens the frontend against incomplete or stale source-status payloads.

### 2026-05-31 - SI-ISSUE-242 - Filter forms can submit empty public URL parameters

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | filters | tests
- Found In: follow-up filter form review after `SI-ISSUE-241`
- Evidence: Article, policy, and launch list API paths and pagination links already trim URL filters, but the visible GET filter forms still used direct browser submission. Submitting blank fields could create noisy public URLs such as `query=+++`, `source=`, `provider=`, or `status=`, even though the API layer would later drop or ignore those values.
- Fix: Added a shared filter-form path helper that reads only allowed submitted fields, trims values, drops blank values, and returns the base path when no filter remains. Connected the article advanced filter, policy filter, and launch filter forms to this cleaned client-side submit path while keeping their static `action` fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\SiteHeader.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused runtime source sensitive-pattern scan returning no matches.
- Notes: This changes only client-side navigation cleanliness; public API filtering semantics remain unchanged.

### 2026-05-31 - SI-ISSUE-241 - Header search form can submit whitespace-only query state

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | search | tests
- Found In: follow-up header search review after `SI-ISSUE-240`
- Evidence: The command palette search already trims input and returns no search path for blank queries, but the always-visible header search form used the browser GET submission directly. A whitespace-only query could therefore navigate to `/articles?query=+++`, creating a noisy public URL and filter state even though the article API later trims and ignores the blank value.
- Fix: Reused the shared article search-path helper for the visible header form submit path. Non-empty searches now navigate to trimmed `/articles?query=...` paths, and blank searches navigate to `/articles` without a query parameter.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SiteHeader.test.tsx`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, focused runtime source sensitive-pattern scan returning no matches, and manual review that the new `SI-ISSUE-241` documentation text contains no sensitive values.
- Notes: The static form action remains `/articles` as the no-JavaScript fallback; the React submit handler controls the client-side cleaned path.

### 2026-05-31 - SI-ISSUE-240 - Entity detail related-news empty copy can contradict full-results link

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | entity-display | tests
- Found In: follow-up entity detail review after `SI-ISSUE-238`
- Evidence: After adding full article-filter links for truncated company/topic detail previews, a defensive edge case remained: if `articleCount` is greater than zero but the embedded related article array is empty, the page could show both `暂无相关新闻。` / `该专题暂无相关新闻。` and a `查看全部...` link. That presents contradictory state to users.
- Fix: Changed company and topic detail empty-news copy to render only when the loaded detail record reports `articleCount === 0` and no embedded related articles. Records with positive `articleCount` now show the full filtered article link without claiming there are no related articles.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: Normal loaded records with zero related articles keep the existing empty copy.

### 2026-05-31 - SI-ISSUE-239 - Production source API still serves stale internal-field contract

- Priority: P2
- Status: OPEN
- Area: deployment | api | source-display | production
- Found In: production verification after local source API cleanup
- Evidence: Current public request to `https://space.bytebaud.com/api/sources` returned HTTP 200 with top-level keys `items,stats,publicStats,accessStats`; the first item still exposed `key,type,region,credibility,publicCategory,accessDomestic,accessGlobal`, and did not expose the cleaned `categoryLabel/domesticAccessLabel/globalAccessLabel` item fields expected from the local public contract.
- Fix: Pending deployment verification. Local source API cleanup remains covered by `SI-ISSUE-230`, but production is still serving an older response shape and must not be treated as closed until the live endpoint matches the public contract.
- Regression Check: Production check performed with `Invoke-WebRequest https://space.bytebaud.com/api/sources` on 2026-05-31; local regression was not rerun for this documentation-only production finding.
- Notes: This is a deployment-state issue, not a request to disable foreign sources. It affects public API polish and internal implementation leakage on the live site.

### 2026-05-31 - SI-ISSUE-238 - Entity detail pages do not link to full filtered article results

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | entity-display | tests
- Found In: company/topic detail interaction review after `SI-ISSUE-237`
- Evidence: Company and topic detail APIs return only the latest related articles, while the article list already supports full `company` and `tag` filters. Detail pages with more related articles than the embedded preview did not provide a direct path to the complete filtered article result set.
- Fix: Added shared company/topic article filter-path helpers and changed company/topic detail pages to show full article-filter links only when `articleCount` exceeds the embedded related article count. This avoids redundant links when the preview already contains all related articles.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\utils.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: The links reuse existing public `/articles` filters and do not change company/topic detail API response shapes.

### 2026-05-31 - SI-ISSUE-237 - Launch timeline ignores public pagination state

- Priority: P2
- Status: VERIFIED
- Area: frontend | navigation | launch-display | tests
- Found In: launch timeline pagination review after `SI-ISSUE-236`
- Evidence: The launch API supports `page`, `limit`, and `hasMore`, but the launch timeline page always requested only `limit=12` and rendered no previous/next controls. Users could not page through launch results, and URL `page` state had no effect on the API request.
- Fix: Added launch timeline API/path helpers that sanitize `status`, `provider`, `query`, `page`, and `limit`, pass the current page to `/api/launches`, and render previous/next pagination links preserving current public filters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchesPage.test.tsx`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: The page keeps the existing default limit of 12 and caps URL-provided limits at 50, matching the article and policy pagination boundary.

### 2026-05-31 - SI-ISSUE-236 - Launch detail provider metadata cannot pivot to launch filters

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | launch-display | tests
- Found In: launch detail interaction review after `SI-ISSUE-235`
- Evidence: Launch list filtering already supports `provider`, but launch detail metadata rendered the provider only as plain text. Users viewing one launch could not jump directly to the timeline filtered to the same launch provider.
- Fix: Added a shared launch-provider filter-path helper and changed launch detail metadata so usable provider labels link to `/launches?provider=...`. Missing or fallback provider labels remain plain text to avoid empty or misleading filters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchDetailPage.test.tsx src\utils.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: Launch list cards remain whole-card links, so this change intentionally applies to the detail metadata only and avoids nested links.

### 2026-05-31 - SI-ISSUE-235 - Article detail metadata cannot pivot to article filters

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | source-display | tests
- Found In: article detail interaction review after `SI-ISSUE-234`
- Evidence: Article detail metadata showed source and region as plain text, while article cards already support region/source pivots and the article list supports those filters. Users reading a detail page could not jump directly to more articles from the same configured source or region.
- Fix: Moved article source and region filter-path helpers into shared utils, reused them in article cards, and updated article detail metadata so configured source labels and precise regions link to existing filters. Aggregator publisher labels and unknown regions remain plain text to avoid empty or misleading filters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\components\ArticleCard.utils.test.ts src\utils.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: This preserves the `SI-ISSUE-233` boundary: visible publisher labels such as `新华社` do not link to configured-source filters.

### 2026-05-31 - SI-ISSUE-234 - Source-status category links always open the full article list

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | source-display | tests
- Found In: homepage source-status interaction review after `SI-ISSUE-233`
- Evidence: The `LiveHud` source-status cards are rendered as links, but every source category linked to `/articles`. This made precise categories such as `官方机构` and `公告信息` less useful even though the article list already supports the public policy filter.
- Fix: Added a precise source-category route helper in `LiveHud`: `官方机构` and `公告信息` now link to `/articles?category=policy`, while broader categories such as `专业媒体` still link to the full article list to avoid pretending there is a more specific filter.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\LiveHud.test.tsx`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: This deliberately avoids creating unsupported filters for media/data/source categories.

### 2026-05-31 - SI-ISSUE-233 - Article card source labels are not filter links

- Priority: P3
- Status: VERIFIED
- Area: frontend | navigation | source-display | tests
- Found In: article card interaction review during continued optimization pass
- Evidence: Article cards already link region labels to region filters and support public source filtering through the advanced filter form, but the visible source label in each card was plain text. Users could see a source name but could not directly pivot to more articles from that source.
- Fix: Added a small source-filter link helper and changed article cards to link only when a configured public source filter is available, while leaving the generic `来源` fallback and aggregator publisher labels without configured filters as plain text. Nested-link handling already prevents these source links from triggering whole-card navigation.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\ArticleCard.test.tsx src\components\ArticleCard.utils.test.ts src\utils.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: This uses the existing public source-name filter path; it does not expose source keys and does not create empty filters for aggregator publisher labels such as `新华社`.

### 2026-05-31 - SI-ISSUE-232 - Home source fallback omits access-status labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | source-display | tests
- Found In: follow-up homepage source-status review after `SI-ISSUE-231`
- Evidence: `LiveHud` uses `/api/home` `enabledSourceCategories` as a fallback while `/api/sources` is still loading. That fallback only contained category labels and counts, so `sourceAccessText` displayed the generic `可用` label even for categories that include domestic-limited or unverified sources.
- Fix: Added shared source access summary labeling, included source `region` in home stats, and changed `publicHomeStats` to return `accessSummaryLabel` for each enabled source category using configured access metadata or region-based fallback. Updated the frontend type and LiveHud fallback test.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_home.test.ts functions\api\sources.test.ts src\db\homeQueries.test.ts src\utils.test.ts src\components\LiveHud.test.tsx`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: `/api/sources` still provides the richer source-status payload; this prevents the homepage fallback state from temporarily weakening domestic/global access visibility.

### 2026-05-31 - SI-ISSUE-231 - Home source summary ordering can drift from source API ordering

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | source-display | tests
- Found In: follow-up review after `SI-ISSUE-230`
- Evidence: `/api/home` exposes `enabledSourceCategories` as the fallback source-status data used by `LiveHud` while `/api/sources` is still loading. That summary grouped categories in the internal enabled-source order from `getHomeStats`, so the homepage fallback could show source categories in a different order than the dedicated source API.
- Fix: Moved public source category and access-status ordering helpers into `src/sourceDisplay.ts`, updated `/api/sources` to reuse the shared helpers, and changed `publicHomeStats` to aggregate by public category then sort with the same public order.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_home.test.ts functions\api\sources.test.ts src\utils.test.ts src\components\LiveHud.test.tsx`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: This is a low-risk consistency fix for the homepage fallback path; `/api/sources` remains the preferred source-status payload when available.

### 2026-05-31 - SI-ISSUE-230 - Source API public ordering follows internal source order

- Priority: P3
- Status: VERIFIED
- Area: api | source-display | frontend | tests
- Found In: follow-up `/api/sources` review during continued optimization pass
- Evidence: `/api/sources` already hid internal source keys and technical labels locally, but the public item list and summary groups still inherited database/internal ordering. That could make user-facing source status appear as implementation-order data instead of a stable product order, especially as future source types are added.
- Fix: Changed `/api/sources` to return only public fields, sort source items and category stats by public category order (`official`, `media`, `organization`, `notice`, `data`, `source`), sort access summaries by public access order (`direct`, `limited`, `blocked`, `unknown`), and keep fallback source names stripped of aggregator prefixes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, focused `git diff --check`, and focused sensitive-pattern scan over changed source files returning no matches.
- Notes: Production `/api/sources` still needs deployment verification because the live endpoint observed during this pass appeared to be serving an older raw payload, but the local code path no longer exposes those internal fields.

### 2026-05-31 - SI-ISSUE-229 - Layout verification can pass against stale dist output

- Priority: P2
- Status: VERIFIED
- Area: frontend | verification | tests
- Found In: follow-up review after `SI-ISSUE-228`
- Evidence: After `verify-layout` was changed to start a local preview server, the default path still trusted the existing `dist` directory. If source files changed but `dist` had not been rebuilt, the verifier could pass against stale output and miss a current UI regression.
- Fix: Changed `verify-layout` so that, unless `PLAYWRIGHT_TARGET_URL` is explicitly provided for an external target, it runs Vite build first, confirms `dist/index.html` exists, then starts the preview server and runs desktop/tablet/mobile checks.
- Regression Check: Verified with `node scripts\verify-layout.mjs` showing Vite build output followed by desktop/tablet/mobile ok, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched files returning no matches.
- Notes: External/production layout checks remain available with `PLAYWRIGHT_TARGET_URL`; those intentionally do not rebuild local assets.

### 2026-05-31 - SI-ISSUE-228 - Layout verification can inspect a stale dev server

- Priority: P2
- Status: VERIFIED
- Area: frontend | verification | tests
- Found In: local layout verification during continued optimization pass
- Evidence: Running `node scripts\verify-layout.mjs` failed with `policySignal=false` and `policyPage=false` because the script defaulted to `http://127.0.0.1:5173/`. A separate run against a freshly started preview of the current build passed desktop, tablet, and mobile checks, proving the default verifier could inspect an unrelated stale dev server rather than the current worktree.
- Fix: Changed `verify-layout` so that, unless `PLAYWRIGHT_TARGET_URL` is explicitly provided, it allocates a local port, starts `vite preview` for the current `dist` output, waits for readiness, runs the Playwright checks, and then stops the preview process.
- Regression Check: Verified with `node scripts\verify-layout.mjs` passing desktop/tablet/mobile without `PLAYWRIGHT_TARGET_URL`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched files returning no matches.
- Notes: Explicit external checks remain possible by setting `PLAYWRIGHT_TARGET_URL`; the default path now validates the current build artifact.

### 2026-05-31 - SI-ISSUE-227 - Broad official and procurement relevance terms admit non-space records

- Priority: P2
- Status: VERIFIED
- Area: ingestion | source-config | relevance | content-quality | tests
- Found In: full enabled official/procurement source audit after `SI-ISSUE-226`
- Evidence: Live sampling still showed non-space records entering through broad relevance signals: `most-news` admitted a general technology-supervision work meeting via `重大项目`, `beijing-jxj-notices` admitted unrelated financing, recruitment, and water-efficiency notices via source-specific `申报/通知/公示`, and `ccgp-central-procurement` admitted general energy-saving or low-altitude economy procurement-policy records because the title had procurement terms while a neighboring context carried space-domain terms.
- Fix: Removed broad non-domain terms such as `重大项目`, `产业基金`, `规划`, `通知`, `意见`, and `行动方案` from default official-page relevance, removed standalone `申报/通知/公示` style terms from enabled Beijing official-source include lists, regenerated source config, and changed procurement relevance so the title itself must contain a space-domain term while procurement terms may still come from title or row context.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 65 tests, live enabled-source recheck showing `most-news: 0`, `ccgp-central-procurement: 0`, and `beijing-jxj-notices: 1` with the remaining record being the commercial-space public test platform notice, `node scripts\generate-config.mjs --check`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched files returning no matches.
- Notes: This intentionally favors precision for broad government and procurement pages. Direct company and official space-agency sources keep their source-default tags and broader domain-specific terms.

### 2026-05-31 - SI-ISSUE-226 - Generic press-conference relevance admits unrelated official news

- Priority: P2
- Status: VERIFIED
- Area: ingestion | relevance | content-quality | tests
- Found In: live `miit-news` recheck after `SI-ISSUE-225`
- Evidence: Live `miit-news` sampling showed unrelated comprehensive news such as national political items, automotive items, communications events, and general meetings were judged relevant because the shared list-block context contained another item with the generic term `新闻发布会`. This could let non-aerospace official news enter the article feed.
- Fix: Removed generic `新闻发布会` from the default official-page relevance terms. Real aerospace press-conference records remain eligible through specific terms such as `商业航天`, `卫星`, `行动方案`, or source-specific include terms.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 64 tests, live `miit-news` recheck returning `hitCount: 0` for default relevance hits after removing the generic term, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This does not remove `新闻发布会` from the exact navigation-title filter; it only stops using the phrase as a standalone relevance signal.

### 2026-05-31 - SI-ISSUE-225 - Official-page extraction still admits short entries and placeholder hrefs

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live enabled-source audit after `SI-ISSUE-224`
- Evidence: Live sampling still found short non-article candidates from multiple enabled official/company sources, including `miit-news` section labels, `cmse-news` experiment/topic entries, `ccgp-central-procurement` feedback links, `landspace-news` navigation/product/download entries, `spacepioneer-news` merchandise entries, `cas-space-news` product/recruiting/legal entries and `{javascript:;}` placeholder hrefs normalized into apparent same-origin URLs, `deepblueaerospace-news` navigation/share entries, and `changguang-satellite-news` product/promotion entries.
- Fix: Added a placeholder href guard before URL normalization and extended the shared exact short-title filters with the observed navigation, product, recruiting, sharing, legal, and product-family labels while preserving longer article titles.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 64 tests, live recheck showing suspicious short-entry count `0` for sampled `miit-news`, `cmse-news`, `ccgp-central-procurement`, `casic-news`, `landspace-news`, `orienspace-news`, `spacepioneer-news`, `cas-space-news`, `deepblueaerospace-news`, and `changguang-satellite-news`, full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: The fix remains exact-title based; it does not disable external article links from company pages.

### 2026-05-31 - SI-ISSUE-224 - Company official pages can emit product and service entries as articles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live company-source audit after `SI-ISSUE-223`
- Evidence: After restoring external article links, live official/company source sampling still found short product or service entries that match aerospace relevance terms but are not article records, including `orienspace-news` title `引力火箭`, `cas-space-news` titles `产品及服务`, `核心产品`, `发射服务`, `力箭系列火箭`, and `力鸿系列运载器`, and `deepblueaerospace-news` titles `Product`, `Engine`, `Launch Vehicle`, and `Launch`.
- Fix: Added exact short-title filters for the observed product/service labels while keeping longer article titles containing those words eligible.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live recheck showing `badCount: 0` for sampled `orienspace-news`, `cas-space-news`, and `deepblueaerospace-news` product/service labels while preserving external article candidates, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This continues the exact-title noise-control approach from `SI-ISSUE-212`; it does not block real article titles that mention these products.

### 2026-05-31 - SI-ISSUE-223 - Same-origin official-page filtering drops real external article links

- Priority: P1
- Status: VERIFIED
- Area: ingestion | content-quality | regression | tests
- Found In: regression audit after `SI-ISSUE-222`
- Evidence: Live source sampling showed legitimate article candidates on official/company pages can be external URLs: `orienspace-news` currently has multiple real company news cards linking to `https://mp.weixin.qq.com/...`, while `cas-space-news` and `changguang-satellite-news` expose external article/media report URLs. The blanket same-origin filter added for `SI-ISSUE-222` would drop those legitimate records and reduce source coverage.
- Fix: Removed the blanket same-origin rejection from `official_page` and replaced it with exact filtering for observed footer/service/filing link titles, keeping external article links eligible for relevance and de-duplication.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live recheck showing `orienspace-news` preserved 16 external article candidates and `cnsa-news` had zero footer/filing candidates, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This corrects an overbroad local fix before deployment; CNSA footer noise should remain filtered by exact title, not by banning all external article URLs.

### 2026-05-30 - SI-ISSUE-222 - Official-page collectors can include external footer links

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: live `cnsa-news` source recheck after `SI-ISSUE-221`
- Evidence: After section and script-link filtering, the CNSA page still emitted external footer/service links such as `中华人民共和国中央人民政府`, `中华人民共和国工业和信息化部`, `中国探月与深空探测网`, and `中国航天科工集团有限公司`. Since `cnsa-news` is treated as a broad official source, these external links could be persisted as article candidates even though they are not CNSA article records.
- Fix: Shared short-title filtering now drops the observed external footer/service titles and filing-number links, so CNSA footer noise is removed without banning real external article URLs from other official/company sources.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live CNSA recheck showing `footerCount: 0`, `beianCount: 0`, and only three article candidates, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: The first implementation of this fix used same-origin filtering and was corrected by `SI-ISSUE-223`; feed and aggregator collectors keep their own external-link behavior.

### 2026-05-30 - SI-ISSUE-221 - Links inside scripts can be extracted as real article URLs

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live `cnsa-news` source recheck while verifying `SI-ISSUE-220`
- Evidence: The CNSA listing page includes pagination JavaScript containing fake anchor fragments such as `href="+ url+"` and text like `"+(maxPageNum-ccc+1)+"`. Current shared extraction scans the raw HTML with anchor regexes before removing scripts, so those script fragments can become candidates such as `https://www.cnsa.gov.cn/n6758823/n6758838/+%20url+`.
- Fix: Shared HTML extraction now removes `script` and `style` blocks before list/anchor scanning while keeping normal visible list extraction unchanged.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live CNSA recheck showing `badScriptCount: 0`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This is source-agnostic parser hardening; it prevents fake JavaScript template links from entering official-page and procurement-page candidates.

### 2026-05-30 - SI-ISSUE-220 - Card anchors can turn summaries into article titles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live `cnsa-news` source recheck while verifying `SI-ISSUE-219`
- Evidence: `cnsa-news` article cards use anchors like `<a ... title="神舟二十二号载人飞船顺利撤离空间站组合体">` that wrap title, date, desktop summary, and mobile summary markup. Current extraction uses the anchor inner text as `title`, so sampled candidates became very long strings containing the title, `2026-05-29`, and duplicated summary text instead of the concise article title.
- Fix: Shared HTML extraction now prefers a non-empty anchor `title` attribute for candidate titles while keeping the full list/card text as context for date and relevance extraction.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live CNSA recheck showing `longCount: 0` and concise article titles, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This keeps source coverage unchanged; it only separates public title text from surrounding card context.

### 2026-05-30 - SI-ISSUE-219 - CNSA section links can be extracted as article candidates

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live `cnsa-news` source audit after `SI-ISSUE-218`
- Evidence: Direct sampling of `https://www.cnsa.gov.cn/n6758823/n6758838/index.html` with the current collector headers returned HTTP 200, but shared HTML extraction emitted section and service links such as `信息发布`, `国际合作`, `图解航天`, `精彩图集`, `探月工程数据发布与信息服务系统`, and breadcrumb-style titles such as `> 政策公告`. Since `cnsa-news` is intentionally treated as a broad official source, these short navigation entries can bypass relevance filtering and become article candidates.
- Fix: Shared short-title filtering now normalizes leading breadcrumb markers before comparison and filters the observed CNSA section/service labels while keeping longer real article titles eligible.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 63 tests, live CNSA recheck showing `badSectionCount: 0` and only three same-origin article candidates after all filters, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 329 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: This is a content-quality fix for a broad official source; it does not disable CNSA coverage.

### 2026-05-30 - SI-ISSUE-218 - Date extraction stops after the first invalid date-shaped token

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | data-quality | tests
- Found In: follow-up parser review after `SI-ISSUE-217`
- Evidence: Shared `extractDate` currently calls `value.match(...)` for year-first dates and returns the first candidate's normalized value. If the first date-shaped token is invalid, such as `2026-13-40`, the function returns `null` immediately and never checks a later valid source date in the same official-page or procurement-page context.
- Fix: Shared `extractDate` now scans date candidates in order and returns the first calendar-valid value, skipping malformed year-first candidates before falling back to slash-date parsing or `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 59 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 325 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This is a low-risk parser hardening item; it only affects contexts that already contain malformed date-like text before a valid date.

### 2026-05-30 - SI-ISSUE-217 - Standalone article anchors can lose adjacent source dates

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | data-quality | tests
- Found In: follow-up source-date context audit after `SI-ISSUE-216`
- Evidence: Enabled-source sampling found article-card structures where the publication date is outside the standalone `<a>` text. Examples include `cas-space-news` article cards with nearby dates such as `2026/03/30` and `2026/05/28`, and `casic-news` article cards such as `关于航天科工许可字库的使用说明` with nearby `2024.06.18`. Current standalone-anchor extraction uses only the anchor text as `contextText`, so the official-page collector can miss the source date and fall back to the collection timestamp.
- Fix: Shared HTML extraction now processes list/table blocks first, then scans standalone anchors with URL/title de-duplication. Standalone-anchor candidates are enriched with the nearest adjacent date found in a narrow raw-HTML window before or after the anchor, while list/table candidates keep their existing full-row context.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 58 tests, live-source sampling confirming `casic-news` and `cas-space-news` article candidates include adjacent dates in `contextText`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 324 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This follows `SI-ISSUE-211` through `SI-ISSUE-216`; the risk is data freshness/order quality, not a page-breaking runtime failure.

### 2026-05-30 - SI-ISSUE-216 - Slash dates with month-first-only values fall back to collection time

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | data-quality | tests
- Found In: follow-up source-date audit after `SI-ISSUE-213`
- Evidence: `orienspace-news` currently includes `12/31/2025 箭指苍穹，创见未来！东方空间2025精彩瞬间`. This slash date cannot be parsed as `DD/MM/YYYY`, so the shared extractor would return `null` and the official-page collector would fall back to the collection timestamp even though the source provides a clear December 31, 2025 date.
- Fix: The shared HTML date extractor now keeps day-first slash parsing as the first choice, but when that calendar validation fails, it retries the same slash date as month-first. Ambiguous dates where both interpretations are valid continue to use the existing day-first behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 56 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 322 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This is intentionally limited to slash dates; year-first parsing remains unchanged.

### 2026-05-30 - SI-ISSUE-215 - Date-only and detail anchors can replace real article titles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: live official/procurement source prefix audit after `SI-ISSUE-214`
- Evidence: Current enabled-source sampling found date-only and detail-style anchors pointing at article URLs, including `casic-news` titles like `[2026-05-28]`, `cas-space-news` titles like `2026/03/30`, `spacechina-news` entries `[查看全部]`, and `guangdong-gov-policy` entries `【详情】`. Because extraction now scans multiple anchors and de-duplicates later by URL, these short anchors can be seen before the real article title and cause records with date/detail text as the public title.
- Fix: Shared HTML extraction now filters date-only anchor titles, including bracketed dates and slash dates, and normalizes bracketed short labels such as `[查看全部]` / `【详情】` before generic-navigation filtering.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 56 tests, live-source recheck finding zero candidates matching the observed date-only/detail short-link set, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 322 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: Longer titles that merely start with a date continue to be extracted and are cleaned later by official-page public-title normalization.

### 2026-05-30 - SI-ISSUE-214 - Source date prefixes can leak into public official-page titles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | frontend-data | tests
- Found In: follow-up review after day-first date parsing support
- Evidence: `orienspace-news` article-card text includes the source date as a title prefix, for example `11/10/2025 引力一号实现第二次海上发射...`. After `SI-ISSUE-213`, the date can be parsed correctly, but the public article title would still include the date prefix and read like scraped page chrome rather than a clean news title.
- Fix: Official-page collection now strips leading source date prefixes from the public `title` and generated summary while preserving the raw text in `originalTitle` for traceability. Date extraction still uses the original signal text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 55 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 321 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched ingestion files returning no matches.
- Notes: The cleanup is limited to leading date prefixes and falls back to the original title if stripping would produce an empty string.

### 2026-05-30 - SI-ISSUE-213 - Day-first source dates fall back to collection time

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | data-quality | tests
- Found In: follow-up audit of standalone article-card extraction
- Evidence: `orienspace-news` article-card titles include dates such as `11/10/2025 引力一号实现第二次海上发射...` and `13/09/2025 东方空间亮相山东商业航天记者会...`. Shared `extractDate` only recognized year-first formats such as `2025-10-11`, so these records would fall back to the collection timestamp instead of the source-published date.
- Fix: Added validated day-first slash date parsing for `DD/MM/YYYY` in the shared HTML date extractor, reusing the existing real-calendar validation so impossible dates still return `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 54 tests, focused day-first date test passing, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 320 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This keeps year-first parsing unchanged and only adds support for a currently observed company news-card format.

### 2026-05-30 - SI-ISSUE-212 - Standalone anchor recall can include section and product entry links

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up noise audit after `SI-ISSUE-211`
- Evidence: After standalone anchor recall was added, enabled-source sampling showed 14 relevant-looking but non-article candidates would become extractable because their titles contain aerospace terms. Examples included `spacechina-news` section entries `航天文化` / `航天科普`, launch reservation pages `预定发射` / `发射预定`, and `cas-space-news` product pages such as `力箭一号运载火箭`.
- Fix: Added exact-title filtering for the observed section, reservation, procurement category, and product-entry labels in the shared HTML extraction layer. The filter remains exact-title based so longer real article titles containing those words are still eligible.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 53 tests, live-source noise recheck finding zero candidates matching the observed non-article title set, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 319 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This is the noise-control counterpart to `SI-ISSUE-211`; both changes stay in the shared parser before collector-specific relevance checks.

### 2026-05-30 - SI-ISSUE-211 - HTML extraction skips standalone article card links when list blocks exist

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: enabled official-source structure audit after multi-link list extraction fixes
- Evidence: Current enabled-source sampling found pages with both navigation/list markup and standalone article-card anchors. `extractHtmlListLinks` selected only `<li>` / `<tr>` blocks whenever any existed, so standalone article links outside those blocks could be ignored. Sample missed links included `casic-news` articles such as `航天科工召开2026年数字航天工作会` and `orienspace-news` WeChat article-card links such as `引力一号实现第二次海上发射，率先满足规模化低轨星座组网发射需求`.
- Fix: Extended shared HTML extraction to scan standalone anchor blocks in addition to list/table blocks, while deduplicating accepted candidates by URL and title. Existing HTTP/HTTPS filtering, short navigation-title filtering, collector-specific relevance checks, and per-collector URL de-duplication remain in place.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 52 tests, live-source recheck confirming the previously missed `casic-news` and `orienspace-news` article-card links are now extracted, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 318 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This improves recall for official/company pages that mix navigation lists with card-style article links without adding a new collector path.

### 2026-05-30 - SI-ISSUE-210 - Multi-link list extraction can promote category links

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review after extracting multiple links per list block
- Evidence: After extracting every anchor from a `<li>` or `<tr>`, a row with a category link such as `通知公告` followed by the real article link would emit both candidates. Because both candidates share the same row context, the short category link could inherit article relevance signals and be persisted as a false article in official/procurement collectors.
- Fix: Added shared exact-title filtering for common short navigation/category labels in `extractHtmlListLinks`, including `通知公告`, `政策文件`, `采购公告`, and similar section titles. The same-row article link remains extractable.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 51 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 317 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This keeps the multi-link recall improvement while reducing category-link noise before collector-specific filtering.

### 2026-05-30 - SI-ISSUE-209 - HTML list extraction skips later links in the same row

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: HTML list extraction review after enabled-source structure audit
- Evidence: `extractHtmlListLinks` used `block.match(...)`, so each `<li>` or `<tr>` contributed only the first anchor. Government and procurement list rows often include a category or breadcrumb link before the actual article link; in that structure the collector could process the category title and miss the real article URL.
- Fix: Iterate over every anchor in each list block and emit each usable HTTP/HTTPS link with the same block context. Existing navigation-title and relevance filters still remove category links later in the collector pipeline.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 51 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 317 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This improves recall for official/procurement pages without changing URL safety filtering.

### 2026-05-30 - SI-ISSUE-208 - Common typography HTML entities can leak into extracted text

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: enabled source markup audit after named-entity hardening
- Evidence: Current enabled source sampling found unsupported named entities in live source markup: `ccgp-central-procurement` uses `&raquo;`, while `spacepioneer-news` and `cas-space-news` use `&ldquo;` / `&rdquo;`. If those entities appear in extracted link text or context, article titles or summaries can display raw HTML entity names.
- Fix: Added shared `decodeHtml` support for common typography entities including curly quotes, guillemets, dashes, middle dot, and copyright symbols. Added list-extraction regression coverage for `&ldquo;`, `&rdquo;`, `&mdash;`, `&middot;`, and `&raquo;`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 50 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 316 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This keeps decoding centralized for official pages, procurement pages, RSS summaries, and Google News text normalization.

### 2026-05-30 - SI-ISSUE-207 - Official/procurement date extraction accepts impossible dates

- Priority: P2
- Status: VERIFIED
- Area: ingestion | parsing | data-quality | tests
- Found In: follow-up review of HTML list date parsing
- Evidence: Shared `extractDate` matched date-shaped strings and returned them without validating the calendar date. Official-page and procurement collectors could therefore persist values such as `2026-13-40T00:00:00Z` or `2026-02-30T00:00:00Z` instead of falling back to the collection time.
- Fix: Validate the extracted UTC year, month, and day after parsing. If the parsed date is invalid or rolls over to a different calendar day, return `null` so collectors use their existing collection-time fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 49 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 315 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML date parser files returning no matches.
- Notes: This extends the earlier timestamp hardening to official-page and procurement-page HTML date extraction.

### 2026-05-30 - SI-ISSUE-206 - HTML named entity decoding is case-sensitive and misses apostrophes

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review of shared HTML entity decoding
- Evidence: Shared `decodeHtml` handled lowercase named entities such as `&amp;` and `&nbsp;`, but left uppercase variants like `&AMP;` / `&NBSP;` and `&apos;` unchanged. Those entities can leak into official-page, RSS, and Google News titles or summaries because all three paths now reuse this decoder.
- Fix: Made supported named entity replacements case-insensitive and added `&apos;` handling. Added a list-extraction regression test covering uppercase named entities and apostrophes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 47 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 313 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: The supported named-entity set remains intentionally small; decimal and hexadecimal numeric entities are handled separately.

### 2026-05-30 - SI-ISSUE-205 - Numeric entity decoding can introduce hidden control characters

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review of shared HTML entity decoding
- Evidence: The numeric entity decoder accepted all valid Unicode code points, including C0/C1 control characters such as `&#0;` and `&#x7f;`. Decoding those entities would introduce invisible characters into extracted titles, summaries, or context text, making display and dedupe behavior harder to inspect.
- Fix: Treat C0/C1 control characters as invalid numeric entities, except standard whitespace controls that are normalized later. Invalid control entities are preserved as visible entity text instead of becoming hidden characters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 46 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 312 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This does not change normal punctuation, CJK, or emoji entity decoding.

### 2026-05-30 - SI-ISSUE-204 - Google News title parsing fails when publisher contains a hyphen

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review of Google News RSS title normalization
- Evidence: `parseGoogleNewsTitle` used a regex that only matched publishers without `-`. A feed title like `民营火箭&#183;发动机试车 - 示例&amp;媒体-中文站` would fail to split, leaving the publisher segment inside the public article title instead of `publisherName`.
- Fix: Changed Google News title parsing to split on the last ` - ` separator, then decode both the article title and publisher text. This handles publishers containing hyphens while preserving ordinary hyphens inside the article title.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 45 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 311 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched Google News collector files returning no matches.
- Notes: The fallback remains unchanged for titles without a ` - ` separator.

### 2026-05-30 - SI-ISSUE-203 - Feed title fields can preserve HTML entities

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review after RSS summary entity decoding
- Evidence: RSS feed titles, RSS item titles, and Google News RSS title/publisher parsing used trimmed raw strings. When feeds carry CDATA text such as `Space &amp; Defense News` or `民营火箭&#183;发动机试车 - 示例&amp;媒体`, normalized records could persist entity text in `sourceName`, `publisherName`, `title`, or `originalTitle`.
- Fix: Reused shared `decodeHtml` for collector display text, RSS item title normalization, and Google News title/publisher/original-title parsing before normalized records are emitted.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 45 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 311 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched RSS and Google News collector files returning no matches.
- Notes: This preserves the original title's textual content while decoding transport-level HTML entities for public display.

### 2026-05-30 - SI-ISSUE-202 - RSS summary cleanup leaves HTML entities visible

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: follow-up review after HTML list entity decoding
- Evidence: RSS and Google News RSS summary cleanup used `collectors/metadata.stripHtml`, which removed tags but did not decode HTML entities. Feed summaries containing `&amp;`, `&#183;`, or `&#x2014;` could therefore be persisted and displayed with raw entity text.
- Fix: Reused shared `decodeHtml` in collector metadata cleanup so RSS-style summaries decode named, decimal, and hexadecimal entities after tag removal. Added standard RSS and Google News RSS collector assertions for decoded summaries.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 45 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 311 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched RSS metadata files returning no matches.
- Notes: This keeps feed-specific title and URL handling unchanged; it only normalizes summary text before persistence.

### 2026-05-30 - SI-ISSUE-201 - HTML list parser leaves numeric entities in extracted text

- Priority: P3
- Status: VERIFIED
- Area: ingestion | parsing | content-quality | tests
- Found In: HTML list parser review and enabled official-source markup sample
- Evidence: Enabled official pages include numeric HTML entities such as `&#xa0;`. `decodeHtml` handled named entities and `&#39;`, but left other decimal or hexadecimal numeric entities intact, so future article titles or list context could persist visible `&#...;` sequences instead of readable punctuation or Chinese text.
- Fix: Added safe decimal and hexadecimal numeric entity decoding to shared `decodeHtml`, preserving the original entity text for invalid code points. Added a list-extraction regression test covering `&#183;`, `&#x2014;`, and Chinese date entities in both title and context text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 45 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 311 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched HTML parser files returning no matches.
- Notes: This is intentionally limited to parser text normalization; source URL filtering remains handled by `absoluteUrl` / `normalizeHttpUrl`.

### 2026-05-30 - SI-ISSUE-200 - Official-page default relevance terms include generic local-government phrases

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: follow-up review after narrowing `wuxi-hightech-news`
- Evidence: The official-page collector's default relevance terms still included standalone `产业园` and `领导调研`. Sources without source-specific `include_terms` could therefore treat ordinary local-government industrial-park inspection headlines as aerospace-relevant.
- Fix: Removed the generic default terms and replaced the park signal with industry-qualified terms: `空天产业园`, `航天产业园`, `商业航天产业园`, and `卫星产业园`. Added a collector regression test that drops `区领导调研无锡美丽健康产业园` while keeping a satellite/aerospace park headline.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 42 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 310 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched official-page collector files returning no matches.
- Notes: Source-specific include terms can still intentionally carry broader terms, but repository config now rejects standalone `产业园` as part of `SI-ISSUE-199`.

### 2026-05-30 - SI-ISSUE-199 - Wuxi High-tech source uses over-broad industrial-park keyword

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config | content-quality | tests
- Found In: enabled official source output audit
- Evidence: `wuxi-hightech-news` used the standalone include term `产业园`. The current Wuxi High-tech Zone page then matched unrelated titles such as `区领导调研无锡美丽健康产业园`, which can pollute aerospace policy/news feeds with non-space industrial-park content.
- Fix: Replaced the generic `产业园` include term with industry-qualified terms `空天产业园` and `商业航天产业园`, and added a repository config test that rejects standalone `产业园` as a source include term.
- Regression Check: Verified with `node scripts\generate-config.mjs`, targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 41 tests, a current source audit confirming `wuxi-hightech-news` has zero current matches after the keyword tightening, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 309 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched config/test files returning no matches.
- Notes: The source stays enabled; this only narrows relevance matching to avoid obvious non-aerospace park news.

### 2026-05-30 - SI-ISSUE-198 - Official-page collector can ingest section landing links as articles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: enabled official source output audit after source-health cleanup
- Evidence: Current enabled-source audit showed `miit-news` could emit `时政要闻`, and `cmse-news` could emit `空间科学` / `专题报道` as relevant candidates. These are official-site section landing pages, not article records, and persisting them would pollute policy/news listings with navigation entries.
- Fix: Extended the official-page collector's exact navigation-title filter to drop `时政要闻`, `工作动态`, `空间科学`, and `专题报道` before source relevance checks. The filter remains exact-title based so longer real article titles containing similar words are not dropped.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 41 tests, a current enabled-source audit confirming `miit-news` / `cmse-news` no longer emit those section labels, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 309 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched official-page collector files returning no matches.
- Notes: This is a follow-up to `SI-ISSUE-193`; both issues address official-site navigation labels leaking into article records.

### 2026-05-30 - SI-ISSUE-197 - Hainan Wenchang special-topic page is not a reusable article source

- Priority: P3
- Status: VERIFIED
- Area: ingestion | config | content-quality
- Found In: enabled official and procurement source zero-output audit
- Evidence: `hainan-wenchang-space-special` returns HTTP 200, but the configured page is a dated single-event Hainan government topic page and exposes no reusable article-list links for the current official-page collector. Keeping it enabled would make scheduled ingestion spend work on a source that cannot produce durable records while implying active Hainan coverage still exists.
- Fix: Kept the source definition for traceability but set it disabled, added direct access metadata, and marked it with the public badge `旧专题停采` until a current stable Hainan listing source is confirmed.
- Regression Check: Verified with `node scripts\generate-config.mjs`, `node scripts\generate-config.mjs --check`, targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 41 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 309 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched config/test files returning no matches.
- Notes: This complements `SI-ISSUE-194`: cloud-blocked broad Hainan/Sichuan sources are disabled for access reasons, while this source is disabled because it is stale and structurally unsuitable for ongoing collection.

### 2026-05-30 - SI-ISSUE-196 - Official-page script redirect fallback can misfire on normal pages

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: enabled official source reachability audit after adding script-redirect support
- Evidence: Several enabled official pages return normal HTML with extractable links but also contain incidental `window.location` script snippets. Following the first script redirect unconditionally would make those sources jump away from their actual listing page, causing missed or wrong article collection.
- Fix: Script redirect handling is now a fallback only when the current page yields no extractable list links. Normal pages with links are parsed in place, while script-only category redirects such as `ndrc-policy` still work.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 309 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched official-page collector files returning no matches.
- Notes: This keeps the redirect compatibility narrow and prevents source-specific incidental scripts from changing collection behavior.

### 2026-05-30 - SI-ISSUE-195 - Official-page script redirects can silently produce empty collection

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: enabled official source reachability audit
- Evidence: The enabled `ndrc-policy` URL returned HTTP 200 with only `<script>window.location.href='./fzggwl/';</script>`. The official-page collector treated that as a successful page and attempted to extract links from the script body, producing no records without surfacing a source failure or useful content.
- Fix: Added support for a single same-origin `window.location` script redirect in the official-page collector, then parse links against the redirected effective URL so relative article links resolve correctly.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 40 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 308 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched official-page collector files returning no matches.
- Notes: Cross-origin script redirects are ignored; this keeps the behavior scoped to official sites that use same-origin JavaScript category redirects.

### 2026-05-30 - SI-ISSUE-194 - Cloud-blocked official sources keep producing scheduled ingestion failures

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config | operations | tests
- Found In: production health follow-up and direct source reachability check
- Evidence: Production `/api/health` recently reported failures for `hainan-gov-news`, `sichuan-gov-policy`, and `sichuan-gov-news`. Direct requests to their configured URLs returned HTTP 403 from the current cloud execution path. Keeping these broad 403 sources enabled makes scheduled ingestion repeatedly create avoidable failed logs without adding usable content.
- Fix: Kept the three source definitions for future review but set them disabled, marked `access_global: blocked`, and added public access notes/badges explaining cloud collection is currently restricted.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 39 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 307 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan over touched source config files returning no matches.
- Notes: Re-enable only after confirming a stable accessible listing URL or a compliant alternate source. This is a source-health change, not a ban on domestic or foreign sources. The separate Hainan Wenchang special-topic source is tracked in `SI-ISSUE-197`.

### 2026-05-30 - SI-ISSUE-193 - Official-page collector can ingest generic navigation links

- Priority: P2
- Status: VERIFIED
- Area: ingestion | content-quality | tests
- Found In: production policy API follow-up
- Evidence: Production `/api/articles?tag=policy-and-regulation&limit=5` returned policy-tagged records titled `咨询建议`, `意见征集`, and `互动交流` from `cnsa-news`. The official-page collector treats `cnsa-news` as broadly relevant, so generic official-site navigation links could be persisted as policy articles and degrade visible policy-page quality.
- Fix: Added a generic navigation-title filter to the official-page collector before source relevance checks. Broad official sources remain enabled, but exact navigation labels such as `意见征集`, `咨询建议`, and `互动交流` are skipped before normalized article records are created.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 39 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 307 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code sensitive-pattern scan over touched official-page collector files returning no matches.
- Notes: The filter uses exact normalized navigation labels so longer real titles such as notices seeking comments are not dropped solely because they contain `意见`.

### 2026-05-30 - SI-ISSUE-192 - Stale ingestion logs only close during daily maintenance

- Priority: P2
- Status: VERIFIED
- Area: ingestion | operations | tests
- Found In: production health follow-up after `openIngestionLogCount` remained elevated
- Evidence: `closeStaleIngestionLogs` only ran inside daily scheduled maintenance. If an hourly source run left an `ingestion_logs` row open because of an older deployment, Worker interruption, or unexpected runtime termination, `/api/health` could keep reporting stale open logs until the next daily maintenance pass, making production ingestion health look worse and delaying operational feedback.
- Fix: Run stale ingestion-log closure during every scheduled run. Hourly runs close logs older than two hours without running retention deletion; daily runs keep closing stale logs and also run retention cleanup.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\scheduled.test.ts` passing 1 file / 11 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 306 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code sensitive-pattern scan over touched scheduled-ingestion files returning no matches.
- Notes: This does not mask current source failures; failed recent logs remain visible. It only prevents old unfinished logs from staying open indefinitely between daily maintenance windows.

### 2026-05-30 - SI-ISSUE-191 - RSS feed titles can persist unstable source labels

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data | tests
- Found In: follow-up RSS/RSSHub collector output quality review
- Evidence: RSS/RSSHub collection used the raw parsed feed channel title as `sourceName` and `publisherName` when present. A padded title such as ` SpaceNews ` or a blank channel title could therefore write unstable source labels into normalized article records, leaving public serializers and UI helpers to clean up collector-written data.
- Fix: Added a shared collector display text helper and used it in the RSS metadata pipeline so feed titles are trimmed, blank feed titles fall back to the configured source name, and `sourceName/publisherName` stay aligned for standard RSS and RSSHub records.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 38 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 305 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code sensitive-pattern scan over touched RSS collector/test files returning no matches.
- Notes: Public source-name cleanup remains in place for historical rows and API boundary resilience; this fix prevents new RSS/RSSHub collector output from introducing padded or blank source labels.

### 2026-05-30 - SI-ISSUE-190 - News collectors can persist unparseable article timestamps

- Priority: P2
- Status: VERIFIED
- Area: ingestion | data | tests
- Found In: follow-up collector output quality review
- Evidence: SNAPI, RSS/RSSHub, and Google News RSS collectors passed upstream timestamp strings through to normalized article records. Blank or unparseable values such as `not-a-date` could therefore be persisted and later require public UI helpers to display `时间待定`, even though new collector-written records should carry a usable timestamp.
- Fix: Added a shared collector metadata helper that trims and validates published timestamps, preserving parseable upstream values and falling back to the collection time for blank or unparseable values. SNAPI, RSS/RSSHub, and Google News RSS collectors now use this helper.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\db\db.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx` passing 4 files / 75 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 304 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched collector metadata files returning no matches.
- Notes: The public `displayTime` fallback remains as protection for historical or manually inserted bad data.

### 2026-05-30 - SI-ISSUE-189 - News collectors can persist blank article titles

- Priority: P2
- Status: VERIFIED
- Area: ingestion | data | tests
- Found In: follow-up collector output quality review
- Evidence: RSS and Google News RSS collectors only checked that the title field existed before writing normalized items, and SNAPI accepted any string title from the API. Whitespace-only RSS titles, Google News titles that become blank after removing the publisher suffix, or blank SNAPI titles could therefore enter the article table and force public API/UI fallbacks such as `标题待确认` for records that should have been rejected at collection time.
- Fix: Trimmed accepted article titles in SNAPI, RSS/RSSHub, and Google News RSS collectors, dropped records with no usable title after trimming or Google News suffix parsing, and kept summaries/source names normalized for SNAPI records.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\db\db.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 4 files / 53 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 304 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched collector files returning no matches.
- Notes: Public API title fallback remains as protection for historical or manually inserted bad data; this fix prevents new collector-written blank titles.

### 2026-05-30 - SI-ISSUE-188 - Launch cache writes can duplicate records after external-id normalization

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data | tests
- Found In: follow-up launch persistence review after external-id normalization
- Evidence: After launch external IDs are trimmed and lowercased, a single upstream response containing both `LAUNCH-1` and `launch-1` would still generate two D1 upsert statements for the same normalized launch id. That can inflate successful write counts and make final cached metadata depend on duplicate ordering.
- Fix: `persistLaunchRecords` now builds the launch upsert batch from unique normalized external IDs, drops blank external IDs, and keeps the first record for a duplicated normalized id in the current batch.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\launchIngestion.test.ts src\db\db.test.ts src\db\articleQueries.test.ts` passing 3 files / 19 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 304 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch persistence files returning no matches.
- Notes: This keeps the collected count as upstream input size while making the upsert count reflect unique cache rows written.

### 2026-05-30 - SI-ISSUE-187 - Article launch relations can miss launch cache records by external-id casing

- Priority: P2
- Status: VERIFIED
- Area: ingestion | api | data | tests
- Found In: follow-up article-launch relation review after launch detail external-id normalization
- Evidence: Launch detail lookup had already become case-insensitive, but article launch relation persistence and article detail joins still used raw `launch_external_id` / `external_id` equality. If an article source emitted `relatedLaunchIds` as uppercase or padded text while Launch Library cache stored lowercase IDs, the relation row could be written but the article detail query would not join to the cached launch.
- Fix: Normalized launch cache external IDs and article related launch IDs by trimming and lowercasing before persistence, dropped blank launch external IDs from cache writes, and made the article-detail launch join compare `LOWER(l.external_id)` with `LOWER(al.launch_external_id)` for historical rows.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\db.test.ts src\ingestion\launchIngestion.test.ts src\db\articleQueries.test.ts src\db\launchQueries.test.ts src\pages\ArticleDetailPage.test.tsx` passing 5 files / 39 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 304 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article/launch relation files returning no matches.
- Notes: This aligns article-detail related launch behavior with the case-insensitive launch detail route fixed in `SI-ISSUE-185`.

### 2026-05-30 - SI-ISSUE-186 - Source default entity references can silently miss catalog records

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config | data | tests
- Found In: follow-up source addition and catalog consistency review
- Evidence: `parseSourcesConfig` normalized `default_tags` and `default_companies`, but it did not verify that default tags existed in `config/topics.yaml` or that default companies matched a configured company slug/name/English name. A future source could therefore pass source parsing, collect articles with default metadata, and then silently lose the expected `article_tags` or `article_companies` links because relation inserts only select existing catalog rows.
- Fix: Added `assertValidSourceDefaultReferences` to validate source defaults against the parsed topic and company catalog, wired it into daily catalog sync before database writes, and expanded repository config tests to prove current source defaults resolve against the current catalog.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts src\catalog\config.test.ts` passing 3 files / 58 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 303 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched ingestion runtime/test files returning no matches.
- Notes: Company defaults intentionally accept any identifier supported by relation persistence: company slug, configured name, or configured English name.

### 2026-05-30 - SI-ISSUE-185 - Launch detail external-id lookups are case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch detail route review
- Evidence: `getLaunchByIdOrExternalId` correctly avoided coercing non-decimal values such as `1e3` into numeric ids, but the external id lookup still used `external_id = ?` after only trimming the path value. Manually typed or externally generated launch detail URLs with uppercase UUID/external-id characters could therefore miss the stored lowercase Launch Library id and return 404.
- Fix: Kept strict positive-integer routing for internal ids, and changed the external-id branch to normalize the path value to lowercase and compare through `LOWER(external_id) = ?`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\launchQueries.test.ts functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 6 files / 66 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 301 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch query files returning no matches.
- Notes: Numeric launch detail URLs keep the same strict positive-integer behavior.

### 2026-05-30 - SI-ISSUE-184 - Company and topic detail slugs are case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public detail route review
- Evidence: Company and topic detail routes use public route-safe slugs, but `getCompanyBySlug` and `getTopicBySlug` only trimmed the path value before querying `c.slug = ?` or `t.slug = ?`. Manually typed or externally generated URLs such as `/companies/Rocket-Lab` or `/topics/Reusable-Rockets` could therefore return 404 even though the corresponding lowercase public slug exists.
- Fix: Normalized company and topic detail slugs to lowercase and changed detail lookup SQL to compare `LOWER(slug)` with the normalized value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\companyQueries.test.ts src\db\topicQueries.test.ts functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\CompaniesPage.test.tsx src\pages\TopicsPage.test.tsx` passing 8 files / 42 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 300 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched company/topic query files returning no matches.
- Notes: Existing lowercase detail URLs keep the same behavior.

### 2026-05-30 - SI-ISSUE-183 - Public article category filters do not accept public category labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public article filter review
- Evidence: Article cards derive Chinese public categories such as `政策监管`, and source categories such as `官方机构` / `公告信息` also imply policy content. However `/api/articles` passed `category` through directly, while `listArticles` only applies the policy filter when `filters.category === 'policy'`. Requests such as `category=政策监管` or `category=官方机构` therefore did not filter to policy content and instead returned the unfiltered article list.
- Fix: Added public article category filter normalization so `policy`, `政策`, `政策监管`, `官方机构`, and `公告信息` all map to the internal `policy` filter before database querying.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\db\articleQueries.test.ts src\utils.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\components\ArticleCard.test.tsx` passing 6 files / 62 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 298 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article API files returning no matches.
- Notes: Existing `category=policy` URLs keep the same behavior.

### 2026-05-30 - SI-ISSUE-182 - Article entity slug filters are case-sensitive

- Priority: P3
- Status: VERIFIED
- Area: api | data | tests
- Found In: follow-up article entity filter review
- Evidence: `listArticles` accepted public `tag` and `company` filters, but the slug side of each entity condition used `t.slug = ?` and `c.slug = ?` while only display names were compared through `LOWER(...)`. Manually typed or externally generated URLs such as `tag=Reusable-Rockets` or `company=Rocket-Lab` could therefore miss rows stored with lowercase route-safe slugs.
- Fix: Changed article tag and company slug filters to compare `LOWER(slug)` against the normalized filter value, while preserving existing Chinese tag/company name matching and company English-name matching.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts functions\api\_articles.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\components\ArticleCard.test.tsx src\utils.test.ts` passing 6 files / 61 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 297 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article query files returning no matches.
- Notes: Existing lowercase slug URLs keep the same behavior.

### 2026-05-30 - SI-ISSUE-181 - Public article region filters do not accept public region labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public article filter review
- Evidence: Public article responses no longer expose raw `region` codes and instead return Chinese `regionLabel` values. However `/api/articles` still passed the `region` query parameter directly to `listArticles`, which compares it with `a.region = ?`. Requests using public labels or common aliases such as `region=国内`, `region=国际`, or uppercase `region=CN` could therefore miss records stored as `cn` or `global`.
- Fix: Added public article region filter normalization so domestic aliases map to `cn`, international aliases map to `global`, blank values are dropped, and unknown raw values remain available for compatibility.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\db\articleQueries.test.ts src\utils.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\components\ArticleCard.test.tsx` passing 6 files / 60 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 296 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article API files returning no matches.
- Notes: Existing `cn` and `global` URLs keep the same behavior; this only broadens accepted public filter inputs.

### 2026-05-30 - SI-ISSUE-180 - Enabled source public display names can become ambiguous

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config | api | tests
- Found In: follow-up source filter and display review
- Evidence: The repository config test checked that currently enabled source display names are unique, but `parseSourcesConfig` itself only rejected duplicate source keys. Future source additions could pass parsing while producing duplicate public display names after aggregator prefix cleanup, for example `RSSHub - 商业航天` and `Google News RSS - 商业航天`. That would create duplicate source options and make public source-name filtering depend on whichever key was written last to the map.
- Fix: Added parser-level validation for enabled source public display-name uniqueness after default public categories are applied. Disabled sources may still share a public display name because they are not exposed as selectable public sources.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts functions\api\_sourceFilters.test.ts functions\api\sources.test.ts src\components\SourceOptions.test.tsx` passing 4 files / 46 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 295 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched source config files returning no matches.
- Notes: This turns the existing repository-level expectation into a durable config parser rule for future source additions.

### 2026-05-30 - SI-ISSUE-179 - Public launch status display misses stored Chinese status aliases

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up launch status display review
- Evidence: `listLaunches` canonical status filters already covered stored Chinese status labels, and `publicLaunchStatusFilter` normalized Chinese filter inputs. However `displayLaunchStatus` only recognized English/raw status fragments for success, hold, confirm, and review states. Historical or manually edited launch rows stored as `发射成功`, `失败`, `等待`, `待确认`, or `任务评审` could therefore be returned by the API but displayed as `状态待定`.
- Fix: Extended public launch status display mapping to recognize Chinese aliases for success, failure/exception, waiting/hold, confirmation, and review states while preserving the existing false-positive protection for `不成功`, `Unsuccessful`, `No Go`, and arbitrary `go` substrings.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 51 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 293 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch status files returning no matches.
- Notes: This aligns public display semantics with the Chinese aliases already accepted by public filters and database filters.

### 2026-05-30 - SI-ISSUE-178 - Canonical launch status filters miss stored Chinese status labels

- Priority: P3
- Status: VERIFIED
- Area: api | data | tests
- Found In: follow-up launch status query review
- Evidence: Public launch filters normalize Chinese inputs such as `发射成功`, `等待窗口`, and `待确认` to canonical values before querying. The database query layer for those canonical values only covered English/raw aliases, so historical or manual launch rows stored with Chinese status text could be missed by the corresponding public filter.
- Fix: Extended canonical launch status SQL conditions to include Chinese aliases for success, failure, hold/waiting, and confirmation states while preserving the false-positive exclusions for `不成功` and `unsuccess`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\launchQueries.test.ts functions\api\_launches.test.ts src\utils.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 6 files / 64 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 292 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch query files returning no matches.
- Notes: Unknown raw status filters still use the compatibility keyword search path.

### 2026-05-30 - SI-ISSUE-177 - Launch status database filters can still match misleading substrings

- Priority: P2
- Status: VERIFIED
- Area: api | data | tests
- Found In: follow-up launch status query review
- Evidence: After public status aliases mapped `No Go` and `Unsuccessful` correctly, the database query layer still applied every launch status filter as `LOWER(status) LIKE '%value%'`. A request normalized to `status=go` could still match stored values like `No Go` or `ongoing`, and `status=success` could still match `Unsuccessful`.
- Fix: Added status-specific SQL filter conditions for canonical public status values. Ready-to-launch filters require standalone `go`-like tokens and exclude `no go`; success filters exclude `unsuccess`; failure filters include `fail`, `unsuccess`, and `不成功`; hold/confirm/review filters include their known raw aliases.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\launchQueries.test.ts functions\api\_launches.test.ts src\utils.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 6 files / 63 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 291 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch query files returning no matches.
- Notes: Unknown raw status filter values still fall back to the previous case-insensitive keyword search for compatibility.

### 2026-05-30 - SI-ISSUE-176 - Chinese launch status `不成功` can match success filters

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch status mapping review
- Evidence: The public launch status filter matched the Chinese success alias `成功` by substring. A Chinese upstream or user-provided value such as `不成功` could therefore match the success alias before reaching failure handling.
- Fix: Added Chinese `不成功` to failure-like status handling and changed the `成功` alias matcher so it does not match `不成功`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 50 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 289 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch status files returning no matches.
- Notes: Normal `成功` and `发射成功` inputs still map to the success status.

### 2026-05-30 - SI-ISSUE-175 - Launch status `success` matching can misclassify unsuccessful states

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch status mapping review
- Evidence: `displayLaunchStatus` checked `success` before any failure-like signal, and `publicLaunchStatusFilter` matched the `success` alias by substring. Upstream or user-provided values such as `Unsuccessful` could therefore be displayed or filtered as `发射成功`.
- Fix: Prioritized `fail` and `unsuccess` before success display mapping, and changed the public status filter so `Unsuccessful` maps to the failure status instead of the success alias.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 50 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 289 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch status files returning no matches.
- Notes: `Successful` and normal success-like upstream values still display as `发射成功`.

### 2026-05-30 - SI-ISSUE-174 - Launch status `go` matching can misclassify upstream status text

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch status mapping review
- Evidence: `displayLaunchStatus` used `normalized.includes('go')`, and `publicLaunchStatusFilter` used the same substring style through alias matching. Upstream or user-provided values such as `No Go` or `ongoing` could therefore be treated as `Go` and displayed or filtered as `准备发射`.
- Fix: Changed `Go` matching to require an independent word token, mapped `No Go`/`No-Go` to the waiting-window status, and kept arbitrary words such as `ongoing` from being normalized to the ready-to-launch state.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 49 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 288 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch status files returning no matches.
- Notes: Existing `Go` and `Launch Go` values still display as `准备发射`.

### 2026-05-30 - SI-ISSUE-173 - Public URL normalization is duplicated across API and UI layers

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | security | tests
- Found In: follow-up public URL normalization review
- Evidence: Article public serialization, launch public serialization, and frontend `safeExternalUrl` each implemented their own `http/https` URL trimming and protocol check. The ingestion/config layer already had `normalizeHttpUrl`, so keeping separate public API and UI copies increased the chance that one boundary would later accept a URL shape the others reject.
- Fix: Extended `normalizeHttpUrl` to handle blank/null inputs and trim values, then reused it from article serialization, launch serialization, and frontend `safeExternalUrl`. Added direct helper tests covering absolute URLs, blocked protocols, empty input, and base URL resolution.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\config\url.test.ts src\utils.test.ts functions\api\_articles.test.ts functions\api\_launches.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 7 files / 61 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 60 files / 287 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, duplicate-implementation search showing the protocol check centralized in `src/config/url.ts`, and focused sensitive-pattern scan over touched URL files returning no matches.
- Notes: Existing collectors and config parsers continue to use the same helper; this change aligns public API and UI boundaries with that existing source-of-truth.

### 2026-05-30 - SI-ISSUE-172 - Public launch source URLs can expose non-web protocols

- Priority: P2
- Status: VERIFIED
- Area: api | frontend | data | security | tests
- Found In: follow-up public launch URL boundary review
- Evidence: `publicLaunch` trimmed `rawUrl` into the public `sourceUrl` field without checking the URL protocol. Although launch detail links apply frontend URL safety checks, historical Launch Library cache rows or manual writes with blank, malformed, `javascript:`, or `data:` URLs could still expose non-web values in the public launch API payload.
- Fix: Added API-side public URL normalization so launch source URLs are returned only when they parse as `http` or `https`; invalid, blank, or non-web protocol values now become `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 5 files / 48 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 285 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch URL files returning no matches.
- Notes: Normal Launch Library source links with `http` or `https` remain available to the UI and public API.

### 2026-05-30 - SI-ISSUE-171 - Public article URLs can expose non-web protocols

- Priority: P2
- Status: VERIFIED
- Area: api | frontend | data | security | tests
- Found In: follow-up public article URL boundary review
- Evidence: `publicArticleSummary` trimmed the stored article `url` and returned it directly. Even though frontend links apply `safeExternalUrl`, historical rows or manual writes with blank, malformed, `javascript:`, or `data:` URLs could still expose unsafe or non-web URL values in the public article API payload.
- Fix: Added API-side public URL normalization so article URLs are returned only when they parse as `http` or `https`; invalid, blank, or non-web protocol values now become `null`, and frontend API types/mapping accept the nullable URL.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 50 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 284 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article URL files returning no matches.
- Notes: Normal article source links with `http` or `https` remain available to the UI and public API.

### 2026-05-30 - SI-ISSUE-170 - Unknown article regions are displayed as international

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public article region fallback review
- Evidence: `displayRegion` treated every value outside the domestic alias list as `国际`. Blank or malformed article `region` values from historical rows or ingestion drift could therefore be shown as international commercial space content, and article cards linked that label to the `region=global` filter.
- Fix: Added explicit international aliases and changed unknown or blank article regions to the Chinese fallback `地区待确认`; article cards now render that fallback as plain metadata instead of linking it to the global region filter, and neutral article categorization uses `商业航天`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 49 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 283 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article region files returning no matches.
- Notes: Normal `cn` and `global` records keep the existing `国内` and `国际` labels.

### 2026-05-30 - SI-ISSUE-169 - Blank launch mission names can reach public launch surfaces

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch field fallback review
- Evidence: Public launch serialization trimmed `mission` but allowed a blank string through. Launch list, launch detail, and live status surfaces render `mission` directly as the visible launch title, so malformed Launch Library cache rows or manual rows could create blank launch headings.
- Fix: Added a public display fallback so blank launch mission names become `发射任务 #id`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 5 files / 46 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 280 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch serializer files returning no matches.
- Notes: This only changes fallback copy for malformed launch rows; normal mission names remain unchanged.

### 2026-05-30 - SI-ISSUE-168 - Blank company and topic names can reach public pages

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public company/topic field fallback review
- Evidence: Public company and topic serialization trimmed `name` values but allowed blank strings through. Company and topic list/detail pages render API `name` directly as visible titles and list labels, so historical or manually edited rows with blank names could produce empty headings or empty navigation targets.
- Fix: Added public display fallbacks: blank company names become `公司名称待确认` and blank topic names become `专题名称待确认`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 6 files / 30 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 279 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched company/topic serializer files returning no matches.
- Notes: This only affects malformed or historical rows; normal configured company and topic names remain unchanged.

### 2026-05-30 - SI-ISSUE-167 - Blank article titles and summaries can reach public cards

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public article field fallback review
- Evidence: Public article serialization trimmed title and summary text but allowed blank strings through. Article cards and detail pages render those fields directly, and the card title is also used in accessible labels, so historical or malformed ingestion rows could create blank cards or meaningless navigation labels.
- Fix: Added public display fallbacks: blank article titles become `标题待确认` and blank summaries become `摘要待确认`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 46 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 277 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article serializer files returning no matches.
- Notes: This only affects public fallback copy for malformed rows; normal article title and summary text remains unchanged.

### 2026-05-30 - SI-ISSUE-166 - Article nested entity references can preserve blank links

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up article nested entity review
- Evidence: Public article serialization passed nested `tags` and `companies` through unchanged. Article cards and detail pages render those references as links, so historical relation rows with padded names, blank names, or blank slugs could produce empty chips or unstable routes.
- Fix: Added public normalization for article entity references: trim `slug` and `name`, use the slug as a public fallback name when the name is blank, and drop references with blank slugs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\ArticlesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 7 files / 53 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 276 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article serializer files returning no matches.
- Notes: This protects public article payloads from stale relation rows while leaving database relation storage unchanged.

### 2026-05-30 - SI-ISSUE-165 - Article detail launch references can preserve blank labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up article detail nested launch review
- Evidence: `publicArticleDetail` passed nested `launches` through unchanged. Article detail pages render those launch references as chips and links, so historical relation rows with padded or blank `externalId`, `missionName`, or `name` values could produce unstable labels or blank launch chips.
- Fix: Added public normalization for nested article launch references: trim launch reference fields and use `发射任务 #id` as the stable public label when both mission and name are blank.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\pages\ArticleDetailPage.test.tsx src\utils.test.ts src\components\ArticleCard.test.tsx` passing 4 files / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 275 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article serializer files returning no matches.
- Notes: This only normalizes the public article-detail payload; launch detail/list serialization remains handled by the launch serializer.

### 2026-05-30 - SI-ISSUE-164 - Blank related sources can become generic public source labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up article related-source cleanup review
- Evidence: `publicRelatedSources` reused the general source-label fallback, so blank related-source values could become the generic label `来源` and still count toward `relatedSourceCount`. Historical aggregation data with blank entries could therefore create misleading "multi-source" counts or show a related source with no actual publisher name.
- Fix: Changed related-source normalization to strip aggregator prefixes, trim values, drop blank results, then dedupe. Main article source labels still keep the `来源` fallback when the primary source name is missing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 43 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 274 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched article serializer files returning no matches.
- Notes: This keeps related source count aligned with the number of actual public related-source names.

### 2026-05-30 - SI-ISSUE-163 - Source display metadata can preserve blank note and badge values

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up source display metadata review
- Evidence: `sourceDisplayMetadata` returned `access_note` and `public_badge` directly when present. Although repository config parsing trims these fields, fallback or historical source-like objects with padded or blank strings could still put unstable whitespace, blank badges, or empty option parentheses into source API payloads and source selector labels.
- Fix: Added display-level optional text normalization so source access notes and public badges are trimmed and blank values become `null`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\sources.test.ts src\components\SourceOptions.test.tsx functions\api\_articles.test.ts` passing 4 files / 36 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 274 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched source display files returning no matches.
- Notes: This is display-layer hardening; source config parsing continues to normalize these optional fields before generated config is produced.

### 2026-05-30 - SI-ISSUE-162 - Non-aggregator public source names can preserve padding

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | data | tests
- Found In: follow-up source display fallback review
- Evidence: `sourceDisplayName` stripped aggregator prefixes for Google News and RSSHub style sources, but returned ordinary source names directly. Historical config objects or database fallback rows with padded or blank `name` values could therefore leak unstable whitespace or empty labels into source directories, article source labels, or source filter options.
- Fix: Trimmed non-aggregator source display names and added the same Chinese `来源` fallback used by aggregator display paths when the cleaned name is blank.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\_articles.test.ts functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\components\ArticleCard.test.tsx` passing 5 files / 39 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 273 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched source display files returning no matches.
- Notes: Config parsing already trims normal source names; this protects public display helpers when they receive historical or fallback source-like objects.

### 2026-05-30 - SI-ISSUE-161 - Invalid visible timestamps can leak raw strings

- Priority: P3
- Status: VERIFIED
- Area: frontend | data | tests
- Found In: follow-up visible time fallback review
- Evidence: `displayTime` and `formatLaunchWindow` returned unparseable date strings directly. Historical rows or upstream data drift could therefore put raw invalid timestamp values into article cards, article lists, launch lists, launch details, or HUD surfaces.
- Fix: Changed invalid article timestamps to display `时间待定` and invalid launch windows to display `窗口待定`, while preserving the existing formatted output for valid dates.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 7 files / 50 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 273 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched time helper files returning no matches.
- Notes: This only changes visible fallback copy for invalid timestamps; stored article and launch timestamps are unchanged.

### 2026-05-30 - SI-ISSUE-160 - Unknown launch statuses can leak upstream raw labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public launch status fallback review
- Evidence: Public launch serialization removed the raw `status` field but computed `statusLabel` through `displayLaunchStatus`, which returned unknown upstream status strings directly. Launch Library 2 values such as `TBD` or other unrecognized statuses could therefore appear as English/raw labels on launch pages.
- Fix: Extended launch status display mapping so `TBD`, `TBC`, and equivalent tentative phrases map to `待确认`, and changed all other unknown or blank status values to the Chinese fallback `状态待定`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 5 files / 42 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 271 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch status files returning no matches.
- Notes: Public status filtering still accepts Chinese status labels and common raw keywords for query compatibility; this change only affects user-visible display labels.

### 2026-05-30 - SI-ISSUE-159 - Unknown company taxonomy values can leak raw labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public company label fallback review
- Evidence: Even after company config validation was tightened, historical D1 rows or manual data could still contain company `country` or `sector` values that are not in the supported public taxonomy. The public company label helpers returned unknown values such as `Japan` or `Unknown sector` directly, allowing English/raw taxonomy values to appear in the Chinese company directory and detail pages.
- Fix: Changed the shared company taxonomy label helpers to return `地区待确认` for unknown or blank countries and `赛道待确认` for unknown or blank sector items, while preserving all known country/sector mappings.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\catalog\config.test.ts` passing 4 files / 24 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 270 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched company label files returning no matches.
- Notes: Config-level validation in `SI-ISSUE-157` prevents new repository config from introducing unsupported company taxonomy values; this fix protects public output from historical or manual data drift.

### 2026-05-30 - SI-ISSUE-158 - Unknown topic categories can leak raw values to public labels

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | data | tests
- Found In: follow-up public topic label fallback review
- Evidence: Even after topic config validation was tightened, historical D1 rows or manual data could still contain a topic `category` value that is not in the supported public taxonomy. `publicTopicCategoryLabel` returned that unknown raw value directly, so a stale internal value such as `custom` could appear on the Chinese topic pages.
- Fix: Changed the shared topic category label helper to return the Chinese fallback label `专题` for unknown or blank category values while preserving the known category mappings.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\catalog\config.test.ts` passing 4 files / 26 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 270 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched topic label files returning no matches.
- Notes: Config-level validation in `SI-ISSUE-156` prevents new repository config from introducing unsupported topic categories; this fix protects public output from historical or manual data drift.

### 2026-05-30 - SI-ISSUE-157 - Company taxonomy values can drift from public labels

- Priority: P2
- Status: VERIFIED
- Area: config | api | frontend | data | tests
- Found In: follow-up company catalog configuration review
- Evidence: `parseCompaniesConfig` accepted any non-empty `country` and comma-separated `sector`, while the public company API only mapped a finite set of countries and sector values to Chinese labels. Existing `config/companies.yaml` used `sector: Launch, satellite internet` for SpaceX, but the public label map only covered `Satellite internet`, which could surface a mixed label such as `发射服务、satellite internet`.
- Fix: Added a shared company taxonomy definition for supported countries and sectors, changed company config parsing to validate countries and each comma-separated sector item after trimming, reused the shared label mapper from the public company serializer, and added the existing lowercase `satellite internet` alias to the public Chinese label map.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\scheduled.test.ts src\catalog\config.test.ts functions\api\_companies.test.ts` passing 3 files / 25 tests, earlier company/page target tests passing 4 files / 24 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 270 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched company catalog/API files returning no matches.
- Notes: Scheduled ingestion test fixtures were updated to use real supported company country and sector values, matching the stricter production config contract.

### 2026-05-30 - SI-ISSUE-156 - Topic categories accept values not covered by public labels

- Priority: P2
- Status: VERIFIED
- Area: config | api | data | tests
- Found In: follow-up catalog configuration review
- Evidence: `parseTopicsConfig` accepted any non-empty `category`, while the public topic API only has Chinese labels for `technology`, `market`, `launch`, `company`, and `policy`. A future topic category typo could pass config generation but surface as an unmapped raw value or drift from the intended public taxonomy.
- Fix: Added a shared topic category definition, changed topic config parsing to accept only the supported category ids after trimming, and reused the shared label mapper from the public topic serializer.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts functions\api\_topics.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 4 files / 24 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 268 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched topic config/API files returning no matches.
- Notes: Current repository `config/topics.yaml` already uses only supported category ids.

### 2026-05-30 - SI-ISSUE-155 - Topic configuration allows empty keyword lists

- Priority: P2
- Status: VERIFIED
- Area: config | data | tests
- Found In: follow-up catalog configuration review
- Evidence: `parseTopicsConfig` normalized topic keywords but allowed the final keyword list to be empty. A future topic could therefore appear in catalog/navigation data while never participating in automatic entity matching or article tagging.
- Fix: Added post-normalization validation requiring every topic to retain at least one usable keyword after trimming, blank removal, and deduplication.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 8 tests, `node scripts\generate-config.mjs --check`, targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\scheduled.test.ts` passing 1 file / 9 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 267 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched catalog/scheduled test files returning no matches.
- Notes: Current repository `config/topics.yaml` already has non-empty normalized keywords for every topic.

### 2026-05-30 - SI-ISSUE-154 - Curation weights accept unbounded ranking values

- Priority: P2
- Status: VERIFIED
- Area: config | data | tests
- Found In: follow-up curation configuration review
- Evidence: `home_highlights`, `pinned_items`, and topic curations accepted any integer `weight`, while homepage and topic queries sort directly by weight. A typo such as `10000` or a negative value could distort editorial ordering until the config is corrected.
- Fix: Restricted curation weights to the documented 0-100 integer range and added regression tests for oversized and negative values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts` passing 1 file / 7 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 266 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched curation config files returning no matches.
- Notes: Current repository `config/curations.yaml` contains only commented examples using weights within this range.

### 2026-05-30 - SI-ISSUE-153 - Source configuration allows blank compliance risk notes

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config | tests
- Found In: follow-up source configuration schema review
- Evidence: Project constraints require every new source/collector to record compliance risk and failure behavior, but `risk_notes` in `parseSourcesConfig` was only trimmed with `z.string().trim()` and could be blank. A future source could therefore pass config generation without documenting source risk.
- Fix: Tightened source schema validation so `risk_notes` is required to be non-empty after trimming, and added a regression test for blank risk notes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 34 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 265 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched source config files returning no matches.
- Notes: Current repository `config/sources.yaml` already has non-empty risk notes for every configured source.

### 2026-05-30 - SI-ISSUE-152 - API collectors can forward malformed upstream limit query values

- Priority: P2
- Status: VERIFIED
- Area: ingestion | tests
- Found In: follow-up API collector request-boundary review
- Evidence: SNAPI and Launch Library 2 collectors used `source.max_items ?? url.searchParams.get('limit') ?? 25` when building upstream API requests. If a future source URL carried `limit=1e3`, `limit=0`, or an oversized decimal value and omitted `max_items`, the collector could forward malformed or excessive limits to the upstream API even though source `max_items` is already bounded by config.
- Fix: Added a shared API collector request-limit helper that normalizes source `max_items` or URL `limit` through the strict bounded positive integer helper, defaulting to 25 and capping at 100, then reused it from SNAPI and Launch Library 2 collectors.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 33 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 264 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched collector files returning no matches.
- Notes: Existing configured `max_items` values still override URL query values; this only hardens fallback behavior for future source URL edits.

### 2026-05-30 - SI-ISSUE-151 - Launch detail numeric id detection accepts non-decimal numeric forms

- Priority: P2
- Status: VERIFIED
- Area: api | data | tests
- Found In: follow-up route/detail id parsing review
- Evidence: `getLaunchByIdOrExternalId` supports both internal numeric launch ids and Launch Library external ids, but detected numeric ids with `Number(normalizedId)` plus `Number.isInteger`. Values such as `1e3` could therefore query internal id `1000` instead of being treated as the literal external id or naturally returning not found.
- Fix: Reused the strict positive integer normalizer for launch numeric id detection so only trim-normalized decimal digit strings within the safe integer range are treated as internal ids; non-decimal and unsafe values stay on the external-id query path.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\launchQueries.test.ts` passing 1 file / 11 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 262 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched launch query files returning no matches.
- Notes: This preserves external id support while aligning launch detail behavior with the article/API integer parsing hardening in `SI-ISSUE-149` and `SI-ISSUE-150`.

### 2026-05-30 - SI-ISSUE-150 - Frontend pagination normalization accepts non-decimal and unsafe numeric forms

- Priority: P2
- Status: VERIFIED
- Area: frontend | tests
- Found In: follow-up URL helper review after API integer parsing hardening
- Evidence: `normalizePositiveInteger` used `Number(value)` plus `Number.isInteger`, so frontend pagination helpers could treat URL values such as `?page=1e3` or unsafe integers as valid while the public API parser now rejects those forms. That creates inconsistent page state, pagination links, and API requests for malformed URLs.
- Fix: Tightened frontend positive integer normalization to accept only trim-normalized decimal digit strings or safe integer number values, preserving leading-zero decimal compatibility while rejecting scientific notation, signs, decimal points, blank values, zero, negatives, and unsafe integers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\number.test.ts src\utils.test.ts` passing 2 files / 22 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 260 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched code files returning no matches.
- Notes: This aligns frontend URL normalization with the API request parser introduced in `SI-ISSUE-149`.

### 2026-05-30 - SI-ISSUE-149 - Positive integer parsing accepts non-decimal and unsafe numeric forms

- Priority: P2
- Status: VERIFIED
- Area: api | tests
- Found In: follow-up public API request parsing review
- Evidence: `parseOptionalPositiveInteger` used `Number(value)` plus `Number.isInteger`, so public query parameters such as `page=1e3` and padded unsafe integers could be accepted even though the API contract is a plain positive integer. The article detail route also parsed `params.id` with `Number(rawId)`, which could map `/api/articles/1e3` to id `1000` instead of rejecting the malformed route parameter.
- Fix: Tightened shared positive integer parsing to accept only trim-normalized decimal digit strings within `Number.isSafeInteger`, and changed the article detail route to reuse the shared parser and return the public 404 response for invalid ids before querying D1.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_request.test.ts functions\api\articles_id_route.test.ts` passing 2 files / 5 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 59 files / 260 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused sensitive-pattern scan over touched code files returning no matches.
- Notes: Leading zero decimal strings such as `001` continue to parse as `1` for compatibility with existing query parameters; scientific notation, signs, decimal points, blank values, zero, negatives, and unsafe integers are rejected.

### 2026-05-30 - SI-ISSUE-148 - Article public payloads can preserve blank fields and inconsistent source counts

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public article field normalization review
- Evidence: `publicArticleSummary` returned DB title, summary, original title/summary, URL, published time, and related source count directly. Historical or manually edited rows with padded strings could preserve unstable whitespace, blank original fields could trigger empty detail blocks, and related source labels cleaned from aggregator names could collapse duplicates while `relatedSourceCount` still reported the old raw count.
- Fix: Trim public article text fields, normalize blank optional original/publisher fields to `null`, and when related source labels are present, compute `relatedSourceCount` from the cleaned unique public labels.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 40 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 258 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This normalizes public API output only; article ingestion, clustering, and database storage remain unchanged.

### 2026-05-30 - SI-ISSUE-147 - Launch public payloads can preserve blank text fields

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public launch field normalization review
- Evidence: `publicLaunch` returned DB launch strings directly except for renaming `rawUrl` to `sourceUrl`. If cached Launch Library rows contained blank strings for provider, rocket, site, window, or source URL, launch list/detail pages would treat those blanks as real values and skip the intended Chinese fallbacks such as "发射商待定" or "场站待定".
- Fix: Trim required public launch text fields, normalize blank optional launch fields to `null`, and compute the public Chinese status label from the trimmed raw status.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 5 files / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 257 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This normalizes public API output only; launch ingestion and database cache storage remain unchanged.

### 2026-05-30 - SI-ISSUE-146 - Topic public payloads can preserve blank text fields

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public topic field normalization review
- Evidence: `publicTopic` and `publicTopicCuration` returned DB `slug`, `name`, `category`, `itemUrl`, and `note` values directly. If historical or manually edited rows contained padded or blank strings, topic list/detail pages and public curation payloads would preserve unstable whitespace even though the UI expects polished public labels and links.
- Fix: Trim public topic slug/name/category and curation item URLs, normalize blank curation notes to `null`, and apply topic category label mapping after trimming.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 17 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 256 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This normalizes public API output only; topic config parsing and database storage remain unchanged.

### 2026-05-30 - SI-ISSUE-145 - Company public payloads can preserve blank text fields

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public company field normalization review
- Evidence: `publicCompany` returned DB `profile`, `website`, `stockSymbol`, `logoUrl`, names, country, and sector values directly. If historical or manually edited rows contained padded or blank strings, company detail pages could treat blank `profile` or `stockSymbol` as real content and public payloads would expose unstable whitespace instead of the existing null/empty-field contract.
- Fix: Trim public company text fields, map blank optional display fields to `null`, and normalize country/sector labels after trimming while preserving existing label mappings and nested article serialization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 15 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 255 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: This normalizes public API output only; catalog/config parsing and database storage remain unchanged.

### 2026-05-30 - SI-ISSUE-144 - Source filters can break old URLs after public name cleanup

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up source filter compatibility review
- Evidence: `createPublicSourceFilterToKey` mapped only the current cleaned public source name to an internal source key, then fell back to the raw filter value. After cleaning labels such as `RSSHub - 微博商业航天关键词` to `微博商业航天关键词`, old bookmarked URLs or stale option values using the previous raw display name would no longer map to the source key and would return no matching articles.
- Fix: Build source-filter aliases for each enabled source from the cleaned public name, the raw configured name, and the source key, preserving compatibility while keeping the visible option value polished.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_sourceFilters.test.ts functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\utils.test.ts` passing 6 files / 33 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 254 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: Disabled sources still do not participate in public-name mapping; unknown values continue to pass through for explicit source-key compatibility.

### 2026-05-30 - SI-ISSUE-143 - Article card detail navigation lacks interaction regression coverage

- Priority: P3
- Status: VERIFIED
- Area: frontend | tests
- Found In: follow-up article click-through regression review
- Evidence: Article cards implemented whole-card navigation to the article detail page, but the existing test only checked SSR output for `role="link"` and nested hrefs. It did not verify the activation rules for plain card clicks, modified clicks, nested links, or Enter key navigation, leaving the previous "clicking news does not navigate" behavior vulnerable to regression.
- Fix: Extract card pointer and keyboard activation rules into `ArticleCard.utils.ts`, use those helpers in `ArticleCard`, and add focused regression tests for plain primary click activation, modified/prevented/nested-interactive click suppression, and Enter-key activation on the card itself.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\ArticleCard.utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\ArticleDetailPage.test.tsx` passing 4 files / 14 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 58 files / 253 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: The runtime behavior remains intentionally conservative: nested article links, tag links, company links, and original-link controls keep their native behavior while plain card activation opens the detail route.

### 2026-05-30 - SI-ISSUE-142 - Frontend publisher labels can expose aggregator prefixes from stale payloads

- Priority: P3
- Status: VERIFIED
- Area: frontend | tests
- Found In: follow-up frontend display fallback review
- Evidence: `articlePublisherLabel` stripped aggregator prefixes only when falling back to `sourceName`, but returned trimmed `publisherName` directly. Article card and detail views both use this helper, so stale cached payloads or abnormal public article responses could still show `Google News RSS - ...` or `RSSHub - ...` as the visible article source when `publisherName` carried the implementation prefix.
- Fix: Route `publisherName` through the same `stripAggregatorPrefix` helper before using it, and keep the existing cleaned `sourceName` fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx functions\api\_articles.test.ts` passing 4 files / 36 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 250 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: The API serializer already cleans publisher labels; this keeps the frontend resilient to old cache entries, tests, and future callers that bypass the serializer.

### 2026-05-30 - SI-ISSUE-141 - Sources API fallback can expose raw database source names

- Priority: P3
- Status: VERIFIED
- Area: api | tests
- Found In: follow-up sources public contract review
- Evidence: `/api/sources` used configured `sourceDisplayName` only when a DB source key existed in generated config. If an enabled DB source remained after config drift or historical data cleanup, the fallback returned raw `source.name`, which could expose `RSSHub - ...` or similar implementation prefixes in the public source directory.
- Fix: Add a sources API fallback display helper that strips aggregator prefixes and returns a stable `来源` fallback, then use it for unconfigured enabled sources before building public source items and stats.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\utils.test.ts functions\api\_sourceFilters.test.ts src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 35 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 249 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: Unknown enabled DB sources still appear as public source options, but their visible name is now sanitized even when config metadata is unavailable.

### 2026-05-30 - SI-ISSUE-140 - RSSHub source names can expose aggregator implementation prefixes

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public source-name review
- Evidence: `sourceDisplayName` cleaned Google News labels but did not treat `rsshub` as an aggregator display case. If optional RSSHub sources such as `RSSHub - 微博商业航天关键词` were enabled, `/api/sources`, health source labels, source filters, and article source fallbacks could show the RSSHub implementation prefix instead of a polished public source name.
- Fix: Extend the shared source display helper to strip `RSSHub -` prefixes and apply that cleanup to `rsshub` sources, keeping all public source-name consumers aligned through the same helper.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\sources.test.ts functions\api\_articles.test.ts src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 7 files / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 249 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: RSSHub remains available as an internal source type and configuration mechanism; only the public label removes the implementation prefix.

### 2026-05-30 - SI-ISSUE-139 - Article API can expose raw aggregator source names

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up article public contract review
- Evidence: `publicArticleSummary` returned `row.sourceName` directly, while `/api/sources` and health responses already used configured public source names. Historical rows or fallback aggregator rows could therefore keep exposing `Google News RSS - ...` style implementation names through article list/detail payloads, publisher fallback labels, and related source labels.
- Fix: Article public serialization now prefers configured `sourceDisplayName` by `sourceKey`, strips aggregator prefixes from publisher labels and related source labels, and de-duplicates cleaned related source labels before returning the public payload.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 37 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 248 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused sensitive-pattern scan returning no matches.
- Notes: Internal database rows and ingestion behavior still preserve original source metadata; only the public article serializer cleans labels for API consumers.

### 2026-05-30 - SI-ISSUE-138 - Topic curation API exposes unused database IDs

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up topic curation public contract review
- Evidence: Topic detail curated-link payloads still exposed database `id` fields. The only frontend use was as a React key, so the public API exposed an internal storage identifier without visible product value.
- Fix: Remove `id` from public topic curation serialization and frontend `ApiTopicCuration`; use a stable `itemUrl:createdAt` composite key for rendering safe curated links.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicDetailPage.test.tsx` passing 2 files / 10 tests, `rg -n "ApiTopicCuration|PublicTopicCuration|curations|id:|\.id" functions\api\_topics.ts functions\api\_topics.test.ts src\types.ts src\pages\TopicDetailPage.tsx src\pages\TopicDetailPage.test.tsx` confirming public curation id is gone and remaining ids are article/launch or internal input fixtures, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Internal curation rows still keep database ids; only the public topic-detail payload changed.

### 2026-05-30 - SI-ISSUE-137 - Company and topic APIs expose unused database IDs

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up company/topic public contract review
- Evidence: Company and topic list/detail responses still exposed database `id` fields, while frontend navigation and rendering use stable `slug` values. Keeping unused database IDs in public payloads exposes storage details and increases compatibility surface without current product value.
- Fix: Remove `id` from public company and topic serializers and frontend `ApiCompany` / `ApiTopic` types. Keep article, launch, and topic-curation IDs where the current public UI or routing still uses them.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 7 files / 28 tests, `rg -n "ApiCompany|ApiTopic|PublicCompany|PublicTopic|id:|\.id" functions\api\_companies.ts functions\api\_companies.test.ts functions\api\_topics.ts functions\api\_topics.test.ts src\types.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` confirming company/topic public types no longer expose id and remaining ids are article, launch, curation, or internal input fixtures, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: This preserves stable slug-based routing and avoids changing curation IDs, which are still used as React keys in topic detail.

### 2026-05-30 - SI-ISSUE-136 - Article API exposes raw language and region codes

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up article public contract review
- Evidence: Public article summaries/details still returned raw `language` and `region` values such as `en`, `zh`, `cn`, and `global`. Frontend pages only used `region` to derive a Chinese display label, and `language` was not consumed, so those fields kept internal classification codes in the public article contract without current UI value.
- Fix: Public article serializers now omit `language` and raw `region`, return `regionLabel` as `国内/国际`, and article detail/list mapping consumes the label directly. Article query filters still accept raw `region=cn/global` as request input.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 36 tests, `rg -n "\.region|region:|\.language|language:|regionLabel|displayRegion" functions\api\_articles.ts functions\api\_articles.test.ts src\types.ts src\utils.ts src\utils.test.ts src\pages\ArticleDetailPage.tsx src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.tsx` confirming raw language/region remain only as serializer input fixtures and internal filter/link helpers, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: This preserves visible article region links by mapping the public Chinese `FeedStory.region` back to the existing filter URL values at the card layer.

### 2026-05-30 - SI-ISSUE-135 - Launch API exposes raw upstream status values

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up launch public contract review
- Evidence: Launch list/detail responses returned raw upstream status values such as `Go` and `TBD`, while frontend pages converted them to Chinese with `displayLaunchStatus`. This kept Launch Library implementation vocabulary in the public response even though the UI only needs the Chinese status label.
- Fix: Public launch serializers now omit raw `status` and return `statusLabel`; launch list, detail, and home HUD components consume the label directly. Raw status values remain internal for D1 storage and public status filter normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\components\LiveHud.test.tsx src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\utils.test.ts` passing 5 files / 38 tests, `rg -n "status:|\.status|statusLabel|displayLaunchStatus" functions\api\_launches.ts functions\api\_launches.test.ts src\types.ts src\components\LiveHud.tsx src\components\LiveHud.test.tsx src\pages\LaunchesPage.tsx src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.tsx src\pages\LaunchDetailPage.test.tsx src\utils.ts src\utils.test.ts` confirming raw status remains only as serializer input fixtures and the shared label mapper, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Query filters still accept Chinese and common raw status terms, but public launch responses expose the Chinese label only.

### 2026-05-30 - SI-ISSUE-134 - Company API exposes raw country and sector fields

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up company public contract review
- Evidence: Company list and detail serializers returned Chinese `countryLabel` and `sectorLabel`, but still exposed raw `country` and `sector` values such as `United States` and `Launch`. Company pages already display the Chinese labels, so the raw fields kept less polished source data in the public API contract without current frontend value.
- Fix: Change public company serializers to omit raw `country` and `sector`, keep only `countryLabel` and `sectorLabel`, update frontend `ApiCompany` type, and remove stale raw country/sector fields from company-related page fixtures.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 14 tests, `rg -n "\.country|\.sector|country:|sector:|ApiCompany|PublicCompany|publicCompany" functions\api\_companies.ts functions\api\_companies.test.ts src\types.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\ArticlesPage.test.tsx src\pages\CompaniesPage.tsx src\pages\CompanyDetailPage.tsx` confirming raw country/sector remain only as serializer input fixtures/internal label mapping, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Company config and database rows still keep raw country/sector for internal normalization and label mapping; public responses now expose the Chinese labels only.

### 2026-05-30 - SI-ISSUE-133 - Topic API exposes raw category enums

- Priority: P3
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up topic public contract review
- Evidence: Topic list and detail serializers returned Chinese `categoryLabel`, but still exposed raw `category` values such as `technology`, `market`, and `policy`. Frontend pages had already moved to `categoryLabel`, so the raw enum no longer had visible product value and kept an internal classification in the public API contract.
- Fix: Change public topic serializers to omit raw `category`, keep only `categoryLabel`, update frontend `ApiTopic` type, and remove stale raw category fields from topic-related page fixtures.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 4 files / 16 tests, `rg -n "category:|\.category|categoryLabel" functions\api\_topics.ts functions\api\_topics.test.ts src\types.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx src\pages\TopicsPage.tsx` confirming raw category remains only as serializer input fixtures/internal mapping and public output checks use `categoryLabel`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Topic config and database rows still keep raw category for internal grouping and label mapping; public responses now expose the Chinese label only.

### 2026-05-30 - SI-ISSUE-132 - Company and topic label fields are optional in frontend types

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | tests
- Found In: follow-up public label type-contract review
- Evidence: Company APIs always add `countryLabel` and `sectorLabel`, and topic APIs always add `categoryLabel`, but frontend types marked those fields optional. Companies and topics pages therefore kept fallbacks to raw `country`, `sector`, and `category`, allowing label omissions to silently show less polished source data instead of failing type checks.
- Fix: Make `countryLabel`, `sectorLabel`, and `categoryLabel` required in frontend API types, remove raw-field display fallbacks on company/topic pages, and update the topic detail test fixture with the required label.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts functions\api\_topics.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\ArticlesPage.test.tsx` passing 7 files / 28 tests, `rg -n "countryLabel\?|sectorLabel\?|categoryLabel\?|\?\? .*country|\?\? .*sector|\?\? .*category" src\types.ts src\pages\CompaniesPage.tsx src\pages\CompanyDetailPage.tsx src\pages\TopicsPage.tsx src\pages\TopicDetailPage.test.tsx` returning no matches, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: The raw fields remain in the API for compatibility and filtering semantics; visible company/topic pages now rely on the Chinese public labels that the API guarantees.

### 2026-05-30 - SI-ISSUE-131 - Sources API stats are optional in frontend types

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | tests
- Found In: follow-up sources API type-contract review
- Evidence: `/api/sources` now always returns `publicStats` and `accessStats`, but `ApiSourceListResult` still typed both arrays as optional. That let frontend fixtures and future code omit source-status statistics even though the public API contract provides them, weakening type coverage for the source access display.
- Fix: Make `publicStats` and `accessStats` required in `ApiSourceListResult`, and update source-query related test fixtures to include the required arrays while preserving loading/error states where `data` is absent.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx functions\api\sources.test.ts` passing 5 files / 15 tests, `rg -n "publicStats\?|accessStats\?|region:" src\types.ts src\components\SourceOptions.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` confirming optional source stats and stale region fixtures are gone, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Runtime behavior is unchanged; this makes the frontend type contract match the already-stable source API response shape.

### 2026-05-30 - SI-ISSUE-130 - Sources API exposes raw region codes

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public sources response contract review
- Evidence: `/api/sources` source items still returned `region` values such as `cn` and `global`, while frontend source selectors and status panels did not consume that field. Keeping unused raw region codes in the public source contract exposes implementation classification and increases future compatibility burden without visible product value.
- Fix: Remove `region` from public source items and from the frontend `ApiSource` type. Keep source region internal for config parsing, source metadata defaults, ingestion routing, and database queries.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx` passing 3 files / 12 tests, `rg -n "ApiSource|\.region|region" functions\api\sources.ts functions\api\sources.test.ts src\types.ts src\components\SourceOptions.tsx src\components\LiveHud.tsx` confirming only article-region typing and source API test fixtures remain, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: This does not change domestic/global access labels; it only removes the unused raw source-region code from the public response.

### 2026-05-30 - SI-ISSUE-129 - Article API exposes raw source category enums

- Priority: P2
- Status: VERIFIED
- Area: api | frontend | tests
- Found In: follow-up public article category contract review
- Evidence: Public article serialization still treated raw `sourceCategory` as part of the article contract after source-list category enums were removed. That kept English enum values such as `media`, `official`, and `source` available to article API consumers even though the frontend only needs Chinese `sourceCategoryLabel` for display and classification.
- Fix: Remove raw `sourceCategory` from public article summaries/details/lists, keep only `sourceCategoryLabel`, update frontend article classification to use Chinese labels, and change serializer tests to assert forbidden properties structurally so `sourceCategoryLabel` is not mistaken for the removed raw field.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx` passing 4 files / 33 tests, `rg -n "sourceCategory" functions src -g "*.ts" -g "*.tsx"` showing only `sourceCategoryLabel` usage and the forbidden-property test field name, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 247 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check`, and focused code secret-pattern scan returning no matches.
- Notes: Internal source category typing remains available for config and fallback mapping; the public article contract now exposes the Chinese label only.

### 2026-05-30 - SI-ISSUE-128 - Sources API exposes raw public category enums

- Priority: P2
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public source category contract review
- Evidence: `/api/sources` returned Chinese source category labels, but still exposed raw category enum values through `items[].publicCategory` and `publicStats[].category`, and `SourceOptions` filtered sources by those English enum values. This kept terms such as `media`, `official`, and `notice` in the public source API contract even though the UI only needs Chinese category labels.
- Fix: Remove raw source category enums from the public sources response, return `categoryLabel` on source items, return category stats by Chinese `label`, and change `SourceOptions` / policy filters to use Chinese category labels.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx src\pages\PolicyPage.test.tsx` passing 4 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 246 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` over touched source-category files, and focused code secret-pattern scan returning no matches.
- Notes: Internal source metadata still uses typed category enums for config validation and aggregation; only the public `/api/sources` contract and frontend filtering were changed.

### 2026-05-30 - SI-ISSUE-127 - Sources API exposes raw access status enums

- Priority: P2
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public source access contract review
- Evidence: `/api/sources` had already removed internal source keys, but still returned raw access status values and count field names such as `accessDomestic: "limited"`, `accessGlobal: "direct"`, `accessStats.status`, `directCount`, and `limitedCount`. The frontend translated these values in `LiveHud`, which meant the public API still exposed internal English enum terms instead of a Chinese-facing access contract.
- Fix: Add shared access status labels, return `domesticAccessLabel`, `globalAccessLabel`, source-category `accessSummaryLabel`, and access stats with Chinese `label` values. `LiveHud` now consumes those public labels directly instead of translating raw status enums.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\components\LiveHud.test.tsx src\components\SourceOptions.test.tsx src\utils.test.ts` passing 4 files / 29 tests, follow-up targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\components\LiveHud.test.tsx src\components\SourceOptions.test.tsx` passing 3 files / 12 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 246 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` over touched source-status files, and focused code secret-pattern scan returning no matches.
- Notes: Internal source configuration still uses typed status enums; only the public `/api/sources` response and frontend consumption were changed.

### 2026-05-30 - SI-ISSUE-126 - Scheduled timeout test is too sensitive to wall-clock timing

- Priority: P3
- Status: VERIFIED
- Area: tests | ingestion
- Found In: full regression run after source filter contract changes
- Evidence: Full `.\node_modules\.bin\vitest.cmd run` failed in `src/ingestion/scheduled.test.ts` because the test used `sourceTimeoutMs: 10`. The intentionally healthy RSS source also timed out under that narrow budget, so the test was asserting scheduler behavior with a timing threshold too close to normal XML parsing and in-memory persistence overhead.
- Fix: Raise the test-only timeout budget to 100ms and update the expected timeout message, preserving the hanging-source coverage while giving the healthy source enough room to complete deterministically.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\scheduled.test.ts -t "closes a timed-out source log"` passing, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 245 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` over touched files, and focused code secret-pattern scan returning no matches.
- Notes: Runtime timeout defaults are unchanged; this only stabilizes the regression test.

### 2026-05-30 - SI-ISSUE-125 - Sources API exposes internal source keys

- Priority: P2
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public source filter contract review
- Evidence: `/api/sources` still returned internal source keys such as `snapi` and `cnsa-news`, and `SourceOptions` used those keys as option values. Selecting a source could therefore put implementation identifiers like `source=snapi` or `source=nasa-spaceflight-rss` into visible page URLs, even after source display names and source categories were cleaned up.
- Fix: Remove `key` from the public sources API response, use public source names as frontend source filter values, and add an API-side public-name-to-source-key mapper for article listing requests. The mapper only uses enabled sources, existing old key-based URLs remain compatible, and repository config now verifies enabled public source names are unique.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts functions\api\_sourceFilters.test.ts src\components\SourceOptions.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\db\articleQueries.test.ts` passing 6 files / 22 tests, follow-up targeted `.\node_modules\.bin\vitest.cmd run functions\api\_sourceFilters.test.ts functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\ingestion\ingestion.test.ts` passing 4 files / 40 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 57 files / 245 tests, `.\node_modules\.bin\vite.cmd build`, focused `git diff --check` over touched source-filter files, and focused code secret-pattern scan returning no matches.
- Notes: The database and ingestion layers continue to use source keys internally; only the public source selector contract changed.

### 2026-05-30 - SI-ISSUE-124 - Single-source admin ingestion ignores enabled flags

- Priority: P2
- Status: VERIFIED
- Area: ingestion | admin
- Found In: follow-up admin ingestion source-state review
- Evidence: RSS and Google News admin ingestion endpoints filter enabled sources, but SNAPI and Launch Library 2 admin endpoints selected sources by fixed key without checking `enabled`. A source disabled in configuration could therefore still be triggered manually through the protected admin endpoint.
- Fix: Add a shared `findEnabledAdminSourceByKey` helper and reuse it in SNAPI and Launch Library admin ingestion endpoints, so disabled or missing fixed-key sources return the existing generic unavailable-source response instead of running.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\admin\ingest\_sources.test.ts functions\api\admin\ingest\rss.test.ts src\ingestion\scheduled.test.ts` passing 3 files / 13 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 56 files / 241 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched fixed-key admin ingest files returning no matches.
- Notes: This preserves the existing generic admin response text and aligns protected manual ingestion with config-first source enablement.

### 2026-05-30 - SI-ISSUE-123 - Admin RSS ingestion skips RSSHub sources

- Priority: P2
- Status: VERIFIED
- Area: ingestion | admin
- Found In: follow-up admin ingestion coverage review
- Evidence: Hourly scheduled ingestion now registers enabled `rsshub` sources, but `/api/admin/ingest/rss` still filtered only `type === 'rss'`. If an RSSHub source is deliberately enabled, scheduled ingestion would collect it while the manual RSS admin endpoint would silently skip it.
- Fix: Add a shared manual RSS source predicate that includes enabled `rss` and `rsshub` sources, and register both `rssCollector` and `rsshubCollector` in the admin RSS ingestion registry.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\admin\ingest\rss.test.ts src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 3 files / 42 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 55 files / 239 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched admin RSS files returning no matches.
- Notes: Google News RSS remains on its separate admin endpoint; this change only aligns RSS-like manual ingestion with the scheduled RSSHub path.

### 2026-05-30 - SI-ISSUE-122 - Google News RSS requests lack explicit User-Agent

- Priority: P3
- Status: VERIFIED
- Area: ingestion | operations
- Found In: follow-up collector request-header review
- Evidence: Google News RSS collector requests only sent RSS/XML accept headers, while RSS, RSSHub, official page, SNAPI, and Launch Library 2 collectors now identify project traffic with a User-Agent. If the backup aggregator source is deliberately enabled later, upstream access troubleshooting would have less request context.
- Fix: Add `user-agent: SpaceIntelBot/1.0 (+https://space.bytebaud.com)` to Google News RSS fetch requests and cover it in the Google News RSS collector test.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts src\ingestion\launchIngestion.test.ts` passing 3 files / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 237 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched Google News RSS files returning no matches.
- Notes: Google News RSS remains disabled by default; this only aligns backup-source request identification for deliberate future enablement.

### 2026-05-30 - SI-ISSUE-121 - SNAPI requests lack explicit User-Agent

- Priority: P3
- Status: VERIFIED
- Area: ingestion | operations
- Found In: follow-up collector request-header review
- Evidence: The SNAPI collector sent `accept: application/json` but did not include a project User-Agent, while RSS and Launch Library 2 collectors already identify `space-intel` requests. This leaves the core news API request less transparent to upstream operators and can make future access troubleshooting harder.
- Fix: Add `user-agent: space-intel/0.1 (+https://space.bytebaud.com)` to SNAPI fetch requests and cover it in the SNAPI collector test.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts src\ingestion\launchIngestion.test.ts` passing 3 files / 41 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 237 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched SNAPI files returning no matches.
- Notes: This does not change the endpoint URL, payload parsing, or storage behavior; it only aligns request identification across collectors.

### 2026-05-30 - SI-ISSUE-120 - RSSHub sources are configured but not scheduled

- Priority: P2
- Status: VERIFIED
- Area: ingestion | scheduling
- Found In: follow-up source-type coverage review
- Evidence: `config/sources.yaml` contains `rsshub` sources and the source schema accepts `rsshub`, but scheduled hourly ingestion only dispatched `rss`, `google_news_rss`, `official_page`, `procurement_page`, SNAPI, and Launch Library 2. Enabling an RSSHub source later would therefore leave it silently uncollected.
- Fix: Added an RSSHub collector that reuses the RSS metadata parser, exported it through the ingestion index, and registered enabled `rsshub` sources in hourly scheduled ingestion with the same bounded concurrency class as RSS/page sources.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 40 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 237 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched RSSHub scheduling files returning no matches.
- Notes: Repository RSSHub sources remain disabled by default; this only ensures deliberate future enablement goes through the existing ingestion pipeline instead of being ignored.

### 2026-05-30 - SI-ISSUE-119 - API collectors ignore source max_items

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up API collector quantity-control review
- Evidence: SNAPI and Launch Library 2 collectors set upstream `limit` from the source URL or defaulted to 25, but did not let `source.max_items` control request size or final normalized output. Future source edits could therefore configure `max_items` without affecting these API-style collectors.
- Fix: SNAPI and Launch Library 2 now use `source.max_items` as the upstream `limit` when configured, preserve existing URL/default behavior otherwise, and cap final normalized output to the same configured value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\launchIngestion.test.ts` passing 2 files / 31 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 235 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched API collector files returning no matches.
- Notes: Repository `snapi` and `launch-library-2` sources currently rely on the default limit; this change makes future source-level quantity tuning behave consistently with RSS, Google News RSS, official page, and procurement page collectors.

### 2026-05-30 - SI-ISSUE-118 - Google News RSS ignores source max_items

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up Google News RSS collector review
- Evidence: Google News RSS collection did not apply `source.max_items` or a default output cap, unlike standard RSS and official/procurement page collectors. If a backup aggregation source is enabled, it can return more normalized records than the source configuration intends.
- Fix: Apply Google News RSS `max_items` after invalid item links have been dropped, with a default cap of 50 normalized records.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 30 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 233 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched Google News RSS files returning no matches.
- Notes: Google News RSS remains disabled by default in repository configuration; this controls behavior if it is deliberately enabled later.

### 2026-05-30 - SI-ISSUE-117 - RSS max_items can count invalid feed links

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up RSS collector review
- Evidence: RSS collection applied `source.max_items` before filtering out non-web item links. Invalid `javascript:`, `mailto:`, or otherwise unsupported feed links could therefore consume the source item budget and prevent later valid records in the same feed from being collected.
- Fix: Apply RSS `max_items` after invalid item links have been dropped, so the limit reflects final normalized records rather than raw feed entries.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 29 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 232 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched RSS files returning no matches.
- Notes: Source-level `max_items` remains the output cap; invalid feed entries simply no longer count against it.

### 2026-05-30 - SI-ISSUE-116 - API collectors can persist non-web upstream URLs

- Priority: P2
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up API collector boundary review
- Evidence: SNAPI article URLs and Launch Library source URLs were accepted through generic URL parsing or direct passthrough. Upstream JSON payloads with `ftp:`, `data:`, or other non-web schemes could therefore enter normalized article or launch records before frontend rendering guards hide them.
- Fix: Reuse the shared `http/https` URL normalizer in SNAPI and Launch Library collectors. SNAPI drops article items without web article links; Launch Library keeps launch metadata but suppresses invalid source URLs.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 28 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 231 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched API collector files returning no matches.
- Notes: The launch source URL is optional metadata, so invalid source links should not discard otherwise valid launch cache entries.

### 2026-05-30 - SI-ISSUE-115 - Company catalog accepts non-web public URLs

- Priority: P2
- Status: VERIFIED
- Area: catalog | config
- Found In: follow-up catalog configuration boundary review
- Evidence: Company catalog `website` and `logo_url` fields used generic URL validation. These fields feed public company pages and API payloads, but generic URL validation can accept non-web schemes such as `ftp:` or `data:` that should not be part of the public company catalog.
- Fix: Restrict optional company website and logo URLs to `http` and `https` while preserving the existing blank-as-absent behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\curations\config.test.ts src\ingestion\ingestion.test.ts` passing 3 files / 37 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 229 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched catalog URL files returning no matches.
- Notes: Frontend rendering already guards unsafe company links; this closes the catalog data boundary earlier.

### 2026-05-30 - SI-ISSUE-114 - Curation config accepts non-web item URLs

- Priority: P2
- Status: VERIFIED
- Area: curation | config
- Found In: follow-up curation configuration boundary review
- Evidence: `parseCurationsConfig` used generic URL validation for home, pinned, and topic curation links. Generic URL validation accepts non-web schemes such as `ftp:` or `mailto:`, which are unsuitable for public selected-resource links even though frontend rendering later hides unsafe external hrefs.
- Fix: Move the shared `http/https` URL normalizer to `src/config` and restrict all curation URLs to web links during config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 3 files / 32 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 228 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched URL/config files returning no matches.
- Notes: This protects curated editorial data at the configuration boundary; existing public-link rendering guards remain defense in depth.

### 2026-05-30 - SI-ISSUE-113 - Source configuration accepts non-web fetch URLs

- Priority: P2
- Status: VERIFIED
- Area: ingestion | config
- Found In: follow-up source configuration boundary review
- Evidence: Source config validation used a generic URL schema for `source.url`. The configured collectors fetch web APIs, RSS feeds, and public HTML pages, but a future source edit could pass validation with a non-web scheme such as `ftp:`, creating an invalid or unsupported ingestion target.
- Fix: Restrict source configuration URLs to `http` and `https` during schema parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 24 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 227 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched source config files returning no matches.
- Notes: Existing repository source URLs are expected to remain valid; this only tightens future source additions.

### 2026-05-30 - SI-ISSUE-112 - RSS ingestion accepts non-web item links

- Priority: P2
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up RSS ingestion boundary review
- Evidence: RSS and Google News RSS collectors filtered only for truthy `item.link` values. A malformed or hostile feed item with `javascript:`, `mailto:`, or another non-web scheme could enter normalized article records even though later frontend rendering hides unsafe external links.
- Fix: Add a shared ingestion URL normalizer that accepts only `http` and `https`, then use it in RSS, Google News RSS, and HTML list URL normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\htmlList.test.ts` passing 2 files / 25 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 226 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched RSS URL normalization files returning no matches.
- Notes: This keeps frontend URL guards as defense in depth while preventing invalid article URLs from being persisted in the first place.

### 2026-05-30 - SI-ISSUE-111 - HTML list ingestion accepts non-web href schemes

- Priority: P2
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up ingestion boundary review
- Evidence: `extractHtmlListLinks` used `new URL(value, base).toString()` without protocol filtering. Official-page and procurement-page collectors could therefore accept `javascript:`, `mailto:`, or other non-web hrefs from source pages as article URLs before the frontend safety layer hides them.
- Fix: Restrict shared HTML list URL normalization to `http` and `https` links, so non-web hrefs are dropped before collector normalization and persistence.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\htmlList.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 54 files / 224 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched HTML list files returning no matches.
- Notes: This tightens ingestion data quality; frontend external-link guards remain as defense in depth.

### 2026-05-30 - SI-ISSUE-110 - Blank source display metadata can remain configured

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data
- Found In: follow-up source configuration hygiene review
- Evidence: `parseSourcesConfig` trimmed optional `access_note` and `public_badge`, but blank-only values were still retained as empty strings. These fields are public display metadata, so future source edits could generate empty badges or access notes instead of treating the fields as unset.
- Fix: Normalize blank-only optional source display fields to absent values during source config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts` passing 1 file / 21 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 53 files / 222 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched source config files returning no matches.
- Notes: This does not change non-empty badges or access notes; it only prevents blank display metadata from entering generated config and source API metadata.

### 2026-05-30 - SI-ISSUE-109 - Topic curation cards can show raw URLs as titles

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up topic detail review
- Evidence: `TopicDetailPage` rendered `curation.note ?? curation.itemUrl` as the emphasized curation label. When a curated item has no note, the page can show a full raw URL as the card title, which reads like unprocessed data rather than a mature selected-resource list.
- Fix: Topic curations now trim notes and fall back to the external URL hostname, with a generic `精选资料` fallback only if URL parsing fails after prior URL safety checks.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\TopicDetailPage.test.tsx functions\api\_topics.test.ts` passing 2 files / 10 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 53 files / 221 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched topic detail files returning no matches.
- Notes: The actual external link href should remain unchanged; only the visible fallback label should be improved.

### 2026-05-30 - SI-ISSUE-108 - Live HUD aria label keeps English UI shorthand

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up accessible UI copy review
- Evidence: The homepage side panel used `aria-label="实时情报 HUD"`. The text is not visually prominent, but it is still user-facing for assistive technology and SSR output, and `HUD` reads like an internal/interface shorthand on a Chinese site.
- Fix: Changed the side panel accessible label to `实时概览`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\LiveHud.test.tsx src\App.test.tsx` passing 2 files / 10 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 53 files / 220 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched HUD files returning no matches.
- Notes: CSS class names can remain implementation details; only the accessible label needs user-facing copy.

### 2026-05-30 - SI-ISSUE-107 - Future launch proximity uses post-event T+ wording

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up launch timeline copy review
- Evidence: `launchProximity` returned `约 T+N 天` for future launches more than one day away. `T+` normally describes time after an event, so using it for upcoming launches can misread as already past rather than upcoming.
- Fix: Changed future launch proximity copy from `约 T+N 天` to `约 N 天后`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 3 files / 28 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 53 files / 220 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched launch display helper files returning no matches.
- Notes: Today, tomorrow, completed, and unknown-window labels should keep their current semantics.

### 2026-05-30 - SI-ISSUE-106 - Command palette search input does not submit article searches

- Priority: P2
- Status: VERIFIED
- Area: frontend
- Found In: follow-up header search behavior review
- Evidence: `SiteHeader` labels the command dialog as `站内搜索` and shows a keyword input, but the command list only contains channel, company, and topic navigation items. Entering a news keyword has no command path to `/articles?query=...`, so the command palette behaves like navigation rather than site search.
- Fix: Added a command-palette keyword search item that appears for non-empty input and navigates to `/articles?query=...`; closing or executing a command clears the transient input value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SiteHeader.test.tsx src\App.test.tsx` passing 2 files / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 53 files / 219 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, focused code secret-pattern scan over touched header files returning no matches, and a local Playwright check confirming `Ctrl+K` plus `Rocket Lab` navigates to `/articles?query=Rocket+Lab`.
- Notes: The existing header search form already submits article queries; this issue is about aligning the command palette with the same search behavior.

### 2026-05-30 - SI-ISSUE-105 - Launch list shows persistent filter instruction copy

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up visible UI copy review
- Evidence: `LaunchesPage` rendered a persistent `当前显示首批发射记录，可用关键词、发射商或状态继续筛选。` status line whenever the API reported more launch records. The filter drawer already exposes the controls, so this visible instruction copy adds interface explanation rather than launch content.
- Fix: Removed the persistent has-more filter instruction while keeping the launch filter drawer and API pagination metadata unchanged.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchesPage.test.tsx` passing 1 file / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 218 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched launch page files returning no matches.
- Notes: Pagination capability remains represented by the API `hasMore` field; this issue only removes explanatory page copy.

### 2026-05-30 - SI-ISSUE-104 - Article filter datalist fills internal entity slugs

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up article filter UI review
- Evidence: The article advanced filter datalist options used topic and company slugs as the submitted option values. Selecting a suggested topic or company could fill the visible input with internal identifiers such as `reusable-rockets` or `rocket-lab` instead of the public names shown elsewhere.
- Fix: Changed topic and company datalist option values to use public names while keeping slugs only as internal React keys.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticlesPage.test.tsx src\db\articleQueries.test.ts` passing 2 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 217 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched article filter files returning no matches.
- Notes: Existing slug URLs remain supported by `SI-ISSUE-103`; this change only improves the suggested option values shown to users.

### 2026-05-30 - SI-ISSUE-103 - Article entity filters only match internal slugs

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: follow-up article filter review
- Evidence: The article filter UI presents topic and company fields as selectable or user-entered values, but `listArticles` only filters `tag` by `t.slug = ?` and `company` by `c.slug = ?`. A user-entered display value such as `可回收火箭` or `Rocket Lab` can therefore return empty results even when matching articles exist.
- Fix: Changed article tag and company filtering to keep exact slug support while also matching public display names case-insensitively; company filters now also match `english_name`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 3 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 216 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused code secret-pattern scan over touched article query files returning no matches.
- Notes: Existing slug filter URLs should remain valid; the fix should add public display-name matching without widening source or region filters.

### 2026-05-30 - SI-ISSUE-102 - Launch provider filter requires exact casing and full value

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: follow-up launch filter review
- Evidence: The launch provider field is a free-text filter, but `listLaunches` queried `provider = ?`. A user-entered value such as `rocket lab`, `Rocket`, or a value with incidental spacing would not match `Rocket Lab` records even though the UI presents the field like keyword search.
- Fix: Changed launch provider filtering to use the same trimmed, case-insensitive keyword matching style as launch text search.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\launchQueries.test.ts src\pages\LaunchesPage.test.tsx functions\api\_launches.test.ts` passing 3 files / 16 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 215 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched launch provider filter files returning no matches.
- Notes: Exact provider values still match because they pass through the keyword matcher.

### 2026-05-30 - SI-ISSUE-101 - Launch status filter prompts Chinese labels but queries raw status exactly

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up launch filter review
- Evidence: The launch filter form suggested Chinese status values such as `准备发射` and `等待窗口`, while `/api/launches` passed `status` directly to the DB query as an exact raw-status match. Entering the visible Chinese labels could therefore return empty results even when matching launches existed.
- Fix: Added public launch status filter normalization for Chinese display labels and common raw aliases, then changed launch status DB filtering to use a case-insensitive keyword match.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\db\launchQueries.test.ts src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 4 files / 20 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 214 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched launch filter files returning no matches.
- Notes: Existing raw status filters such as `Go` still work through the same normalized path.

### 2026-05-30 - SI-ISSUE-100 - Header search exposes keyboard shortcut copy

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up global UI copy review
- Evidence: The site header search form rendered a visible `Ctrl K` shortcut hint. The shortcut behavior can remain available, but the visible UI should not describe keyboard shortcuts as feature instructions.
- Fix: Removed the visible `Ctrl K` hint from the header search form while preserving the existing keyboard listener and command palette behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\App.test.tsx` passing 1 file / 4 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, visible shortcut copy search showing only the negative test assertion remains, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 212 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, focused secret-pattern scan over touched header files returning no matches, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5199/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile.
- Notes: This is a visible copy cleanup with no route or API behavior change.

### 2026-05-30 - SI-ISSUE-099 - Launch detail omits status, provider, and site metadata

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up launch detail UX review
- Evidence: Launch cards showed provider and localized status, but the launch detail page only showed window, rocket, and source link. Opening a launch detail could therefore present less operational context than the list card, and it did not expose status/provider/site metadata already available in the API response.
- Fix: Launch detail now renders localized status, provider, rocket, and site metadata with clear pending fallbacks while preserving the existing window and source link behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx src\utils.test.ts` passing 4 files / 31 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 212 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, focused secret-pattern scan over touched launch detail files returning no matches, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5199/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile.
- Notes: This is a visible UI/detail completeness fix; API shape is unchanged.

### 2026-05-30 - SI-ISSUE-098 - Company cards expose raw country and sector values

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up user-facing copy review
- Evidence: Company list and detail pages rendered raw catalog values such as `United States / Launch` and `Remote sensing`. The values are useful internally, but they read as unfinished English taxonomy on a Chinese commercial-space site.
- Fix: Added a public company serialization boundary with `countryLabel` and `sectorLabel`, updated company list/detail APIs to use it, and changed company pages to display the public labels with legacy fallbacks to the raw fields.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_companies.test.ts src\pages\CompaniesPage.test.tsx src\pages\CompanyDetailPage.test.tsx` passing 3 files / 12 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 52 files / 211 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a focused code secret-pattern scan over touched company files returning no matches.
- Notes: Raw `country` and `sector` remain in the API for compatibility; user-visible pages prefer the Chinese label fields.

### 2026-05-30 - SI-ISSUE-097 - Topic cards expose raw category codes

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up user-facing copy review
- Evidence: The topic list page rendered `topic.category` directly, so repository category codes such as `technology`, `market`, `company`, or `policy` could appear in the Chinese UI instead of mature user-facing labels.
- Fix: Added a public topic serialization boundary with `categoryLabel` for known topic category codes, updated `/api/topics` to use it, and changed `TopicsPage` to display the public label with a legacy fallback to `category`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicsPage.test.tsx src\pages\TopicDetailPage.test.tsx` passing 3 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 51 files / 207 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a focused code secret-pattern scan over touched topic files returning no matches.
- Notes: The raw `category` field remains in the API for compatibility and future filtering, but the visible UI uses `categoryLabel` when available.

### 2026-05-30 - SI-ISSUE-096 - Home source stats ignore configured source category overrides

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: follow-up public home stats contract review
- Evidence: `/api/home` mapped enabled source statistics from DB collector `type` buckets. Configured per-source `public_category` overrides, such as `snapi` being a `media` source despite collector type `api`, were not reflected when the home page fell back to `stats.enabledSourceCategories`.
- Fix: `getHomeStats` now returns enabled source keys and types instead of pre-grouped type buckets, and public home serialization aggregates by configured source metadata before falling back to source type labels for unknown sources.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_home.test.ts src\db\homeQueries.test.ts src\components\LiveHud.test.tsx` passing 3 files / 14 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 51 files / 204 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a focused code secret-pattern scan over touched home stats files returning no matches.
- Notes: This keeps the public `enabledSourceCategories` response shape unchanged while making its counts match configured source semantics.

### 2026-05-30 - SI-ISSUE-095 - Article public category ignores source configuration overrides

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: follow-up public article source-category contract review
- Evidence: Public article serialization mapped `sourceCategory` only from the collector `sourceType`. Configured per-source overrides in `config/sources.yaml`, such as `snapi` using `public_category: media` while its collector type is `api`, were ignored in article payloads.
- Fix: Public article serialization now loads generated source configuration metadata and prefers each source key's configured public category and label before falling back to the collector type default for unknown sources.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx` passing 3 files / 27 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 51 files / 203 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a focused code secret-pattern scan over touched article serializer files returning no matches.
- Notes: This preserves the internal collector type fallback for legacy or unknown source rows while keeping configured source semantics authoritative for public article payloads.

### 2026-05-30 - SI-ISSUE-094 - Launch list frontend type omits pagination metadata

- Priority: P3
- Status: VERIFIED
- Area: frontend | api
- Found In: follow-up public API type contract review
- Evidence: `/api/launches` returns `page`, `limit`, and `hasMore`, but `ApiLaunchListResult` only declared `items` and `hasMore`. This type drift could hide future pagination regressions or make launch pagination work rely on untyped response fields.
- Fix: Added `page` and `limit` to `ApiLaunchListResult`, updated launch/HUD test fixtures, and added a type-focused regression test that requires launch list pagination metadata.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\types.test.ts src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 3 files / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, launch list fixture search confirming pagination metadata is represented, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 51 files / 201 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched code files returning no matches.
- Notes: This is a TypeScript contract correction; runtime API shape is unchanged.

### 2026-05-30 - SI-ISSUE-093 - Public article payloads expose collector source types

- Priority: P2
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public article response contract review
- Evidence: Public article summaries no longer exposed workflow fields, but still returned `sourceType` with collector-oriented values such as `google_news_rss`, `api`, and `official_page`. The frontend only used this value to derive display category and publisher fallback labels.
- Fix: Public article serialization now maps internal source types to `sourceCategory` and `sourceCategoryLabel`. Frontend article mapping uses public categories for display grouping, and publisher fallback no longer needs collector type.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\components\ArticleCard.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 6 files / 31 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, focused public article route/frontend `sourceType` search returning no matches, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 50 files / 200 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: DB query rows still keep `sourceType` internally for compatibility and mapping; public article payloads use source category metadata.

### 2026-05-30 - SI-ISSUE-092 - Topic detail API exposes curation routing fields

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up topic detail public response review
- Evidence: Topic detail responses loaded enabled curation rows but returned DB/config routing fields including `targetType`, `targetKey`, and `enabled` in the public JSON. The frontend only needs the curated item URL, optional note, created time, and ID.
- Fix: Added a public topic detail serialization boundary that keeps sanitized article summaries and narrows topic curations to `id`, `itemUrl`, `note`, and `createdAt`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_topics.test.ts src\pages\TopicDetailPage.test.tsx` passing 2 files / 6 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, focused topic route/frontend curation-field search, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 50 files / 200 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: Curation routing fields remain internal to DB/config sync and are not needed by the public topic page.

### 2026-05-30 - SI-ISSUE-091 - Launch APIs expose raw upstream URL field names

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public launch API response review
- Evidence: Public launch list/detail responses returned the DB row field `rawUrl` directly. The value is useful as the external launch source link, but the public field name reads like a cache/upstream implementation detail rather than a product API contract.
- Fix: Added a public launch serialization boundary that exposes `sourceUrl` instead of `rawUrl` for launch list and detail responses. The frontend `ApiLaunch` type and launch detail page now consume `sourceUrl`; DB and ingestion code keep `rawUrl` internally.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_launches.test.ts src\pages\LaunchDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\components\LiveHud.test.tsx` passing 4 files / 16 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, focused public launch route/frontend `rawUrl` search returning no matches, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 49 files / 198 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: This does not change launch source-link behavior; it only narrows the public response field name.

### 2026-05-30 - SI-ISSUE-090 - Sources API exposes collector type and ranking fields

- Priority: P2
- Status: VERIFIED
- Area: api | frontend
- Found In: follow-up public sources API response review
- Evidence: `/api/sources` returned enabled source rows with internal `type` and `credibility` fields, plus `stats` grouped by collector type. The frontend only needed source filter keys, public names, public categories, and access-status metadata, but the public JSON still exposed implementation-oriented collector categories.
- Fix: Narrowed `/api/sources` items to public fields (`key`, display `name`, `region`, public category/access metadata) and removed internal type stats from the response. `SourceOptions` now filters by public source category instead of collector type; the policy page uses `official`, `notice`, and `media` categories for its source dropdown.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\components\SourceOptions.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\components\LiveHud.test.tsx` passing 5 files / 13 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, focused sources response/filter dependency search, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 48 files / 196 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: Collector type and credibility remain available in the DB/config layer for ingestion and ranking; they are no longer part of the public sources response.

### 2026-05-30 - SI-ISSUE-089 - Home stats expose internal source type buckets

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up public API response review
- Evidence: `/api/home` returned `stats.enabledSourcesByType` with internal source type buckets such as `api`, `rss`, and `google_news_rss`. The frontend mapped these values to labels as a fallback, but the public home JSON still exposed implementation-oriented source type names.
- Fix: Added a public home stats serialization boundary that maps and merges internal source type buckets into `enabledSourceCategories` with Chinese user-facing labels. `LiveHud` now consumes the public category stats fallback when `/api/sources` metadata is still pending.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_home.test.ts src\components\LiveHud.test.tsx` passing 2 files / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, response-contract search confirming `enabledSourcesByType` remains only in the serializer test input/negative assertion outside the public home route/type/HUD, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 48 files / 196 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: The database stats query still uses source types internally; only the public home response contract is narrowed.

### 2026-05-30 - SI-ISSUE-088 - Public article APIs expose internal workflow fields

- Priority: P2
- Status: VERIFIED
- Area: api | security
- Found In: follow-up public API response review
- Evidence: Public article-like responses from `/api/home`, `/api/articles`, `/api/articles/:id`, `/api/companies/:slug`, and `/api/topics/:slug` were returning article rows directly from the DB query layer. That exposed internal workflow fields such as `sourceKey`, `fetchStatus`, `translationStatus`, `translationProvider`, and `storyKey` in public JSON responses.
- Fix: Added a public article serialization boundary for summaries, details, lists, and nested company/topic article collections. Public routes now strip internal workflow fields while preserving user-facing source names, publisher labels, related-source context, tags, companies, original text fields, and launch references.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_articles.test.ts src\utils.test.ts src\pages\ArticleDetailPage.test.tsx` passing 3 files / 25 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, public article route response-boundary searches, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 47 files / 194 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched runtime/test files returning no matches.
- Notes: DB query rows still keep the internal fields for ingestion, clustering, filtering, and compatibility fallback logic; only the public API payload is narrowed.

### 2026-05-30 - SI-ISSUE-087 - Admin unauthorized response uses English copy

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up admin response copy review
- Evidence: Protected admin endpoints returned `{ "error": "Unauthorized" }` when a request was missing a valid bearer token. This is common HTTP wording, but it is inconsistent with the project's Chinese-facing admin/API response copy.
- Fix: Added shared `adminUnauthorizedMessage` with `未授权。` and reused it from `requireAdminRequest`. Updated admin auth tests to assert the localized response copy.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts` passing 1 file / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, search confirming the old `Unauthorized` response copy is gone from admin response implementation, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 46 files / 190 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched admin/health files returning no matches.
- Notes: This keeps the 401 status unchanged and only localizes the response payload.

### 2026-05-30 - SI-ISSUE-086 - Admin missing-source responses expose collector names

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up admin response copy review
- Evidence: SNAPI and Launch Library manual ingestion endpoints returned English missing-source errors that included collector/source implementation names when their configured sources were absent.
- Fix: Added a shared `adminSourceNotConfiguredResponse` helper returning `采集来源未配置。` and reused it from the SNAPI and Launch Library manual ingestion endpoints. Added helper coverage to ensure collector names are not present in the missing-source payload.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts` passing 1 file / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, search confirming the old `SNAPI source is not configured` and `Launch Library 2 source is not configured` response copy is gone, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 46 files / 190 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched admin/health files returning no matches.
- Notes: The endpoints remain protected; this keeps protected API responses consistent with the rest of the Chinese admin response copy.

### 2026-05-30 - SI-ISSUE-085 - Health check payload exposes platform binding names

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up health diagnostics review
- Evidence: `/api/health` returned `bindings.d1` and `bindings.r2` booleans. These are not secrets, but they expose Cloudflare-specific binding implementation terms in a public diagnostic response.
- Fix: Replaced the public health binding block with generic `checks.database` and `checks.assets` fields. Added health API coverage proving the response keeps the useful status checks while avoiding `bindings`, `d1`, and `r2` field names.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\health.test.ts` passing 1 file / 3 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, health field search showing `bindings` / `d1` / `r2` only in negative test assertions, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 46 files / 189 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and focused secret-pattern scan over touched health/ErrorBoundary/ArticleCard files returning no matches.
- Notes: This preserves public health semantics without leaking platform naming details.

### 2026-05-30 - SI-ISSUE-084 - Application error fallback is not announced as an alert

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up accessibility review
- Evidence: The application-level `ErrorBoundary` fallback rendered the user-facing failure message as a plain `.inline-status` block. If a render failure occurs after the page has loaded, assistive technologies may not announce the state change promptly.
- Fix: Extracted the fallback into `ErrorBoundaryFallback` and added `role="alert"` while preserving the existing visible copy and styling. Added component coverage for the alert role and fallback text.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\ErrorBoundary.test.tsx src\App.test.tsx` passing 2 files / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, targeted lint for `src\components\ErrorBoundary.tsx` and `src\components\ErrorBoundary.test.tsx`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 46 files / 188 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, focused secret-pattern scan over touched UI/API files returning no matches, and `rg` confirmation that the fallback renders `role="alert"` with the existing user-facing copy.
- Notes: This only changes the semantic role of the rare render-failure fallback.

### 2026-05-30 - SI-ISSUE-083 - External tab links omit explicit noopener

- Priority: P3
- Status: VERIFIED
- Area: frontend | security
- Found In: follow-up external-link attribute review
- Evidence: External links that open in a new tab used `target="_blank"` with `rel="noreferrer"`. Modern browsers generally imply noopener for noreferrer, but the code did not state that isolation requirement explicitly, making future maintenance easier to weaken.
- Fix: Updated article original links, article detail source links, company websites, topic curation links, and launch source links to use `rel="noopener noreferrer"`. Added component coverage for the article-card external-tab attributes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 5 files / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, search confirming no remaining `rel="noreferrer"` / `target="_blank" rel="noreferrer"` patterns in `src`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 45 files / 187 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a focused secret-pattern scan over touched UI/API files returning no matches.
- Notes: This is a defense-in-depth cleanup and should not change visible UI.

### 2026-05-30 - SI-ISSUE-082 - Health diagnostics expose internal source keys

- Priority: P3
- Status: VERIFIED
- Area: api
- Found In: follow-up health diagnostics review
- Evidence: `/api/health` returned ingestion diagnostics with raw `sourceKey` values such as `google-news-cn-commercial-space` and `demo-rss`. The payload already avoided raw ingestion error text, but these keys are internal source identifiers and can expose implementation naming in a public diagnostic response.
- Fix: Reused configured source display names for health diagnostics and changed latest/recent ingestion log payloads to return `sourceName` instead of `sourceKey`, with unknown sources falling back to `来源`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\health.test.ts` passing 1 file / 2 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 45 files / 186 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, focused secret-pattern scan over touched runtime/test files returning no matches, and focused health response-key search returning no `sourceKey` / raw source-key matches in the health response contract.
- Notes: This preserves operator-readable source context while avoiding raw source identifiers in the public health JSON.

### 2026-05-30 - SI-ISSUE-081 - Admin maintenance endpoints rely on runtime fallback errors

- Priority: P2
- Status: VERIFIED
- Area: api | security
- Found In: follow-up admin maintenance response review
- Evidence: Admin catalog sync, curation sync, entity enrichment, and translation backfill performed their main work without local error handling. A database, config, or upstream failure would escape the handler and rely on the platform fallback response instead of the project's stable admin response/logging pattern.
- Fix: Added a shared admin operation failure response helper that logs raw errors server-side and returns `操作失败，请查看运行日志。` with HTTP 500. Wrapped catalog sync, curation sync, entity enrichment, and translation backfill in local try/catch blocks using the helper.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts` passing 1 file / 4 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, admin catch/response search confirming maintenance and ingestion admin endpoints use local catch helpers, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 45 files / 185 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched runtime/test files returning no matches.
- Notes: This complements `SI-ISSUE-080`: ingestion item-level failures keep their ingestion-shaped payloads, while maintenance operations get a generic operation-failure response.

### 2026-05-30 - SI-ISSUE-080 - Admin ingestion responses expose raw collector errors

- Priority: P2
- Status: VERIFIED
- Area: api | security
- Found In: follow-up admin ingestion response review
- Evidence: Protected admin ingestion endpoints for RSS, Google News RSS, and Launch Library converted caught exceptions into response `error` fields with `error.message` or `String(error)`, while the SNAPI manual ingestion endpoint allowed collector failures to escape its handler. These messages are useful operational diagnostics but can include upstream details, source keys, or future internal paths that should remain in logs rather than API response bodies.
- Fix: Added shared admin error logging and a stable Chinese ingestion-failure response message. RSS, Google News RSS, Launch Library, and SNAPI manual ingestion now log raw exceptions server-side and return `采集失败，请查看运行日志。` in structured failure payloads.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts` passing 1 file / 3 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg "error: error instanceof Error|error\.message|String\(error\)" functions\api\admin -g "*.ts"` returning no matches, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 45 files / 184 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched runtime/test files returning no matches.
- Notes: This keeps the manual ingestion response shape useful for operators while keeping detailed diagnostics in logs and ingestion logs.

### 2026-05-30 - SI-ISSUE-079 - Source catalog failure feedback waits for a retry cycle

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up source-state UX review
- Evidence: `/api/sources` is used for article/policy source filters and homepage source status. The shared query client retries failed queries once by default, so when the source catalog endpoint is unavailable the UI can keep showing a loading source state until the retry cycle finishes instead of promptly showing the source-unavailable state.
- Fix: Added a per-query retry override to the shared API query hook and disabled retries for `useSourcesQuery`, while leaving default retry behavior unchanged for other public queries. Added hook coverage proving the source catalog query uses `retry: false` and the home query still inherits the default retry policy.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\hooks\queries.test.ts src\components\SourceOptions.test.tsx src\components\LiveHud.test.tsx` passing 3 files / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 45 files / 183 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only existing generic governance/history text matched.
- Notes: Source catalog data is metadata used for filters and status labels; quick failure feedback is more useful than delayed retry masking for this query.

### 2026-05-30 - SI-ISSUE-078 - External links render unvalidated URL protocols

- Priority: P2
- Status: VERIFIED
- Area: frontend | security
- Found In: follow-up external-link review
- Evidence: Article original links, company websites, topic curation links, and launch source links render URL fields directly into `<a href>`. These values normally come from source config or ingestion, but if future data contains `javascript:`, `data:`, or another unsafe/non-web protocol, the frontend can render a dangerous or broken external link.
- Fix: Added shared `safeExternalUrl` handling that only allows `http` and `https` URLs, then reused it for article original links, company websites, topic curation links, and launch source links. Unsafe or malformed external URLs are hidden instead of rendered.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\components\ArticleCard.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx` passing 6 files / 36 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 44 files / 181 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, a secret-pattern scan over touched files with only existing generic governance/history text matched, direct `href` search confirming only already-sanitized `curation.safeItemUrl` remains, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5185/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile.
- Notes: The UI should keep valid `http` and `https` links and hide invalid external links rather than exposing raw unsafe protocols.

### 2026-05-30 - SI-ISSUE-077 - Frontend detail links concatenate raw route identifiers

- Priority: P3
- Status: VERIFIED
- Area: frontend | routing
- Found In: follow-up link construction review
- Evidence: Article, company, topic, and launch detail links are built with template strings such as `/companies/${company.slug}` and `/launches/${launch.id || launch.externalId}`. Config slugs are currently route-safe, but some identifiers come from API or external systems; if a future article slug, related entity slug, or launch external id contains spaces, slashes, or query characters, the rendered link can point to the wrong route.
- Fix: Added shared detail route helpers that encode dynamic route segments and reused them across article cards, article detail related links, company/topic index cards, launch list cards, the homepage HUD, and command-palette company/topic entries. Added tests for encoded and simple route identifiers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\routes.test.ts src\components\ArticleCard.test.tsx src\components\LiveHud.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompaniesPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\LaunchesPage.test.tsx` passing 7 files / 25 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 44 files / 175 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, a secret-pattern scan over touched files with only existing generic governance/history text matched, and `rg` verification showing no remaining dynamic detail-link template strings for article/company/topic/launch routes in `src/components` or `src/pages`.
- Notes: Existing simple identifiers should keep the same visible URLs.

### 2026-05-30 - SI-ISSUE-076 - Source filter options hide loading and failure states

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up filter-state review
- Evidence: `SourceOptions` returns only loaded source `<option>` entries. When `/api/sources` is still loading, fails without cached data, or returns no sources for a filtered type set, the article and policy source selectors silently show only `全部来源`, so users cannot tell whether source metadata is pending, unavailable, or genuinely empty.
- Fix: Added disabled source-status options for loading, unavailable, and successful-empty states while preserving normal public source names and badges for loaded options. Added component tests covering all state branches.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\SourceOptions.test.tsx src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx` passing 3 files / 6 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 43 files / 167 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5184/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile, and targeted Playwright checks for article/policy source filter loading and failure options passing desktop/mobile with no horizontal overflow.
- Notes: The change should preserve normal source options and avoid exposing internal source types.

### 2026-05-30 - SI-ISSUE-075 - Detail pages have no visible initial loading state

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up detail page loading-state review
- Evidence: Article, company, topic, and launch detail pages avoid placeholder fields in error states, but when `isLoading` is true and no detail record has loaded yet they render mostly empty page shells with generic titles and little or no body content. This makes an in-flight detail request look like blank content.
- Fix: Added a shared detail skeleton and rendered it on article, company, topic, and launch detail pages while the initial detail request is pending with no loaded record. Added page-level tests for loading states while preserving existing error and loaded-content behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\TopicDetailPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\utils.test.ts` passing 5 files / 27 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 42 files / 163 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5183/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile, and a targeted Playwright loading-layout check for article/company/topic/launch detail pages passing desktop/mobile with no horizontal overflow.
- Notes: Loading-state UI should stay separate from both record-not-found/error copy and successful loaded detail content.

### 2026-05-30 - SI-ISSUE-074 - Company and topic index pages have no visible loading state

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up list page loading-state review
- Evidence: `ArticlesPage`, `PolicyPage`, `HomePage`, and `LaunchesPage` render loading skeletons or pending-state copy while initial requests are running, but `CompaniesPage` and `TopicsPage` only render an empty `.card-grid` when `state.isLoading` is true and no records are loaded. This makes initial loading look like blank content.
- Fix: Added a shared entity grid skeleton and used it on company and topic index pages when initial records are still loading. Added page tests for loading, error-without-empty-state, and successful empty states.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\CompaniesPage.test.tsx src\pages\TopicsPage.test.tsx src\pages\LaunchesPage.test.tsx src\utils.test.ts` passing 4 files / 24 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 41 files / 157 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5182/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile, and a targeted Playwright loading-layout check for `/companies` and `/topics` passing desktop/mobile with no horizontal overflow.
- Notes: This should preserve existing error and successful empty states while giving catalog index pages a visible pending state.

### 2026-05-30 - SI-ISSUE-073 - Frontend article limit handling does not enforce the API cap

- Priority: P3
- Status: VERIFIED
- Area: frontend | api
- Found In: follow-up pagination contract review
- Evidence: Article and policy pages now reject invalid `limit` values, but valid oversized values such as `limit=1000` are still kept in page state, API URLs, and pagination links. The database layer caps article list limits at 50, so the visible URL can imply a much larger page size than the API will actually return.
- Fix: Added bounded positive-integer parsing for frontend article list limits, capped article and policy page `limit` state/API URLs/pagination links at 50, and added utility plus page-level tests for oversized `limit` handling.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\ArticlesPage.test.tsx src\pages\PolicyPage.test.tsx src\App.test.tsx` passing 4 files / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 39 files / 151 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only existing generic governance/history text matched.
- Notes: This should align frontend URL/page behavior with the existing article list backend cap without changing the backend cap.

### 2026-05-30 - SI-ISSUE-072 - Live HUD links fallback launch records to detail pages

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up Live HUD link behavior review
- Evidence: `LaunchesPage` treats `ApiLaunch.isFallback` records as static cards because fallback records may not have a resolvable detail route, but `LiveHud` always renders launch strips as links to `/launches/{id|externalId}`. If fallback launch data appears on the homepage, users can be routed to an unavailable detail page.
- Fix: Changed `LiveHud` launch strips so fallback launch records render as static entries while normal launch records keep their detail links. Added component coverage proving fallback records do not emit `/launches/...` hrefs and normal records still do.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\LiveHud.test.tsx src\App.test.tsx src\pages\LaunchesPage.test.tsx` passing 3 files / 11 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 37 files / 146 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5181/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server, and a secret-pattern scan over touched files with only existing generic token/secret governance notes matched.
- Notes: The homepage HUD should match launch list navigation semantics for fallback records.

### 2026-05-30 - SI-ISSUE-071 - Live HUD loading states render as empty or unavailable states

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up home HUD state review
- Evidence: `LiveHud` renders `暂无发射记录。`, `暂无政策信息。`, or `来源状态暂不可用。` whenever query data is not yet available. During initial loading this makes pending requests look like successful empty results or service failures.
- Fix: Split the Live HUD side panels into distinct loading, failed-without-data, and successful-empty states for launch, policy, and source-status queries. Added component tests covering all three state classes and updated the app SSR assertion to expect the new initial loading copy.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\components\LiveHud.test.tsx src\App.test.tsx src\pages\LaunchesPage.test.tsx` passing 3 files / 10 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 37 files / 145 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5180/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server, and a secret-pattern scan over touched files with only existing generic token/secret governance notes matched.
- Notes: Loading, error, and successful empty states should remain distinct for the homepage side panels.

### 2026-05-30 - SI-ISSUE-070 - Launch list has no visible loading state

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up list page loading-state review
- Evidence: `ArticlesPage`, `PolicyPage`, and `HomePage` render loading skeletons while requests are pending, but `LaunchesPage` renders an empty `.launch-timeline` when `state.isLoading` is true and no launch items are available. This makes initial loading look like an empty or broken list.
- Fix: Added a launch-timeline loading skeleton that matches the launch-card grid shape and only renders while the launch query is loading with no loaded items. Added page tests proving loading, error, and successful empty states stay distinct.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchesPage.test.tsx src\pages\LaunchDetailPage.test.tsx src\utils.test.ts src\App.test.tsx` passing 4 files / 21 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 36 files / 142 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5179/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server, and a secret-pattern scan over touched files with only existing generic token/secret governance notes matched.
- Notes: The loading state should not alter successful loaded results or error/empty-state handling.

### 2026-05-30 - SI-ISSUE-069 - Launch detail error state renders placeholder fields

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up detail page error-state review
- Evidence: `LaunchDetailPage` renders the detail field block even when no launch record is loaded. On API errors it can show placeholder fields such as `发射窗口：记录暂时不可访问` and `火箭型号：未披露`, making an unavailable record look like partially loaded launch data.
- Fix: Changed launch detail rendering so launch fields and source links are shown only after a real launch record is loaded, while the error message and return link remain available in error states. Added page-level tests for 404/no-data and loaded launch detail states.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\LaunchDetailPage.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\utils.test.ts src\App.test.tsx` passing 6 files / 24 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 36 files / 141 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5178/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server, and a secret-pattern scan over touched files with only existing generic token/secret governance notes matched.
- Notes: This mirrors the article detail placeholder cleanup and should preserve loaded launch detail behavior.

### 2026-05-30 - SI-ISSUE-068 - Frontend not-found detection can match non-404 messages

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up frontend error predicate review
- Evidence: `isNotFoundError` currently checks `error.message.includes('404')`. This treats any message containing those digits as a not-found response, so text such as `HTTP 1404` or `upstream 4040` could incorrectly use record-not-found copy instead of transient-error copy.
- Fix: Changed `isNotFoundError` to require a standalone `404` token and added boundary coverage for valid `HTTP 404`, colon/parenthesized 404 messages, and invalid `HTTP 1404` / `4040` messages.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\App.test.tsx` passing 5 files / 22 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 35 files / 139 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only existing generic token/secret governance notes matched.
- Notes: The public API still returns real 404 statuses; this issue is about tightening frontend classification of error messages passed into page state.

### 2026-05-30 - SI-ISSUE-067 - Detail page not-found error mapping is still partially duplicated

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up detail page error review
- Evidence: `friendlyError` centralizes generic frontend error copy, but `TopicDetailPage` and `LaunchDetailPage` still hand-roll `isNotFoundError` branches for detail-page 404 states. Keeping those local branches makes later frontend error-format changes easier to miss.
- Fix: Extended `friendlyError` with an optional not-found message override, reused it from topic and launch detail pages, and kept current user-facing not-found copy unchanged.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\LaunchesPage.test.tsx` passing 5 files / 22 tests, `rg "isNotFoundError\(" src\pages src\utils.ts -n` showing only the shared helper implementation and call, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 35 files / 139 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched.
- Notes: Current topic and launch detail copy is preserved while the duplicated predicate branches are removed.

### 2026-05-30 - SI-ISSUE-066 - Bounded integer normalization is duplicated and floors decimals

- Priority: P3
- Status: VERIFIED
- Area: data | ingestion | maintainability
- Found In: follow-up numeric parameter contract review
- Evidence: After query pagination was tightened, remaining bounded limit handling in `homeQueries`, `retention`, and translation backfill/max-item settings still uses scattered `Math.floor` logic. Decimal inputs such as `3.9` can be silently accepted as `3` in direct callers, and future numeric contract changes would need to be repeated across modules.
- Fix: Added shared `normalizePositiveInteger` and `normalizeBoundedPositiveInteger` helpers in `src/number.ts`, reused them from URL helpers, article/launch/home queries, retention cleanup, and translation limits/backfill, and added tests for decimal rejection and cap handling across those callers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\number.test.ts src\utils.test.ts src\db\articleQueries.test.ts src\db\launchQueries.test.ts src\db\homeQueries.test.ts src\db\retention.test.ts src\translation\backfill.test.ts src\translation\index.test.ts` passing 8 files / 43 tests, `rg "Math\.floor\(|Number\.isFinite\(value\)|Number\.isInteger\(value\)" src -n` showing no remaining scattered value-normalizer matches, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 35 files / 139 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched.
- Notes: Internal bounded limits now follow the same positive-integer contract used by public request and URL parsing.

### 2026-05-30 - SI-ISSUE-065 - DB pagination normalizers still floor decimal values

- Priority: P3
- Status: VERIFIED
- Area: data | api | maintainability
- Found In: follow-up pagination contract review
- Evidence: Public API and frontend URL parsing now reject decimal page/limit values such as `3.9`, but `src/db/articleQueries.ts` and `src/db/launchQueries.ts` still normalize direct `page` and `limit` inputs with `Math.floor(value)`. That allows direct DB-layer callers or tests to silently accept decimals even though the route contract treats them as invalid.
- Fix: Changed article and launch query pagination normalizers to require integer values before accepting `page` or `limit`, and added direct DB-layer tests proving decimal inputs fall back to defaults instead of being floored.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\articleQueries.test.ts src\db\launchQueries.test.ts functions\api\_request.test.ts src\utils.test.ts` passing 4 files / 32 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 33 files / 132 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched.
- Notes: DB query behavior is now aligned with the stricter public request parser and frontend URL parsing contract.

### 2026-05-30 - SI-ISSUE-064 - Article detail error state renders placeholder metadata

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up detail page error-state review
- Evidence: `ArticleDetailPage` renders the detail panel even when no article record is loaded. On API errors it can show placeholder metadata such as `来源暂不可用`, `时间暂不可用`, `地区暂不可用`, and `单来源线索`, and 404-style article detail errors use the same generic unavailable copy as transient failures.
- Fix: Changed article detail to use shared `friendlyError` and render the metadata/summary panel only when a real article record is loaded. Added page-level tests for 404 copy without placeholder metadata and for normal loaded article details.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\ArticleDetailPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\pages\LaunchesPage.test.tsx src\utils.test.ts src\App.test.tsx` passing 5 files / 22 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 33 files / 130 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, secret-pattern scan over touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5177/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server.
- Notes: Article detail now matches the cleaned company/topic/launch detail error-state pattern and avoids presenting placeholder metadata as content.

### 2026-05-30 - SI-ISSUE-063 - List pages can render empty states during load failures

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up page state review
- Evidence: List-style pages such as articles, policy, launches, companies, topics, and home sections check `!isLoading && !items.length` for empty states without considering `state.error`. When a query fails before data is loaded, users can see both an unavailable-data message and an empty-result message, making a transient/API failure look like a real empty dataset.
- Fix: Added shared `shouldShowEmptyState` in `src/utils.ts` and reused it from home, articles, policy, launches, companies, and topics list views. Added helper coverage and representative launch-page tests proving load failures do not render the empty-state copy while successful empty results still do.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\pages\LaunchesPage.test.tsx src\pages\CompanyDetailPage.test.tsx src\App.test.tsx` passing 4 files / 20 tests, search confirming old list-page empty-state guards are gone except detail pages gated by loaded detail data, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 32 files / 128 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, secret-pattern scan over touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:5176/ node scripts\verify-layout.mjs` passing desktop/tablet/mobile against a current-repo Vite server.
- Notes: Empty states now mean a successful empty result, not an API or network error state.


### 2026-05-30 - SI-ISSUE-062 - Company detail error state mixes generic error and empty news copy

- Priority: P3
- Status: VERIFIED
- Area: frontend
- Found In: follow-up detail page error-state review
- Evidence: `CompanyDetailPage` renders `safeLoadMessage('公司详情')` for every error, so a 404 company detail response gets the same generic unavailable copy as transient failures. Because its empty-state guard only checks `!state.isLoading && !related.length`, the error state can also render `暂无相关新闻。` even when no company record was loaded.
- Fix: Changed company detail to use shared `friendlyError` for record-unavailable copy and only render the related-news empty state after a company record is loaded. Added page-level tests for 404 error copy and loaded-record empty related news copy.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\pages\CompanyDetailPage.test.tsx src\App.test.tsx src\utils.test.ts` passing 3 files / 17 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 31 files / 125 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over the touched files with only historical `CLOUDFLARE_API_TOKEN` availability notes matched.
- Notes: Topic, launch, and company detail pages now use record-unavailable copy for 404-style detail errors instead of mixing generic errors with empty list states.

### 2026-05-30 - SI-ISSUE-061 - D1 statement batch fallback is duplicated across DB modules

- Priority: P3
- Status: VERIFIED
- Area: data | maintainability
- Found In: follow-up DB persistence review
- Evidence: `catalog.ts`, `curations.ts`, `launches.ts`, `entityLinks.ts`, and `articles.ts` each define local logic for running prepared statements through `db.batch` with sequential `run()` fallback. That repeats the same D1 compatibility rule across persistence modules and makes future batch behavior changes easier to miss.
- Fix: Added shared `runDbStatements` and `sumRunChanges` helpers in `src/db/statements.ts`, reused them from catalog, curation, launch, entity-link, and article persistence paths, and added direct helper coverage for empty, batch, fallback, and change-count behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\statements.test.ts src\db\catalog.test.ts src\db\curations.test.ts src\db\entityLinks.test.ts src\ingestion\launchIngestion.test.ts src\db\db.test.ts` passing 6 files / 14 tests, `rg "async function runStatements|function runStatements|const runStatements" src\db -n` showing no remaining local helpers, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 30 files / 123 tests, `.\node_modules\.bin\vite.cmd build`, `git diff --check`, and a secret-pattern scan over the touched files with only the historical `CLOUDFLARE_API_TOKEN` availability note matched.
- Notes: This preserves existing batch-first behavior and sequential fallback semantics while reducing duplicate DB infrastructure code.

### 2026-05-30 - SI-ISSUE-060 - Frontend 404 error detection is duplicated

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up frontend error handling review
- Evidence: `friendlyError`, `TopicDetailPage`, and `LaunchDetailPage` each check `error.message.includes('404')` directly. That repeats the frontend not-found detection rule and makes future API error format changes easier to miss.
- Fix: Added shared `isNotFoundError` in `src/utils.ts` and reused it from `friendlyError`, `TopicDetailPage`, and `LaunchDetailPage`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 15 tests, `rg "message\.includes" src -n` showing only the shared helper, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 119 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Page copy should remain unchanged; only the predicate should be centralized.

### 2026-05-30 - SI-ISSUE-059 - Launch page computes the same error message twice

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up frontend page review
- Evidence: `LaunchesPage` calls `friendlyError(state.error, '发射数据')` once to decide whether to render the inline status and then again to render the message. That duplicates page-level error mapping in one render path.
- Fix: Stored the launch page error text in a local `errorMessage` value and reused it for both the condition and rendered message.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\App.test.tsx src\utils.test.ts` passing 2 files / 14 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 118 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should be a behavior-preserving cleanup.

### 2026-05-30 - SI-ISSUE-058 - Page query builders duplicate trimmed parameter loops

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up frontend URL helper review
- Evidence: `PolicyPage` and `LaunchesPage` still manually create `URLSearchParams` and loop over keys with `setTrimmedSearchParam`, even after the shared `trimmedSearchParams` helper was added for article API paths and pagination links. Keeping both patterns makes future URL sanitization changes easier to miss.
- Fix: Reused `trimmedSearchParams` in policy and launch API path builders and removed their local trim loops.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 14 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 118 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should be a behavior-preserving refactor.

### 2026-05-30 - SI-ISSUE-057 - Pagination links preserve invalid limit parameters

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | maintainability
- Found In: follow-up frontend pagination helper review
- Evidence: `SI-ISSUE-056` trimmed and allowlisted pagination query parameters, but `limit` is still copied as plain text. Invalid values such as `limit=3.9`, `limit=0`, or `limit=abc` can remain in article and policy pagination links even though the page and API fall back to the default limit.
- Fix: Added shared `setPositiveIntegerSearchParam` and used it for article and policy pagination links, so invalid `limit` values are dropped while valid positive integers are normalized.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 14 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 118 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should keep pagination URLs aligned with the shared positive-integer contract.

### 2026-05-30 - SI-ISSUE-056 - Pagination links preserve blank and unknown query parameters

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: follow-up frontend URL helper review
- Evidence: Article and policy API path builders trim and drop blank filter values, but pagination href builders clone the raw `URLSearchParams` and only replace `page`. URLs containing blank filters such as `query=+++`, empty source values, or unknown parameters can persist through pagination even though the API request ignores them.
- Fix: Added shared `trimmedSearchParams` helper, reused it for article API paths and article/policy pagination links, and limited pagination hrefs to known non-empty query parameters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 12 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 116 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should keep visible pagination URLs aligned with sanitized API query construction.

### 2026-05-30 - SI-ISSUE-055 - Frontend positive integer parsing accepts decimal values

- Priority: P3
- Status: VERIFIED
- Area: frontend | api | maintainability
- Found In: follow-up URL helper review after backend request parser tightening
- Evidence: Backend `parseOptionalPositiveInteger` now rejects decimal values such as `3.9`, but frontend `parsePositiveInteger` still accepts finite positive decimals and floors them. Article, policy, and launch pages can therefore normalize malformed `page` or `limit` query parameters differently from API routes.
- Fix: Changed frontend `parsePositiveInteger` to require finite integer values greater than zero, matching backend request parsing behavior.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx functions\api\_request.test.ts` passing 3 files / 13 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 114 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should align frontend URL behavior with the public API parser contract.

### 2026-05-30 - SI-ISSUE-054 - Repository curation parser test locks active curations to empty

- Priority: P3
- Status: VERIFIED
- Area: config | tests | maintainability
- Found In: follow-up review after adding repository curation parser coverage
- Evidence: The new repository curation parser test proves current `config/curations.yaml` parses, but it asserts the parsed records equal `[]`. That would make future legitimate editorial curations fail the parser test even when the configuration is valid.
- Fix: Changed the repository curation parser test to assert valid record structure instead of requiring zero active records.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts src\db\curations.test.ts` passing 2 files / 6 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 113 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: The test should validate parser acceptance and record shape without freezing current editorial content volume.

### 2026-05-30 - SI-ISSUE-053 - Repository catalog and curation YAML are not covered by parser tests

- Priority: P3
- Status: VERIFIED
- Area: config | tests | maintainability
- Found In: follow-up test coverage review after config parser hardening
- Evidence: `src/ingestion/ingestion.test.ts` parses the real `config/sources.yaml`, but catalog and curation parser tests only use inline fixtures. After adding stricter slug, target, URL, and normalization rules, regressions in `config/companies.yaml`, `config/topics.yaml`, or `config/curations.yaml` would rely on indirect build/config drift checks rather than direct parser coverage.
- Fix: Added repository YAML parser coverage for `config/companies.yaml`, `config/topics.yaml`, and `config/curations.yaml` in catalog and curation config tests.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\curations\config.test.ts` passing 2 files / 11 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 113 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This is a test coverage improvement; runtime behavior should remain unchanged.

### 2026-05-30 - SI-ISSUE-052 - Empty source list items fail before normalization

- Priority: P3
- Status: VERIFIED
- Area: config | ingestion | data
- Found In: follow-up source config parser review
- Evidence: Source optional lists such as `default_tags`, `default_companies`, `include_terms`, and `exclude_terms` are normalized by trimming and dropping blank values, but their schema uses `z.string().min(1)` before normalization. Explicit empty-string YAML entries therefore fail parsing instead of being handled the same way as whitespace-only entries.
- Fix: Changed optional source list schemas to accept string values before the existing trim/drop/dedupe normalization, so explicit empty strings and whitespace-only entries follow the same path.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 28 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 111 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This is a defensive editor ergonomics fix for source configuration; non-empty values still flow through the existing trim/dedupe normalization.

### 2026-05-30 - SI-ISSUE-051 - Route-safe identifier validation is duplicated across config parsers

- Priority: P3
- Status: VERIFIED
- Area: config | maintainability
- Found In: follow-up review after source/catalog/curation identifier validation
- Evidence: Source keys, catalog slugs, and curation target keys now need the same lowercase hyphen-separated identifier rule, but maintaining separate regex literals and messages in each parser invites drift when future config identifier rules change.
- Fix: Added shared `routeSafeIdentifierSchema` / `routeSafeIdentifierPattern` in `src/config/identifiers.ts` and reused it from source, catalog, and curation config parsers.
- Regression Check: Verified with `rg` showing the route-safe identifier regex only in `src/config/identifiers.ts`, targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\ingestion\ingestion.test.ts src\curations\config.test.ts` passing 3 files / 29 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 111 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This should be a behavior-preserving refactor after `SI-ISSUE-049` and `SI-ISSUE-050`.

### 2026-05-30 - SI-ISSUE-050 - Curation target keys allow route-unsafe characters

- Priority: P3
- Status: VERIFIED
- Area: config | frontend | data
- Found In: follow-up config parser review after identifier validation
- Evidence: Curation `pinned_items.target` and topic curation `topics.slug` values are trimmed but not format-validated before becoming `targetKey` values in configured curation records. Unsafe values such as `Policy Page`, `topic_slug`, or `-topic` can pass parsing and later create inconsistent editorial targets.
- Fix: Added schema-level curation target key validation requiring lowercase letters, numbers, and single hyphen separators after trim normalization.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts src\db\curations.test.ts` passing 2 files / 5 tests, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 111 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Current repository curation config has no active targets, so this should only reject unsafe future editorial edits.

### 2026-05-30 - SI-ISSUE-049 - Config identifiers allow route-unsafe characters

- Priority: P3
- Status: VERIFIED
- Area: config | routing | data
- Found In: follow-up config parser review during optimization pass
- Evidence: Source `key` and catalog company/topic `slug` values are trimmed and checked for non-empty values, but they are used as URL/path identifiers, D1 unique keys, filters, and entity relation keys. Values such as `Rocket_Lab`, `rocket lab`, uppercase keys, or leading/trailing hyphen identifiers can pass parsing and later create route-unsafe or inconsistent records.
- Fix: Added schema-level source key and catalog slug validation requiring lowercase letters, numbers, and single hyphen separators after trim normalization.
- Regression Check: Verified with current config identifier scan showing sources count 60 / bad 0, companies count 23 / bad 0, topics count 7 / bad 0; targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\ingestion\ingestion.test.ts` passing 2 files / 25 tests; `.\node_modules\.bin\tsc.cmd -b --noEmit`; `node scripts\generate-config.mjs --check`; `.\node_modules\.bin\eslint.cmd .`; full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 110 tests; `.\node_modules\.bin\vite.cmd build`; and `git diff --check`.
- Notes: Existing repository config is expected to already use lowercase hyphen-separated identifiers; the fix should reject unsafe future edits without changing current effective config.

### 2026-05-30 - SI-ISSUE-048 - Blank optional catalog URLs fail URL validation

- Priority: P3
- Status: VERIFIED
- Area: config | data | maintainability
- Found In: follow-up review after catalog field trimming
- Evidence: Company `website` and `logo_url` are optional catalog fields, but when a YAML editor leaves them as blank strings, schema parsing trims the value and then validates it as a URL. That rejects a human-edited "not filled in" value instead of normalizing it to the existing empty-string default.
- Fix: Blank optional catalog URL values are now treated as absent before URL validation.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\db\catalog.test.ts src\enrichment\entityMatching.test.ts` passing 3 files / 8 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 108 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This keeps optional URL fields ergonomic while still validating non-empty URLs.

### 2026-05-30 - SI-ISSUE-047 - Curation target fields are not trimmed before duplicate checks

- Priority: P3
- Status: VERIFIED
- Area: config | data | frontend
- Found In: local curation config parser review during optimization pass
- Evidence: Curation `target`, topic `slug`, URL, and note fields are parsed without trim normalization before duplicate target checks. Values like `home-top` and ` home-top ` can become separate pinned targets, and padded notes/URLs make generated editorial config noisier.
- Fix: Trimmed curation target, topic slug, URL, and note fields during config parsing so duplicate target validation runs on normalized values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts src\db\curations.test.ts` passing 2 files / 4 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 107 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing repository curation config is expected to keep the same effective records.

### 2026-05-30 - SI-ISSUE-046 - Source identifier fields are not trimmed before duplicate key checks

- Priority: P3
- Status: VERIFIED
- Area: config | ingestion | data
- Found In: follow-up config parser review after catalog identifier normalization
- Evidence: Source `key`, `name`, `purpose`, `expected_content`, and `dedupe_strategy` fields use raw `z.string().min(1)` parsing. Values like `snapi` and ` snapi ` are treated as distinct keys during duplicate validation, even though they represent the same intended source identifier after normal editing.
- Fix: Trimmed source identifier and descriptive fields at schema parsing time so duplicate key validation runs on normalized values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts functions\api\sources.test.ts` passing 3 files / 28 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 107 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing repository source config is expected to remain unchanged because current source keys are already clean.

### 2026-05-30 - SI-ISSUE-045 - Catalog identifier fields are not trimmed before uniqueness checks

- Priority: P3
- Status: VERIFIED
- Area: config | data | frontend
- Found In: local catalog config parser review during optimization pass
- Evidence: Company and topic `slug` fields use `z.string().min(1)` and are checked for duplicates before any trim normalization. Values like `rocket-lab` and ` rocket-lab ` are treated as distinct slugs even though they would represent the same intended route/entity key after normal user editing.
- Fix: Trimmed catalog identifier and display fields at schema parsing time so duplicate slug validation runs on normalized values.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\db\catalog.test.ts src\enrichment\entityMatching.test.ts` passing 3 files / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 107 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing repository catalog config is expected to remain unchanged because current slugs are already clean.

### 2026-05-30 - SI-ISSUE-044 - Topic keywords are passed through without normalization

- Priority: P3
- Status: VERIFIED
- Area: config | enrichment | data
- Found In: local catalog config review during optimization pass
- Evidence: `parseTopicsConfig` returns `keywords` directly from YAML. Blank or duplicate keywords are filtered defensively during entity matching, but carrying them through the parsed topic config makes relation tuning noisier and adds repeated matching work.
- Fix: Trimmed, dropped blank values, and deduplicated topic keywords during catalog config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts src\enrichment\entityMatching.test.ts src\db\catalog.test.ts` passing 3 files / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 107 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing repository topic config is expected to keep the same effective keyword set.

### 2026-05-30 - SI-ISSUE-043 - Blank-only source lists suppress collector defaults

- Priority: P3
- Status: VERIFIED
- Area: config | ingestion | data
- Found In: follow-up review after source list normalization
- Evidence: `normalizeOptionalList` drops blank values but returns an empty array when every configured value is blank. Collectors use nullish fallback such as `source.include_terms ?? defaultTerms` and `source.default_tags ?? ['policy-and-regulation']`, so a blank-only config list can suppress collector defaults instead of behaving like an absent list.
- Fix: Blank-only optional source lists now normalize to `undefined` while explicitly empty arrays are preserved.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 27 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 107 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This keeps malformed blank-only YAML entries from changing source relevance or default tag behavior.

### 2026-05-30 - SI-ISSUE-042 - Admin endpoint environment types duplicate ADMIN_TOKEN

- Priority: P3
- Status: VERIFIED
- Area: api | maintainability
- Found In: follow-up review after admin authorization helper consolidation
- Evidence: `SI-ISSUE-019` centralized admin Bearer authorization logic in `functions/api/_admin.ts`, but each admin endpoint still declares its own `ADMIN_TOKEN?: string` environment field. Any future admin auth environment change would still require edits across all protected endpoints.
- Fix: Exported a shared `AdminEnv` type from the admin helper and reused it in admin endpoint `Env` definitions.
- Regression Check: Verified with `rg "ADMIN_TOKEN\\?: string" functions\api -n` showing only the shared helper definition, targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts functions\api\_request.test.ts` passing 2 files / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 106 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: This is a type-level maintainability cleanup; runtime authorization behavior should remain unchanged.

### 2026-05-30 - SI-ISSUE-041 - Source include and exclude terms are not normalized

- Priority: P3
- Status: VERIFIED
- Area: config | ingestion | data
- Found In: local source config parser review during optimization pass
- Evidence: `parseSourcesConfig` normalizes `default_tags` and `default_companies`, but leaves `include_terms` and `exclude_terms` as raw config arrays. Whitespace-only filter terms can match broad HTML signal text, and duplicate or padded terms make source relevance tuning harder to reason about.
- Fix: Trimmed, dropped blank values, and deduplicated source include/exclude terms during config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 26 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 106 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This is a defensive parser cleanup; existing repository source config is expected to keep the same effective terms.

### 2026-05-30 - SI-ISSUE-040 - Positive integer query parsing accepts decimal values

- Priority: P3
- Status: VERIFIED
- Area: api | data | maintainability
- Found In: local API request parser review during optimization pass
- Evidence: The shared `parseOptionalPositiveInteger` helper accepts `3.9` and truncates it to `3` even though the route contract treats `page` and `limit` as positive integers. This makes malformed public API query values look valid and can hide caller mistakes.
- Fix: Changed `parseOptionalPositiveInteger` to require finite integer values greater than zero instead of flooring decimal numbers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_request.test.ts src\db\articleQueries.test.ts src\db\launchQueries.test.ts src\db\homeQueries.test.ts` passing 4 files / 22 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 106 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Affects public article, launch, home, and admin backfill limit parsing through the shared request helper.

### 2026-05-30 - SI-ISSUE-039 - Procurement page collector ignores source max_items

- Priority: P3
- Status: VERIFIED
- Area: ingestion | config | maintainability
- Found In: local collector consistency review during optimization pass
- Evidence: RSS and official-page collectors use `source.max_items` to cap per-source output, but `procurementPageCollector` hardcoded a limit of 30. That makes procurement sources less configurable and increases future source tuning cost.
- Fix: Changed `procurementPageCollector` to use `source.max_items ?? 30`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 26 tests, including a procurement fixture with two matching notices capped to one by `max_items`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 106 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Default behavior remains 30 items when a procurement source does not configure `max_items`.

### 2026-05-30 - SI-ISSUE-038 - Source default relation lists are normalized too late

- Priority: P3
- Status: VERIFIED
- Area: config | ingestion | data
- Found In: local ingestion metadata review during optimization pass
- Evidence: `default_tags` and `default_companies` were passed from source config into collector output as-is, and only article persistence later trimmed and deduplicated relation values. That leaves intermediate normalized items carrying redundant or whitespace-only default relation metadata.
- Fix: Normalized source default relation lists in `parseSourcesConfig` by trimming, dropping blank values, and deduplicating while preserving order.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\db\db.test.ts src\ingestion\scheduled.test.ts` passing 3 files / 31 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 106 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing database-level relation sanitization remains as a defensive fallback.

### 2026-05-30 - SI-ISSUE-037 - Source default category mapping is duplicated

- Priority: P3
- Status: VERIFIED
- Area: config | frontend | maintainability
- Found In: follow-up review after source access defaults moved into config parsing
- Evidence: `parseSourcesConfig` and `sourceDisplayMetadata` both maintained a source-type to public-category mapping. Those mappings control the same user-facing source category semantics, so future source-type additions could drift between configuration parsing and display fallback behavior.
- Fix: Added shared `src/sourceMetadata.ts` defaults for public category and domestic access status, then reused them from both source config parsing and source display helpers.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts src\utils.test.ts functions\api\sources.test.ts` passing 3 files / 23 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` finding the source-type public-category mapping only in `src/sourceMetadata.ts`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 105 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Runtime behavior is unchanged; this is a drift-prevention cleanup for source metadata defaults.

### 2026-05-30 - SI-ISSUE-036 - Aggregator prefix cleanup is duplicated across source labels

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: local source-display review during optimization pass
- Evidence: `sourceDisplayName` and `articlePublisherLabel` both duplicated the same `Google News RSS -` / `Google News -` prefix cleanup. This is small but directly touches the user-facing rule that collector implementation terms must not leak into the Chinese site.
- Fix: Added a shared `stripAggregatorPrefix` helper and reused it for source display names and article publisher fallback labels.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts functions\api\sources.test.ts src\db\articleQueries.test.ts` passing 3 files / 15 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` finding the Google News prefix regex only in the shared helper, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 105 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Visible labels are unchanged; the cleanup rule now has one implementation and direct unit coverage.

### 2026-05-30 - SI-ISSUE-035 - Unused source type stats query remains after route optimization

- Priority: P3
- Status: VERIFIED
- Area: api | maintainability
- Found In: follow-up review after `SI-ISSUE-034`
- Evidence: After `/api/sources` started deriving type stats from enabled source rows, `listEnabledSourceTypeStats` and `SourceTypeStatRow` no longer had internal callers. Keeping the old helper makes it easier to reintroduce the redundant D1 query path.
- Fix: Removed the unused source type stats query helper and type.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\sourceQueries.test.ts functions\api\sources.test.ts` passing 2 files / 2 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` finding no remaining `listEnabledSourceTypeStats` or `SourceTypeStatRow` references, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Source API response shape remains covered by `functions/api/sources.test.ts`; only unused internal query code was removed.

### 2026-05-30 - SI-ISSUE-034 - Sources API performs a redundant type-stat query

- Priority: P3
- Status: VERIFIED
- Area: api | performance
- Found In: local API review during optimization pass
- Evidence: `/api/sources` loaded enabled source rows and also queried enabled source type counts. The enabled source rows already include `type`, so the raw `stats` response can be derived without a second D1 read.
- Fix: Removed the separate source-type stat read from the route and derived `stats` from the enabled source list while preserving the public response shape.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts src\db\sourceQueries.test.ts src\utils.test.ts` passing 3 files / 6 tests, including an assertion that the route prepares one DB query, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: The public sources route now derives type stats from the same enabled-source rows; no separate D1 type-stat query is needed.

### 2026-05-30 - SI-ISSUE-033 - Source access metadata defaults only exist in display code

- Priority: P2
- Status: VERIFIED
- Area: config | api | frontend
- Found In: local source-configuration review during optimization pass
- Evidence: Most enabled repository sources did not explicitly carry `public_category`, `access_domestic`, or `access_global` in YAML. `sourceDisplayMetadata` filled UI defaults, but `parseSourcesConfig` returned incomplete source records, which makes future source consumers and new-source validation easier to drift from the domestic/global access labeling requirement.
- Fix: Moved public-category and access-status defaults into `parseSourcesConfig`, so every parsed source gets a public category, domestic access status, and global access status even when YAML omits optional display fields.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\ingestion.test.ts functions\api\sources.test.ts src\utils.test.ts` passing 3 files / 22 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Existing explicit YAML labels still win; defaults are type/region based and preserve the current source API display behavior.

### 2026-05-30 - SI-ISSUE-032 - Duplicate entity match slugs create no-op relation statements

- Priority: P3
- Status: VERIFIED
- Area: data | performance
- Found In: local entity-link optimization pass
- Evidence: `upsertConfiguredEntityLinks` accepted `companySlugs` and `topicSlugs` arrays as-is. If a matcher or future enrichment path returned duplicate slugs for one article, the relation batch would include duplicate `INSERT OR IGNORE` statements that cannot change final data but still cost D1 work.
- Fix: Deduplicated company and topic slugs per article before constructing relation statements.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\entityLinks.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 10 tests, including the duplicate-slug case now batching 2 statements instead of 3, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Result counts and incremental semantics remain unchanged because duplicate relations were already ignored by database constraints.

### 2026-05-30 - SI-ISSUE-031 - Entity link backfill writes article relations one by one

- Priority: P3
- Status: VERIFIED
- Area: data | performance
- Found In: local code review during optimization pass
- Evidence: `upsertConfiguredEntityLinks` looped through every matched company slug and topic slug, awaiting each `INSERT OR IGNORE` separately. Entity enrichment is a bounded maintenance/admin operation and can reduce D1 write round trips by batching relation statements.
- Fix: Built all company and topic relation statements first, executed them through D1 `batch` when available, and kept sequential fallback for adapters without `batch`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\entityLinks.test.ts src\ingestion\scheduled.test.ts` passing 2 files / 10 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\generate-config.mjs --check`, and `git diff --check`.
- Notes: Existing incremental semantics are preserved: the backfill still uses `INSERT OR IGNORE` and does not clear source-default relations.

### 2026-05-30 - SI-ISSUE-030 - Layout verifier still checks retired capital-market copy

- Priority: P2
- Status: VERIFIED
- Area: scripts | frontend
- Found In: local verification-script review during optimization pass
- Evidence: `scripts/verify-layout.mjs` still looked for `不构成投资建议` and reported `capitalNotice` even though the product has moved from capital-market copy to policy pages and policy dynamics.
- Fix: Replaced the retired capital notice assertion with current policy checks: home policy signal and policy page navigation.
- Regression Check: `.\node_modules\.bin\eslint.cmd scripts\verify-layout.mjs` passed, `.\node_modules\.bin\tsc.cmd -b --noEmit` passed, `rg` found no remaining `capitalNotice`, `不构成投资建议`, or `资本` in the verifier, and `PLAYWRIGHT_TARGET_URL=http://127.0.0.1:4177/ node scripts\verify-layout.mjs` passed against a local `vite preview` for desktop, tablet, and mobile.
- Notes: This keeps the verifier aligned with the current product surface instead of an already removed page concept.

### 2026-05-30 - SI-ISSUE-029 - Config generation processes independent files serially

- Priority: P3
- Status: VERIFIED
- Area: scripts | performance
- Found In: local code review during optimization pass
- Evidence: `scripts/generate-config.mjs` processed the four independent YAML/JSON config pairs sequentially. This affects local generation and CI config checks even though the file pairs do not depend on each other.
- Fix: Processed config pairs with `Promise.all` while preserving deterministic output order for check and generate messages.
- Regression Check: Verified with `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd scripts\generate-config.mjs`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Generated JSON content and drift-check semantics are unchanged.

### 2026-05-30 - SI-ISSUE-028 - Catalog sync upserts config records one by one

- Priority: P3
- Status: VERIFIED
- Area: data | performance
- Found In: local code review during optimization pass
- Evidence: `upsertConfiguredSources`, `upsertConfiguredCompanies`, and `upsertConfiguredTags` each looped through config records and awaited every upsert independently. Catalog sync is bounded config data and can reduce D1 round trips by batching statements within each catalog type.
- Fix: Added catalog persistence batching with sequential fallback, preserving the existing sources then companies then topics order while batching records inside each type.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\catalog.test.ts src\catalog\config.test.ts src\db\db.test.ts` passing 3 files / 9 tests, including batch assertions for all three catalog types, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 29 files / 104 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Upsert SQL, configured counts, and change-count aggregation are unchanged.

### 2026-05-30 - SI-ISSUE-027 - Curation replacement inserts configured records one by one

- Priority: P3
- Status: VERIFIED
- Area: data | performance
- Found In: local code review during optimization pass
- Evidence: `replaceConfiguredCurations` deleted old configured curations and then awaited each insert individually. Curation replacement is a bounded config sync operation and can submit insert statements as one batch.
- Fix: Kept the delete step first, then built all insert statements and executed them through D1 `batch` when available, with sequential fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\curations.test.ts src\curations\config.test.ts` passing 2 files / 4 tests, including a one-batch insert assertion, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 28 files / 103 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Insert payloads and replacement semantics are unchanged.

### 2026-05-30 - SI-ISSUE-026 - Curation config allows duplicate target URL records

- Priority: P2
- Status: VERIFIED
- Area: config | data | frontend
- Found In: local code review during optimization pass
- Evidence: `parseCurationsConfig` normalized home highlights, pinned items, and topic curations but did not reject duplicate `{ targetType, targetKey, itemUrl }` combinations. Duplicate records can render repeated editorial items or make curation weight intent unclear after full replacement.
- Fix: Added curation target uniqueness validation during config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\curations\config.test.ts` passing 1 file / 3 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 102 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: The same URL may still appear in different target groups; only duplicate target/url pairs are rejected.

### 2026-05-30 - SI-ISSUE-025 - Company and topic config parsers allow duplicate slugs

- Priority: P2
- Status: VERIFIED
- Area: config | data
- Found In: local code review during optimization pass
- Evidence: Source config already rejects duplicate source keys, but company and topic config parsing did not reject duplicate slugs. Because company/topic slugs are used in URLs, entity matching, filters, and catalog upserts, duplicates can create silent overwrites or ambiguous relations.
- Fix: Added shared slug uniqueness validation to company and topic config parsing.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\catalog\config.test.ts` passing 1 file / 3 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 101 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Existing config passes the stricter validation.

### 2026-05-30 - SI-ISSUE-024 - Launch cache persistence awaits each upsert separately

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data | performance
- Found In: local code review during optimization pass
- Evidence: `persistLaunchRecords` looped over Launch Library records and awaited each `INSERT ... ON CONFLICT DO UPDATE` independently. On D1 deployments this creates unnecessary round trips for a bounded launch cache refresh.
- Fix: Built launch upsert statements for the whole collection and executed them through D1 `batch` when available, with sequential fallback for test/local adapters.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\ingestion\launchIngestion.test.ts src\db\launchQueries.test.ts` passing 2 files / 7 tests, including a two-launch one-batch assertion, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 100 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Upsert SQL and change counting are unchanged.

### 2026-05-30 - SI-ISSUE-023 - Article relation persistence performs separate batches per relation type

- Priority: P3
- Status: VERIFIED
- Area: ingestion | data | performance
- Found In: local code review during optimization pass
- Evidence: After resolving an article id, `persistArticleRecords` linked tags, companies, and launches through three separate helper calls. On D1 deployments with `db.batch`, that can become up to three relation batch round trips per article even though the relation statements are independent.
- Fix: Built tag, company, and launch relation statements first and execute them together through one `runStatements` call per article.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\db.test.ts` passing 1 file / 5 tests, including relation result checks and a batch-size assertion showing one 3-statement relation batch per ingestion run, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 100 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Relation deduplication and INSERT OR IGNORE semantics are unchanged.

### 2026-05-30 - SI-ISSUE-022 - Public detail API 404 responses use English not-found payloads

- Priority: P3
- Status: VERIFIED
- Area: api | frontend
- Found In: local code review during optimization pass
- Evidence: Article, company, topic, and launch detail API routes returned English JSON payloads such as `Article not found`, `Company not found`, `Topic not found`, and `Launch not found` for 404 responses. These are public API payloads for a Chinese information site and did not reuse the shared public error helper.
- Fix: Replaced route-local English 404 payloads with safe Chinese messages through `publicError`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_response.test.ts src\db\articleQueries.test.ts src\db\companyQueries.test.ts src\db\topicQueries.test.ts src\db\launchQueries.test.ts` passing 5 files / 28 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` finding no remaining English not-found payload strings, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 100 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This does not change status codes or expose internal errors.

### 2026-05-30 - SI-ISSUE-021 - Source status fallback can expose internal source type labels

- Priority: P2
- Status: VERIFIED
- Area: frontend
- Found In: local code review during optimization pass
- Evidence: `LiveHud` used `/api/sources` public stats when available, but its fallback path mapped home stats with `{ label: item.type }`. During partial loading or source API failure, the source status panel could show internal labels such as `api`, `rss`, or `google_news_rss`.
- Fix: Added a source type fallback display helper and mapped internal source types to public labels such as data source, professional media, official organization, notice, and source before rendering.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 8 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` confirming no remaining `enabledSourcesByType` raw-type label fallback in UI code, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 99 tests, `.\node_modules\.bin\vite.cmd build`, and `node scripts\verify-layout.mjs` passing desktop/tablet/mobile.
- Notes: This closes a fallback path related to `SI-ISSUE-009`; collector type remains internal data only.

### 2026-05-30 - SI-ISSUE-020 - Translation backfill admin limit parsing accepts invalid finite values

- Priority: P3
- Status: VERIFIED
- Area: api | operations
- Found In: local code review during optimization pass
- Evidence: `/api/admin/translate/backfill` had a route-local `parseLimit` helper that accepted any finite number, including `0` and negative values, instead of using the shared positive integer parsing now used by public list endpoints.
- Fix: Reused the shared `parseOptionalPositiveInteger` helper and removed the route-local parser.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_request.test.ts src\translation\backfill.test.ts` passing 2 files / 5 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` finding no remaining `parseLimit` helper, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 98 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Invalid limit values now fall back to the translation backfill default instead of reaching the worker logic.

### 2026-05-30 - SI-ISSUE-019 - Admin token checks are duplicated and accept non-Bearer authorization values

- Priority: P2
- Status: VERIFIED
- Area: api | security | maintainability
- Found In: local code review during optimization pass
- Evidence: Each admin POST endpoint repeated `ADMIN_TOKEN` extraction and comparison. The duplicated implementation used `authorization.replace(/^Bearer\s+/i, '')`, so a raw Authorization header equal to the token would also pass, and future admin routes could drift from the intended protected-token behavior.
- Fix: Added a shared admin authorization helper, required `Authorization: Bearer ...` for admin requests, trimmed configured/provided token values, and replaced all admin endpoint-local token checks with the shared helper.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_admin.test.ts` passing 1 file / 2 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `rg` confirming no old `providedToken` / `replace(/^Bearer` admin checks remain, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 27 files / 98 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This does not add or expose any token value; `ADMIN_TOKEN` remains an environment secret.

### 2026-05-30 - SI-ISSUE-018 - Detail query slugs are checked with trim but bound untrimmed

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: local code review during optimization pass
- Evidence: `getCompanyBySlug`, `getTopicBySlug`, and `getLaunchByIdOrExternalId` checked whether trimmed path parameters were empty, but then bound the original untrimmed string for database queries. Encoded paths such as `/companies/%20rocket-lab%20` or launch external IDs with accidental spaces could miss valid records.
- Fix: Normalize company slugs, topic slugs, and launch ids/external ids once at query entry and bind the trimmed value.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\companyQueries.test.ts src\db\topicQueries.test.ts src\db\launchQueries.test.ts` passing 3 files / 16 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 26 files / 96 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: Numeric launch ids still bind as numbers; external ids keep internal characters unchanged except leading/trailing whitespace.

### 2026-05-30 - SI-ISSUE-017 - Frontend filter API paths preserve accidental whitespace

- Priority: P3
- Status: VERIFIED
- Area: frontend | maintainability
- Found In: local code review during optimization pass
- Evidence: Article, policy, and launch pages checked `value?.trim()` before adding filters to API query strings, but still inserted the original untrimmed value into `URLSearchParams`. That could produce different React Query keys and API URLs for semantically identical filters such as `source=snapi` and `source=%20snapi%20`.
- Fix: Added a shared frontend search-param helper that trims values before setting them, and reused it in article, policy, and launch API path construction.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\utils.test.ts src\App.test.tsx` passing 2 files / 7 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 26 files / 93 tests, `.\node_modules\.bin\vite.cmd build`, and `node scripts\verify-layout.mjs` passing desktop/tablet/mobile.
- Notes: This complements backend parameter normalization while keeping frontend cache keys and network requests cleaner.

### 2026-05-30 - SI-ISSUE-016 - Public API text filters preserve whitespace and can miss valid records

- Priority: P3
- Status: VERIFIED
- Area: api | data
- Found In: local code review during optimization pass
- Evidence: `/api/articles` passed `region`, `source`, `tag`, `company`, `query`, and `category` directly from `URLSearchParams`, and `/api/launches` did the same for `status`, `provider`, and `query`. Whitespace-only values were sometimes handled by downstream truthiness checks, but values like `source=%20snapi%20` or `provider=%20Rocket%20Lab%20` could become exact database filters with spaces and return empty results.
- Fix: Added shared optional text parsing that trims values and converts empty strings to `undefined`, then reused it in article and launch list routes.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_request.test.ts src\db\articleQueries.test.ts src\db\launchQueries.test.ts` passing 3 files / 17 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 26 files / 91 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This keeps intentional internal spacing such as `Rocket Lab`, while removing accidental leading and trailing whitespace.

### 2026-05-30 - SI-ISSUE-015 - Public API positive integer parsing is duplicated and inconsistent

- Priority: P3
- Status: VERIFIED
- Area: api | maintainability
- Found In: local code review during optimization pass
- Evidence: `/api/articles` and `/api/launches` each had a local `parsePositiveInteger` helper, while `/api/home` parsed `limit` directly with `Number()`. Invalid finite values such as `limit=0` or negative limits could reach `listRankedHomeArticles`, where they were clamped to 1 instead of using the route default.
- Fix: Added shared API request parsing helpers and reused them in home, article list, and launch list routes. Optional `page`/`limit` values now reject invalid, zero, and negative numbers consistently; required `limit` values use an explicit fallback.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\_request.test.ts src\db\articleQueries.test.ts src\db\launchQueries.test.ts src\db\homeQueries.test.ts` passing 4 files / 20 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 26 files / 90 tests, `.\node_modules\.bin\vite.cmd build`, and `git diff --check`.
- Notes: This is a small behavior cleanup for malformed request parameters and removes duplicated route-local parsing code.

### 2026-05-30 - SI-ISSUE-014 - Sources API waits on independent source reads serially

- Priority: P3
- Status: VERIFIED
- Area: api | performance
- Found In: local code review during optimization pass
- Evidence: `/api/sources` loaded enabled source rows first and then loaded enabled source type stats, even though the stats query does not depend on per-source display metadata.
- Fix: Changed the source list and source type stats reads to resolve with `Promise.all`, then derived public category and access summaries from the enabled source list as before.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\sources.test.ts` passing 1 file / 1 test, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 25 files / 88 tests, and `.\node_modules\.bin\vite.cmd build`.
- Notes: This preserves the source display/access metadata contract and only reduces unnecessary API waiting.

### 2026-05-30 - SI-ISSUE-013 - Health diagnostics waits on independent database reads serially

- Priority: P3
- Status: VERIFIED
- Area: api | performance | operations
- Found In: local code review during optimization pass
- Evidence: `/api/health` loaded latest article timestamp, open ingestion-log count, latest successful ingestion timestamp, latest ingestion log, and recent failed ingestion logs one after another even though these diagnostics are independent.
- Fix: Changed health diagnostics to create the independent D1 promises first and resolve them with `Promise.all`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run functions\api\health.test.ts` passing 1 file / 1 test, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 25 files / 88 tests, and `.\node_modules\.bin\vite.cmd build`.
- Notes: This improves operational endpoint latency without changing the public diagnostic payload.

### 2026-05-30 - SI-ISSUE-012 - Topic detail reads recent articles and curations serially

- Priority: P3
- Status: VERIFIED
- Area: api | performance
- Found In: local code review during optimization pass
- Evidence: After `getTopicBySlug` found a topic, it loaded recent tagged articles first and only then loaded enabled topic curations. These result sets are independent after the topic id/slug is known.
- Fix: Wrapped topic article loading, including translation/publisher legacy schema fallback, in a helper and resolved it in parallel with the topic curation query.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\topicQueries.test.ts` passing 1 file / 4 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 25 files / 88 tests, and `.\node_modules\.bin\vite.cmd build`.
- Notes: This is a latency optimization for topic detail APIs; response shape and curation ordering are unchanged.

### 2026-05-30 - SI-ISSUE-011 - Home API waits on independent database reads serially

- Priority: P3
- Status: VERIFIED
- Area: api | performance
- Found In: local code review during optimization pass
- Evidence: `functions/api/home.ts` awaited ranked articles, stats, and trending tags one after another even though those reads do not depend on each other. `src/db/homeQueries.ts` also awaited recent article count, topic count, and enabled-source counts serially inside `getHomeStats`.
- Fix: Changed `/api/home` to resolve article, stats, and trending tag queries with `Promise.all`, and changed `getHomeStats` to resolve its independent D1 statements with `Promise.all`.
- Regression Check: Verified with targeted `.\node_modules\.bin\vitest.cmd run src\db\homeQueries.test.ts` passing 1 file / 4 tests, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` passing 25 files / 88 tests, and `.\node_modules\.bin\vite.cmd build`.
- Notes: This is a latency and maintainability optimization; response shape and ranking behavior are unchanged.

### 2026-05-30 - SI-ISSUE-010 - Article cards do not navigate when users click the card body

- Priority: P2
- Status: VERIFIED
- Area: frontend
- Found In: user report and production browser reproduction
- Evidence: Production check on `https://space.bytebaud.com/` found 12 article cards and 12 title links. Clicking the first card body left the URL unchanged at `/`, while clicking the title link navigated to `/articles/82286`. This made normal "click the news card" behavior feel broken even though the title anchor worked.
- Fix: Made the shared `ArticleCard` navigate to article detail when the non-interactive card body is clicked or focused and activated with Enter. Nested links for region, company, topic, original source, and explicit detail continue to keep their original behavior.
- Regression Check: Verified with `.\node_modules\.bin\tsc.cmd -b --noEmit`, targeted `.\node_modules\.bin\vitest.cmd run src\components\ArticleCard.test.tsx src\App.test.tsx`, full `.\node_modules\.bin\vitest.cmd run` with 25 files / 87 tests, `.\node_modules\.bin\eslint.cmd .`, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, and local Playwright mocked-data click test confirming card-body click navigates from `/` to `/articles/42`.
- Notes: This affects all pages using `ArticleCard`, including home, article list, policy, company detail, and topic detail.

### 2026-05-30 - SI-ISSUE-009 - User-facing source labels expose collector implementation terms

- Priority: P2
- Status: VERIFIED
- Area: frontend | api | ingestion | data
- Found In: user report and local source/UI review
- Evidence: `config/sources.yaml` contained public names like `Google News RSS - 商业航天`; UI surfaces including source filters, article cards, details, and source status could display source names or collector types such as `google_news_rss`, `API 源`, `RSS 源`, or `备用聚合`, which reads like internal implementation rather than a mature Chinese information site. Domestic/global accessibility also had only prose risk notes, not structured display metadata.
- Fix: Added public source category and access-status metadata, normalized Google News-style collector output to preserve original publisher names, sanitized source API/UI labels, and kept collector type as internal routing data.
- Regression Check: Verified with `node scripts\generate-config.mjs --check`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, full `.\node_modules\.bin\vitest.cmd run` with 24 files / 86 tests, `.\node_modules\.bin\vite.cmd build`, `node scripts\verify-layout.mjs`, and local Playwright desktop/mobile checks confirming no `Google News RSS`, `google_news_rss`, `API 源`, `RSS 源`, or `备用聚合` text and no horizontal overflow.
- Notes: Foreign sources remain enabled according to source config; access status is a display and operations signal, not an automatic disable switch.

### 2026-05-30 - SI-ISSUE-008 - Review follow-up for ingestion failures and entity-link consistency

- Priority: P1
- Status: OPEN
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
- Notes: 2026-05-30 public production `/api/launches?limit=5` returned HTTP 200 with five launch records and future/tentative windows including `Soyuz 2.1b | 16 x Rassvet-3`, `Long March 10B | Demo Flight`, and later SpaceX Starlink windows; the protected admin refetch step still requires an admin token before this operational item can be fully closed.

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
- Status: VERIFIED
- Area: api
- Found In: production browser/API check
- Evidence: `https://space.bytebaud.com/` renders shell content, but the homepage article area stays in skeleton/empty state. `/api/home?limit=12`, `/api/articles?limit=5`, `/api/articles/1`, `/api/companies/spacex`, and `/api/topics/satellite-internet` return HTTP 500. Routes not using article summary translation fields, including `/api/launches`, `/api/companies`, `/api/topics`, and `/api/health`, return 200. Chrome page checks confirm `/articles` stays shell-only while launches, companies, and topic list pages render data.
- Fix: Implemented a public API compatibility fallback for article summary queries. The code first uses the current translation-field schema, then retries with legacy-safe selected values when D1 reports missing `original_summary`, `translation_status`, or `translation_provider`. This covers home, article list/detail, company detail, and topic detail queries until the production D1 migration state is guaranteed.
- Regression Check: Local fallback tests passed with `.\node_modules\.bin\vitest.cmd run src/db/articleQueries.test.ts src/db/homeQueries.test.ts src/db/companyQueries.test.ts src/db/topicQueries.test.ts`; full `.\node_modules\.bin\vitest.cmd run`, `.\node_modules\.bin\tsc.cmd -b --noEmit`, `.\node_modules\.bin\eslint.cmd .`, `node scripts\generate-config.mjs --check`, `git diff --check`, and elevated `.\node_modules\.bin\vite.cmd build` passed. On 2026-05-30, public production requests to `/api/home?limit=12`, `/api/articles?limit=5`, `/api/articles/1`, `/api/companies/spacex`, and `/api/topics/satellite-internet` all returned HTTP 200, confirming the user-visible 500 symptom is resolved.
- Notes: The durable database follow-up is still to confirm/apply `migrations/0004_article_translation_fields.sql` on production D1 when Cloudflare credentials are available; the code fallback prevents missing migration state from taking public pages down.

### 2026-05-29 - SI-ISSUE-006 - Production health reports open ingestion logs and recent official-page failures

- Priority: P2
- Status: OPEN
- Area: ingestion
- Found In: production `/api/health` check
- Evidence: `/api/health` returns `openIngestionLogCount: 15` and recent failed source logs for `deepblueaerospace-news`, `changguang-satellite-news`, `cas-space-news`, `landspace-news`, and `orienspace-news`; each recent failed log has `successCount: 0`, `failureCount: 1`, and `hasError: true`.
- Fix: Added legacy D1 insert fallback in `persistArticleRecords` for production databases missing translation columns. This prevents official-page/procurement crawlers from failing after collection when the durable migration has not yet been applied.
- Regression Check: Passed `vitest` targeted DB/ingestion tests, full `vitest`, `tsc -b --noEmit`, `eslint .`, `vite build`, `generate-config --check`, `verify-layout`, and `git diff --check`. Production health recheck on 2026-05-30 still returned HTTP 200 but reported `openIngestionLogCount: 71` and recent failed logs for `cnsa-news`, `sichuan-gov-policy`, `hainan-gov-news`, and `sichuan-gov-news`, so production ingestion health is not yet verified closed.
- Notes: The durable database fix remains applying `0004_article_translation_fields.sql`; this compatibility fix keeps crawler writes working until schema drift is closed, but the production health symptom still needs deployment/window verification.

### 2026-05-29 - SI-ISSUE-007 - Policy page renders empty because policy filters are too narrow

- Priority: P1
- Status: VERIFIED
- Area: api | frontend | ingestion
- Found In: user report and production browser check
- Evidence: `https://space.bytebaud.com/policy` renders successfully but shows `暂无政策信息。`; the API filter only accepts `official_page` articles with `policy-and-regulation`, so policy-tagged procurement and RSS records are excluded, and official-page failures can empty the page.
- Fix: Broadened policy API filtering to all `policy-and-regulation` tagged records and expanded the policy source selector to official pages, procurement pages, and RSS sources.
- Regression Check: Production `/api/articles?tag=policy-and-regulation&limit=5` returned HTTP 200 with existing policy-tagged records on 2026-05-30; local targeted tests, full tests, typecheck, lint, build, config check, layout check, and diff check passed.
- Notes: The fix reuses real source-backed records; no placeholder content was added.

## Historical Review Artifacts

- `docs/REVIEW_REPORT.md`
- `docs/REVIEW_REPORT_ROUND2.md`
- `docs/REVIEW_REPORT_ROUND3.md`
- `docs/REVIEW_REPORT_ROUND4.md`
- `docs/REVIEW_REPORT_ROUND5.md`
- `docs/REVIEW_REPORT_CLOUDFLARE_REBUILD_INGESTION.md`

These files remain useful as evidence and audit history. Current open/closed issue state should be reflected in this ledger.
