# 商业航天全量情报站任务进度

本文件用于跟踪开发任务状态。发现的 bug、线上问题和回归验证记录放在 `SPACE_INTEL_ISSUES.md`。

## Status Legend

- `TODO`：未开始。
- `IN_PROGRESS`：正在开发。
- `BLOCKED`：被外部条件阻塞。
- `DONE`：已完成并通过必要验证。

## Current Development Plan

更新时间：2026-05-30

当前重点：v1 已具备 React/Vite/TypeScript 前端、Cloudflare Pages Functions API、D1 schema、采集管线、人工精选、首页排序、主要业务页面、Git-backed Pages 部署、scheduled Worker、R2、production ingestion、catalog sync、实体关联、launch cache、Hy-MT 翻译链路和 D1 数据保留策略。当前开发重心从“大功能补齐”转为治理文档清晰化、线上采集质量观察、回归问题闭环和后续增强筛选。

当前任务：

- DONE：审查后采集与数据关系修复已完成。RSS 采集增加明确 User-Agent、默认标签/公司关系和 `max_items` 限制；daily scheduled maintenance 自动执行实体/专题增量 upsert；实体回填不再清空全表；旧 schema 下实体匹配和翻译回填降级处理；前端公司/专题筛选改用 API 数据且配置类查询停止 5 分钟轮询。`generate-config --check`、`tsc -b --noEmit`、`eslint .`、完整 `vitest`、`vite build`、`verify-layout`、`git diff --check` 和运行时代码改动 secret-pattern scan 均已通过。跟踪项见 `SPACE_INTEL_ISSUES.md` 中 `SI-ISSUE-008`。
- DONE：UI 主导航从五栏/六入口收敛为四个主入口，并将公司库、专题追踪降级为次级索引入口；`vitest` 局部测试、`tsc -b --noEmit`、`eslint .`、`vite build`、`verify-layout` 和本地 Playwright desktop/mobile 布局检查均已通过。
- DONE：UI 文案去“情报流/AI 说明味”已完成。主入口改为“资讯”，页面统一移除固定解释副标题，首页移除“聚合商业航天新闻...”说明，右侧“情报索引/配置热词”改为“来源状态”；本地 text/overflow 检查、`verify-layout`、完整测试和 build 均已通过。
- IN_PROGRESS：Launch Library 2 endpoint 已加入明确 User-Agent 且 scheduled Worker 已可部署；继续复跑 production `/api/admin/ingest/launches` 并验证 `/api/launches` 返回未来发射。
- DONE：治理文档整理已完成。已拆分稳定约束、任务账本和问题账本，避免约束文件承担任务流水和 bug 账本职责；`tsc -b --noEmit`、`eslint .`、diff check 和 secret-pattern scan 均已通过。
- IN_PROGRESS：生产文章相关 API 500 已实现旧 schema 兼容兜底，覆盖 `/api/home`、`/api/articles`、文章详情、公司详情和专题详情；待部署后复查生产接口并确认 D1 `0004_article_translation_fields` 迁移状态。跟踪项见 `SPACE_INTEL_ISSUES.md` 中 `SI-ISSUE-005`。
- DONE：已修复政策页为空和采集入库兼容问题。政策页按 `policy-and-regulation` 标签展示官方页、采购页和 RSS 政策记录；采集入库在生产 D1 缺翻译字段时会降级写入旧 schema，避免爬虫抓到内容后整源失败。跟踪项见 `SPACE_INTEL_ISSUES.md` 中 `SI-ISSUE-006` 和 `SI-ISSUE-007`。
- DONE：修复 scheduled ingestion 与 config-first/source-enabled 约束的偏差。`snapi` 和 `launch-library-2` 已尊重 `enabled`，新增 `procurement_page` 公开采购公告源类型和中国政府采购网中央公告源。跟踪项见 `SPACE_INTEL_ISSUES.md` 中 `SI-ISSUE-003` 和 `SI-ISSUE-004`。
- DONE：将“资本”完整替换为“政策”。已移除 market seed/API/schema 路径，新增 `/policy` 页面、政策动态 HUD、地方政府官方政策源、通用 HTML 列表轻爬虫解析能力和 `0005_drop_market_items.sql`；typecheck、lint、test、build、config check、layout 和本地浏览器检查均已通过。
- TODO：继续观察新增 RSS 和官方网页来源的采集质量、重复率和相关性；Google News RSS 仅作为必要时手动启用的备用聚合源。
- TODO：后续大版本依赖升级单独评估，不混入常规 bug 修复或来源维护任务。

最近完成：

- DONE：2026-05-28 data retention cleanup 已完成本地实现。新增 D1 retention cleanup 模块并接入 daily scheduled maintenance；默认保留 article metadata / article relation rows 730 天、ingestion logs 90 天、launch cache 730 天，按 bounded batch 删除；本地 typecheck、lint、test、build、layout、config parity、diff check 和 secret scan 均已通过，待 PR/CI。
- DONE：2026-05-28 Hy-MT 1.8B 翻译接入已合入 main。计划文件为 `docs/TRANSLATION_INTEGRATION_PLAN.md`；实现范围包括自部署 OpenAI-compatible 翻译服务 adapter、文章翻译字段、采集链路翻译 enrich、受保护历史回填 endpoint 和 API 翻译元数据返回。
- DONE：2026-05-28 architecture hardening 已完成并合入。包含 `pnpm generate:config` / `pnpm check:config`、配置漂移检查、scheduled ingestion 有界并发、每日 catalog sync、stale ingestion log maintenance、D1 查询索引、D1 batch 优先写入和 `/api/health` 增强。
- DONE：2026-05-28 production consistency 修复已完成并合入。同步 sources catalog 到 D1、让 `/api/launches` 默认只返回未来发射、清理历史未闭合 ingestion logs，并通过 `main` GitHub Actions verify 与 scheduled Worker deploy。
- DONE：Cloudflare 重建与线上采集问题修复已部署。scheduled ingestion 增加 25 秒单源超时并闭合失败日志；Launch Library 2 改为每 6 小时运行一次以降低 429；`/api/health` 返回最近已闭合日志和 `openIngestionLogCount`。
- DONE：第五轮回归审查已完成。Round 4 用户可见文案、真实标签/公司关系和来源配置修复有效；文章列表聚合分页 `hasMore` 误判、布局验证旧文案断言和 `.claude/` 本地配置忽略已修复。

## Milestones

| Status | Milestone | Acceptance |
| --- | --- | --- |
| DONE | Project Governance baseline | `AGENTS.md`, `SPACE_INTEL_DEV_CONSTRAINTS.md`, `SPACE_INTEL_TASKS.md` exist and define the original governance path. |
| DONE | Governance split | Stable constraints, task ledger, and issue ledger have separate responsibilities. |
| DONE | GitHub And Cloudflare Setup | Public repository, protected branches, Git-backed Pages, production domain, D1, R2, Pages secret, and scheduled Worker deploy path are configured. |
| DONE | Project Skeleton | React/Vite/TypeScript app, Tailwind, Wrangler configs, CI, and layout verification path are available. |
| DONE | Architecture Guardrails | Reference review, plugin-style source interface, optional VPS enrichment boundary, and current architecture notes are documented. |
| DONE | Data Foundation | D1 schema, source/company/topic/curation configs, generated config checks, and catalog sync are implemented. |
| DONE | Ingestion Pipeline | SNAPI, Launch Library 2, RSS, Google News RSS backup, official page ingestion, deduplication, ingestion logs, scheduled ingestion, and retention cleanup exist. |
| DONE | API Layer | Home, article, company, launch, topic, curation, enrichment, seed, and health endpoints exist with protected admin routes where needed. |
| DONE | Frontend Pages | Home, article list/detail, company, launch, policy, and topic pages are implemented with local fallback data where appropriate. |
| DONE | Curation And Editorial Controls | Manual curation loader, protected curation endpoint, ranking rules, and config-backed curated content exist. |
| DONE | Verification And Launch | CI, production Pages, preview deployment, D1/R2 binding checks, responsive layout checks, and existing-service safety checks have passed in prior release work. |

## Open Decisions

| Status | Decision | Default |
| --- | --- | --- |
| DONE | Final GitHub repository visibility | Repository is public as of 2026-05-09, which allowed branch protection on the free GitHub plan. |
| DONE | Final production subdomain | `space.bytebaud.com` is configured as the production Pages custom domain. |
| DONE | AI summary provider | Deferred decision recorded: Cloudflare AI Gateway, external LLM API, or isolated Hy-MT service after cost and quality review. |
| DONE | RSSHub hosting mode | Default decision recorded: public routes first; VPS Docker only when necessary and isolated. |
| DONE | Issue tracking location | Current bug/problem state is tracked in `SPACE_INTEL_ISSUES.md`; review reports are historical evidence. |

## Task Update Rules

- Update this file when starting, completing, blocking, or changing a major task.
- Keep entries short and current. Long investigation details belong in `docs/` or `SPACE_INTEL_ISSUES.md`.
- Do not duplicate full review reports here; link to the relevant report or issue ID.
- Record verification status honestly: passed, blocked, interrupted, timed out, suggested, or unverified.
- If a task discovers a bug, add or update an issue in `SPACE_INTEL_ISSUES.md` instead of burying it in task prose.
