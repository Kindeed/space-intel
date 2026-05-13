# 商业航天全量情报站任务进度

本文件用于跟踪开发进度。开发时应同步更新状态，避免只靠聊天记录管理任务。

状态说明：

- `TODO`：未开始。
- `IN_PROGRESS`：正在开发。
- `BLOCKED`：被外部条件阻塞。
- `DONE`：已完成并通过必要验证。

## Current Development Plan

更新时间：2026-05-13

当前重点：v1 开发、验证和部署已基本完成；Git-backed Pages、D1、R2、Pages secret、首批生产数据、公司/专题 catalog sync、文章实体关联、market seed 和 launch cache 均已有 production 数据验证；剩余 Launch Library 2 endpoint 请求头修正部署后复跑验证。

当前进展：

- DONE：修复首页和发射页体验。已在模块化 Mission Control 前端中补入发射时间线等高展示、中文时间/状态映射、发射详情 404 业务文案、首页“来源透明”文案和左侧统计信息；资本非投资建议提示保留。
- DONE：Mission Control 优化已完成第一版，已降低 Google News 跨关键词重复、增加查询层 story clustering、提供 `/api/sources` 筛选源接口、改造暗色高密度三栏布局与紧凑筛选抽屉；本轮仍坚持不存全文，只展示摘要、要点、元数据和原文链接。
- DONE：Mission Control 前端工程化优化已完成，`App.tsx` 已拆成 types/hooks/components/pages，数据请求升级为 TanStack Query，Command Palette 改用 `cmdk` 并支持快捷键、ESC 和键盘选择，CSS 已抽取暗色主题 design tokens。
- DONE：Frontend route shell 已完成。顶部导航、侧栏、文章详情、公司、发射、资本、专题均有真实路由路径。
- DONE：Mock-backed page skeletons 已完成，并且主要页面已接入 D1-backed API；本地 API 不可用时保留示例数据兜底。
- DONE：D1 persistence layer 已完成第一版，包含 source upsert、article `dedupe_hash` 去重写入、ingestion log 成功/失败记录和测试。
- DONE：受保护 SNAPI ingest endpoint 已添加到 `/api/admin/ingest/snapi`，需要 `ADMIN_TOKEN` Bearer token 才可触发。
- DONE：Article list/detail API 已完成第一版，支持 D1 读取、分页、region/source/query/tag/company 过滤参数和 JSON 错误响应。
- DONE：Company list/detail API 已完成第一版，支持公司档案、文章数量和公司相关新闻时间线查询。
- DONE：Launch list/detail API 已完成第一版，支持发射缓存列表、状态/服务商/关键词过滤、分页和数字 ID 或外部 ID 详情查询。
- DONE：Market API 已完成第一版，支持融资/公告/财报等类型、公司、来源、关键词过滤，并固定返回非投资建议提示。
- DONE：Topic API 已完成第一版，支持专题列表、自动标签文章聚合和人工精选链接查询。
- DONE：Article list page 已接入 `/api/articles` 第一版，支持关键词、来源、标签、公司筛选和分页；本地 API 不可用时保留示例数据兜底。
- DONE：Article detail page 已接入 `/api/articles/:id` 第一版，展示摘要、原文标题/链接、相关公司、相关发射和相关专题；本地 API 不可用时保留示例数据兜底。
- DONE：Company page 已接入 `/api/companies` 和 `/api/companies/:slug` 第一版，展示公司档案、赛道、官网、股票代码和相关新闻时间线；本地 API 不可用时保留示例数据兜底。
- DONE：Launch page 已接入 `/api/launches` 和 `/api/launches/:id` 第一版，展示任务、火箭、发射商、窗口、场站、状态和原始来源；本地 API 不可用时保留示例数据兜底。
- DONE：Capital page 已接入 `/api/market` 第一版，支持类型、公司、来源、关键词筛选，并固定展示非投资建议提示；本地 API 不可用时保留示例数据兜底。
- DONE：Topic page 已接入 `/api/topics` 和 `/api/topics/:slug` 第一版，展示自动标签聚合文章与人工精选链接；本地 API 不可用时保留示例数据兜底。
- DONE：Launch Library 2 ingestion 已完成第一版，支持拉取 upcoming launches、标准化任务/火箭/发射商/窗口/场站/状态并 upsert 到 D1 `launches` 缓存表，受保护触发端点为 `/api/admin/ingest/launches`。
- DONE：RSS ingestion 已完成第一版，支持读取 `type: rss` 配置源、标准化标题/摘要/发布时间/原文链接并写入 D1，受保护批量触发端点为 `/api/admin/ingest/rss`。
- DONE：Google News RSS ingestion 已完成第一版，支持中文关键词 RSS 标题清理、摘要/发布时间/原文入口标准化并写入 D1，受保护批量触发端点为 `/api/admin/ingest/google-news`。
- DONE：Manual curation loader 已完成第一版，支持解析 `config/curations.yaml` 的首页、置顶和专题精选并同步写入 D1 `curations` 表。
- DONE：Protected admin curation endpoint 已完成第一版，`POST /api/admin/curations` 需要 `ADMIN_TOKEN` Bearer token 后才会从配置同步精选记录。
- DONE：Ranking rules 已完成第一版，`/api/home` 按人工精选权重、发布时间、来源可信度排序输出首页信息流。
- DONE：Local scheduled job test 已完成第一版，`runScheduledIngestion` 覆盖小时采集和每日精选同步，测试验证重复运行不会重复写入文章。
- DONE：Reference review notes 已完成，`docs/REFERENCE_REVIEW.md` 记录 Glance、Miniflux、feeds.fun 和 AI/news automation 类项目的可借鉴点与本项目约束边界。
- DONE：GitHub repository `Kindeed/space-intel` 已由用户更新为 public，`main` 和 `dev` 分支已推送，CI workflow 已创建且两个分支的 CI 均通过。
- DONE：GitHub repository visibility 已由用户更新为 public；`main` 和 `dev` 已添加 branch protection，要求 `verify` check 通过、分支最新、PR review 和 conversation resolution。
- DONE：Cloudflare D1 `space_intel` 已创建并执行 `0001_initial_schema.sql` migration；远程 schema 已确认包含 sources、articles、companies、tags、launches、market_items、curations 和 ingestion_logs 等表。
- DONE：新 Git-backed Pages 项目的 `ADMIN_TOKEN` 已配置到 production；token 值只保存在本地 ignored `.dev.vars`，未写入仓库。
- DONE：Production subdomain `space.bytebaud.com` 已添加到 Pages custom domain，并创建 CNAME 到 `space-intel.pages.dev`；当前使用 DNS Only 通过 Pages HTTP validation，健康检查可访问。
- DONE：Git-backed Cloudflare Pages 已接通，`space-intel` 项目显示 `Git Provider: Yes`，production 部署来自 `main`。
- DONE：R2 bucket `space-intel-assets` 已创建。
- DONE：`wrangler.toml` 已新增 `R2_ASSETS` binding，production `/api/health` 已确认 `d1: true`、`r2: true`。
- DONE：Production admin endpoint 1101 已排查并修复：空 `curations.yaml` 注释段解析为 `null` 导致 Zod error，已按空数组处理；Cloudflare global `fetch` 直接传递导致 Illegal invocation，已改为包装函数。
- DONE：The Space Review RSS 旧地址 `tsr.xml` 返回 404，已改为 `https://www.thespacereview.com/articles.xml`；RSS/Google News 批量采集已改为单源失败不拖垮整批。
- DONE：首批生产数据已写入 D1；截至 2026-05-11，`articles` 表有 1185 条，来源包括 Google News RSS、SNAPI、The Space Review、Space.com、ESA 等。
- DONE：Company/topic catalog seed sync 已部署并在 production 执行，`companies` 表有 23 条，`tags` 表有 6 条。
- DONE：Article entity enrichment 已部署并在 production 执行，`/api/admin/enrich/entities` 按公司名称/英文名/独立股票代码 token 和专题关键词重建 `article_companies` 与 `article_tags` 关联。
- DONE：短股票代码误匹配已修复，`PL` 等 ticker 不再匹配普通英文单词片段；production enrichment 已重跑，当前 `article_companies` 44 条、`article_tags` 25 条。
- DONE：Market item seed 实现已合入 `main`，新增受保护 endpoint `/api/admin/market/seed`，从已采集文章元数据中筛选融资、IPO/上市、公告/财报、股价/ETF/概念股等资本市场资讯写入 `market_items`。
- DONE：Market item seed 已在 production 执行并验证，`market_items` 当前 234 条，其中 financing 100、filing 58、market 51、ipo 25。
- DONE：Launch cache 已用 Launch Library 2 upcoming 数据写入 production D1，`launches` 当前 25 条。
- IN_PROGRESS：Launch Library 2 endpoint 已定位到默认请求头触发 HTTP 429 的风险，采集器已加入明确 User-Agent；待部署后通过 `/api/admin/ingest/launches` 复跑验证。
- DONE：Source configuration expanded to 37 total sources / 35 enabled sources, including additional verified RSS sources and Chinese Google News topic feeds.
- DONE：Existing service safety 已确认，本轮开发只改项目仓库文件，没有改动 VPS、DNS、nginx 或 `pass/nezha/xui/blog/tle` 现有服务配置。

计划顺序：

1. Frontend route shell：顶部导航、侧栏、文章、公司、发射、资本、专题都能跳转到真实页面路径。
2. Mock-backed page skeletons：文章列表、详情、公司、发射、资本、专题页面先用本地 mock 数据可用。
3. D1 persistence layer：为 `sources`、`articles`、`ingestion_logs` 增加类型安全写入函数。
4. SNAPI ingestion write path：把 `spaceflightNewsCollector` 输出的 normalized item 写入 D1。
5. Deduplication integration：使用 `dedupe_hash` + `INSERT OR IGNORE` 或等价 upsert 策略保证重复运行不重复写入。
6. Ingestion logs：每个 source run 记录开始时间、完成时间、成功数、失败数和错误信息。
7. Local integration tests：用 D1-compatible mock 或 isolated persistence tests 覆盖文章写入、重复写入和日志记录。
8. API seed path：在 `/api/articles` 前，先准备可复用 query 层，供前端和 API 共用。

约束提醒：

- 只保存标题、摘要、元数据、标签、关联实体和原文链接，不保存全文。
- 不接入任何 secrets，不改 Cloudflare DNS/VPS/nginx/现有服务。
- 真实 D1 `database_id` 已写入 `wrangler.toml`，生产 D1/R2 绑定已验证。

## Milestone 0: Project Governance

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Create development constraints document | `SPACE_INTEL_DEV_CONSTRAINTS.md` exists and covers architecture, tools, layout, data, GitHub, testing, and safety constraints. |
| DONE | Create agent rules | `AGENTS.md` exists and points agents to the constraints and task tracker. |
| DONE | Create progress tracker | `SPACE_INTEL_TASKS.md` exists and defines milestones, statuses, and acceptance criteria. |

## Milestone 1: GitHub And Cloudflare Setup

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Create GitHub repository | Public repository `Kindeed/space-intel` exists with `main` and `dev` branches pushed. |
| DONE | Add repository protection rules | `main` and `dev` require the `verify` check, up-to-date branch, pull request review, conversation resolution, no force pushes, and no branch deletion. |
| DONE | Connect Cloudflare Pages to GitHub | Pages project `space-intel` shows `Git Provider: Yes`; production deployment is sourced from `main`. |
| DONE | Reserve production subdomain | `space.bytebaud.com` resolves to the Pages project and `/api/health` responds successfully. |
| DONE | Configure Pages Secrets | `ADMIN_TOKEN` is configured for the Git-backed Cloudflare Pages production environment; the value is kept out of Git. |

## Milestone 2: Project Skeleton

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Initialize React/Vite/TypeScript app | App runs locally and builds successfully. |
| DONE | Configure Tailwind and base UI tokens | Layout has usable typography, spacing, responsive constraints, and no one-note color palette. |
| DONE | Add Wrangler config | Workers/Pages config includes D1, R2, and Cron placeholders. |
| DONE | Add GitHub Actions CI | CI runs install, typecheck, lint, test, and build. |
| DONE | Add basic Playwright or Browser Use verification path | Desktop and mobile views can be checked reliably. |

## Milestone 2.5: Reference Review And Architecture Guardrails

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Review AI-Now, feeds.fun, Miniflux, and Glance | Produce short notes on source plugin architecture, AI tagging, RSS behavior, and Dashboard layout ideas without copying code. |
| DONE | Design plugin-style source interface | New sources can be added via config plus an isolated collector, without hardcoding source-specific logic in UI components. |
| DONE | Define optional Python enrichment spike | Document what would justify a VPS/Python worker and confirm it is non-blocking for v1. |

## Milestone 3: Data Foundation

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Create D1 schema migrations | Tables exist for sources, articles, companies, tags, launches, market items, curations, and ingestion logs. |
| DONE | Create source config | `config/sources.yaml` includes at least initial international, domestic, launch, policy, and capital sources. |
| DONE | Create company config | `config/companies.yaml` includes initial domestic and international company libraries. |
| DONE | Create topic config | `config/topics.yaml` includes launch, satellite, policy, capital, company, and technology tags. |
| DONE | Create curation config | `config/curations.yaml` supports home highlights, pinned items, and topic membership. |

## Milestone 4: Ingestion Pipeline

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Implement Spaceflight News API ingestion | Articles are fetched, normalized, deduplicated, and stored. |
| DONE | Implement Launch Library 2 ingestion | Upcoming launches and related event metadata are cached. |
| DONE | Implement RSS ingestion | RSS feeds are fetched from configured sources and normalized. |
| DONE | Implement Google News RSS ingestion | Chinese keyword feeds are fetched and categorized. |
| DONE | Implement deduplication | Repeated runs do not create duplicate articles. |
| DONE | Implement ingestion logs | Each run records success count, failure count, source, and error details. |

## Milestone 5: API Layer

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Implement article list API | Supports region, source, tag, company, query, and pagination filters. |
| DONE | Implement article detail API | Returns translated title/summary, original title/link, tags, companies, and related launches. |
| DONE | Implement company APIs | Company list and detail pages can query news timeline and metadata. |
| DONE | Implement launch API | Upcoming launches can be listed and related to articles. |
| DONE | Implement market API | Financing, listed-company, report, and announcement items can be listed. |
| DONE | Implement topic API | Topic pages can combine automatic tags and manual curation. |

## Milestone 6: Frontend Pages

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Build home page | Shows highlights, domestic, international, launch, company, capital, policy, trends, and source status sections. |
| DONE | Build article list page | Filters and pagination work on desktop and mobile. |
| DONE | Build article detail page | Summary, original source, related companies, related launches, and related topics display correctly. |
| DONE | Build company page | Company profile, timeline, capital items, and related launches are usable. |
| DONE | Build launch page | Calendar/list views show mission, rocket, provider, time, place, status, and related reporting. |
| DONE | Build capital page | Financing, public-company dynamics, chain companies, reports, and non-investment-advice notice are visible. |
| DONE | Build topic page | Automatic aggregation and manual curation are both represented. |

## Milestone 7: Curation And Editorial Controls

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Implement manual curation loader | `config/curations.yaml` can control home highlights and topic membership. |
| DONE | Implement protected admin endpoint | Curation changes require Cloudflare Access or a secure admin token. |
| DONE | Implement ranking rules | Home ranking follows manual weight, publish time, and source credibility. |

## Milestone 8: Verification And Launch

| Status | Task | Acceptance |
| --- | --- | --- |
| DONE | Run local scheduled job test | Wrangler scheduled handler runs locally and does not duplicate records. |
| DONE | Run CI successfully | GitHub Actions CI passed on both `main` and `dev`. |
| DONE | Verify responsive layouts | Desktop and mobile screenshots show no text overlap or broken controls. |
| DONE | Deploy preview | Preview deployment works at `https://dev.space-intel.pages.dev` and `https://ce292f24.space-intel.pages.dev`. |
| DONE | Deploy production | Production deployment works at `https://space-intel.pages.dev` with D1 binding. |
| DONE | Confirm existing service safety | Existing `pass`, `nezha`, `xui`, `blog`, and `tle` services are not changed. |

## Open Decisions

| Status | Decision | Default |
| --- | --- | --- |
| DONE | Final GitHub repository visibility | Repository is public as of 2026-05-09, which allowed branch protection on the free GitHub plan. |
| DONE | Final production subdomain | `space.bytebaud.com` is configured as the production Pages custom domain. |
| DONE | AI summary provider | Deferred decision recorded: Cloudflare AI Gateway or external LLM API after cost and quality review. |
| DONE | RSSHub hosting mode | Default decision recorded: public routes first; VPS Docker only when necessary and isolated. |
