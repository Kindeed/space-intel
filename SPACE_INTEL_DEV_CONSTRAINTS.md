# 商业航天全量情报站开发约束文档

## Summary

- 项目目标：建设一个国内外商业航天全量情报网站，覆盖新闻、发射、公司、政策、招投标采购和中文平台热点。
- 当前部署形态：前端、API、D1、R2 和 scheduled Worker 主要运行在 Cloudflare；代码托管、CI 和 PR 审查使用 GitHub。
- 内容策略：自动聚合 + 人工精选；英文内容可以生成中文标题/摘要，但必须保留原文标题和来源链接。
- 进度和问题不在本文件维护：任务状态见 `SPACE_INTEL_TASKS.md`，bug/问题见 `SPACE_INTEL_ISSUES.md`。

## Governance Files

- `AGENTS.md`：代理和贡献者入口规则。
- `SPACE_INTEL_DEV_CONSTRAINTS.md`：稳定约束，只记录长期有效的架构、安全、合规、文件边界和验证要求。
- `SPACE_INTEL_TASKS.md`：任务账本，记录当前计划、里程碑、阻塞项、完成项和开放决策。
- `SPACE_INTEL_ISSUES.md`：问题账本，按时间记录 bug、风险、线上问题、回归检查和关闭依据。
- `docs/REVIEW_REPORT*.md`：历史审查报告。可作为证据来源，但不能替代当前任务或问题状态。

## Platform And Repository

- 代码托管：GitHub 仓库 `Kindeed/space-intel`。
- 分支策略：
  - `main`：生产分支，绑定 Cloudflare Pages 自动部署。
  - `dev`：集成分支，可绑定 Cloudflare Preview。
  - `feature/*` 或 `codex/*`：功能开发分支，通过 PR 合并。
- GitHub 用途：
  - 存放应用代码、Cloudflare 配置、D1 migrations、数据源配置、公司库、专题配置。
  - 使用 Issues 或仓库内任务账本管理任务，使用 Pull Requests 做变更审查。
  - 使用 GitHub Actions 执行类型检查、测试和构建。
  - Cloudflare Pages 绑定 GitHub 仓库，`main` 分支自动部署生产环境。
- 不允许提交：
  - Cloudflare API Token、SSH 私钥、数据库密钥、LLM API Key。
  - X-UI、Vaultwarden、Nezha、订阅链接、私有 UUID、私有服务路径。
- 允许提交 Wrangler 绑定所需的非敏感 Cloudflare 资源标识，例如 D1 `database_id`；这类 ID 不是凭据，不能替代 API Token，也不得与 secret 混放。

## Tech Stack

- 前端：React + Vite + TypeScript。
- 样式：Tailwind CSS。
- 图标：`lucide-react`。
- 后端：Cloudflare Pages Functions 和独立 scheduled Worker。
- 数据库：Cloudflare D1。
- 定时任务：Cloudflare Cron Triggers。
- 对象存储：Cloudflare R2。
- 可选异步能力：Cloudflare Queues。
- 可选长任务能力：Cloudflare Workflows。
- 本地包管理：`pnpm`。
- 测试：Vitest + Playwright 或 Codex Browser Use。
- v1 不引入 PostgreSQL、Celery、Elasticsearch、Selenium、Bright Data 或 Apify 作为必需组件；这些只能作为后续增强或兜底方案。

## Repository Structure

```text
space-intel/
  AGENTS.md
  SPACE_INTEL_DEV_CONSTRAINTS.md
  SPACE_INTEL_TASKS.md
  SPACE_INTEL_ISSUES.md
  src/
  functions/
  migrations/
  config/
    sources.yaml
    companies.yaml
    topics.yaml
    curations.yaml
  scripts/
  docs/
  .github/
    workflows/
      ci.yml
  wrangler.toml
  wrangler.scheduled.toml
```

- `src/`：React 前端源码。
- `functions/`：Cloudflare Pages Functions API。
- `src/ingestion/` 和 scheduled Worker 入口：Cloudflare Cron、采集逻辑、保留策略和维护任务。
- `migrations/`：D1 SQL migrations。
- `config/sources.yaml`：新闻源、RSS、API、官方网页源配置。
- `config/companies.yaml`：商业航天公司库。
- `config/topics.yaml`：专题、标签和关键词配置。
- `config/curations.yaml`：人工精选、首页置顶、专题收录。
- `scripts/`：配置生成、布局验证和辅助检查脚本。
- `docs/`：计划、审查报告、架构说明和历史记录。
- `.github/workflows/ci.yml`：GitHub Actions CI。
- `wrangler.toml` / `wrangler.scheduled.toml`：Cloudflare 资源绑定和 scheduled Worker 配置。

## Cloudflare Architecture

- 当前实现使用 Cloudflare Pages、Pages Functions、Workers、D1、R2、Cron Triggers、Queues、Workflows。
- 新后端能力应先明确是否沿用现有 Cloudflare 体系，或是否需要引入独立服务。
- Hy-MT 1.8B 翻译服务允许作为独立 VPS 微服务接入，但只能接收标题和摘要，必须隔离部署并使用 token 鉴权，不得影响现有服务。
- 引入 VPS worker、RSSHub 自托管、TrendRadar 自托管、nginx、DNS 或 Cloudflare 配置变更前，必须更新任务和问题账本，并再次确认不会影响现有服务。
- 不得影响现有 `pass.bytebaud.com`、`nezha.bytebaud.com`、`xui.bytebaud.com`、`blog.bytebaud.com`、`tle.bytebaud.com`。

## Plugin-Style Source Architecture

- 新增来源必须通过 `config/sources.yaml` 声明，不允许把来源 URL、关键词、地区规则散落硬编码在页面或 API 中。
- v1 可以接入公开 RSS、公开网页列表、公开论坛/社区页面、RSSHub 路由和搜索聚合源；每个来源必须能被配置开关、风险说明和可信度分级管理。
- 每类来源应有独立采集器：SNAPI、Launch Library 2、标准 RSS、官方网页源、采购公告页、Google News RSS 备用源、RSSHub。
- 采集器输出统一 normalized item，再进入去重、翻译 enrich、标签识别、公司匹配和写入流程。
- 新增采集器必须记录来源用途、预期内容类型、失败行为、合规风险和去重策略。
- Google News RSS 中文关键词源默认禁用，只作为国内直连源不足时的备用聚合入口。
- 政策和采购来源优先使用公开官网列表页、公告页、政府采购网、公共资源交易平台、新闻源和原文链接；登录态、验证码、私有接口和逆向接口不得作为 v1 必需依赖，只能作为后续评估项。
- 来源可信度应清晰分级：官方机构和官方采购公告最高，行业组织与行业网站居中，论坛、社区和社媒只作为趋势线索，不得混成官方信息。

## Content And Data Rules

- 英文内容展示中文译题和中文摘要时，必须保留英文原题和原文链接。
- 国内内容优先显示中文原题。
- 社交平台内容只展示摘要、发布时间、来源和原链接。
- 用户可见页面不得暴露内部实现词、调试信息、异常堆栈、secret 名称或开发说明。

## Data Model Boundaries

- `sources`：来源名称、类型、地区、RSS/API 地址、可信等级、启用状态。
- `articles`：标题、原文标题、摘要、URL、来源、发布时间、语言、地区、去重 hash、抓取状态、翻译元数据。
- `companies`：名称、英文名、国家、赛道、官网、简介、股票代码、Logo。
- `article_companies`：文章与公司关联。
- `tags` / `article_tags`：主题标签和文章关联。
- `launches`：Launch Library 2 发射事件缓存。
- `curations`：人工精选、置顶、专题归属、首页权重。
- `ingestion_logs`：抓取时间、来源、成功数量、失败数量、错误信息。
- retention cleanup 只能清理可再生缓存、旧日志和过期元数据；不得破坏当前页面需要的可见内容。

## Public APIs

- `GET /api/home`
- `GET /api/articles`
- `GET /api/articles/:id`
- `GET /api/companies`
- `GET /api/companies/:slug`
- `GET /api/launches`
- `GET /api/launches/:id`
- `GET /api/topics`
- `GET /api/topics/:slug`
- `POST /api/admin/curations`

Admin endpoints must require a protected token or equivalent access control. Public API errors must not expose internal exception details.

## UI And Product Constraints

- 首页、列表、详情、公司、发射、官方、专题页面必须保持信息密集但可读。
- 移动端不得出现文字重叠、按钮溢出、固定宽度破坏布局或长标题撑破容器。
- 页面布局变更必须验证 desktop 和 mobile 视图。
- 本地 API 不可用时可以使用示例数据兜底，但示例数据不得冒充真实新闻、不得包含开发说明或内部备注。

## Reference Projects

参考项目只作为架构、采集、标签、UI 和增强路线输入。不得直接复制代码，除非许可证、来源和实现边界明确允许；也不得绕过安全和现有服务保护约束。

- Spaceflight News API：核心航天新闻源。
- RSSHub：中文平台和机构源聚合参考。
- TrendRadar：中文热点和舆情增强参考。
- Glance：信息密集 dashboard 布局参考。
- Miniflux：RSS 抓取、过滤、阅读器式列表参考。
- AI-Now / feeds.fun / Newspipe：插件化来源、标签、API 和 schema 参考。
- newspaper3k / Trafilatura / Scrapling：后续 VPS enrichment worker 可选正文抽取能力。
- Bright Data MCP、Apify MCP、东方财富/同花顺非官方接口风险较高，只作为后续兜底评估，不作为 v1 依赖。

## Required Verification

Before marking work complete:

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- Relevant tests pass. Use `pnpm test` for ingestion, parsing, deduplication, API, schema, or shared behavior changes.
- `pnpm build` passes when runtime code, UI, bundling, generated config, or deployment behavior changes.
- `pnpm check:config` passes when `config/*.yaml` or generated config artifacts change.
- `pnpm verify:layout` or equivalent browser verification passes when visible UI layout changes.
- New or modified files contain no secrets, private operational paths, subscription links, private UUIDs, or credentials.
- `SPACE_INTEL_TASKS.md` and `SPACE_INTEL_ISSUES.md` reflect task and issue state changes.

## Assumptions

- Production domain defaults to `space.bytebaud.com`.
- v1 does not include user registration, comments, email subscription, or real-time quotes.
- AI summary/translation uses Cloudflare AI Gateway, external LLM API, or the isolated Hy-MT service only after cost, quality, safety, and secret handling are reviewed.
- Domestic social-platform content should use RSSHub/TrendRadar routes before considering high-risk reverse-engineered interfaces.
- All sensitive configuration belongs in GitHub Secrets, Cloudflare Secrets, or local ignored environment files, never in the repository.
