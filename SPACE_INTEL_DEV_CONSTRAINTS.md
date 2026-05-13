# 商业航天全量情报站开发约束文档

## Summary

- 项目目标：建设一个国内外商业航天全量情报网站，覆盖新闻、发射、公司、资本市场、政策和中文平台热点。
- v1 策略：Cloudflare 优先部署，GitHub 作为源码、配置、CI、PR 和部署触发中心。
- 内容策略：自动聚合 + 人工精选；英文内容自动生成中文标题/摘要，但保留原文标题和来源链接。
- 版权约束：不全文转载新闻正文，只展示摘要、元数据、标签、相关公司、相关发射和原文链接。

## Development Progress Snapshot

更新时间：2026-05-13

进度主记录文件：`SPACE_INTEL_TASKS.md`。本节只保留约束文件内的高层快照，详细任务状态、里程碑、验收项和阻塞项以 `SPACE_INTEL_TASKS.md` 为准。

当前状态：

- v1 核心开发已基本完成：React/Vite/TypeScript 前端、Cloudflare Pages Functions API、D1 schema、采集管线、人工精选、首页排序和主要业务页面均已有第一版实现。
- 已完成页面：首页、文章列表、文章详情、公司页、发射页、资本页、专题页，均保留本地 API 不可用时的示例数据兜底。
- 已完成 API：`/api/home`、`/api/articles`、`/api/articles/:id`、`/api/companies`、`/api/companies/:slug`、`/api/launches`、`/api/launches/:id`、`/api/market`、`/api/topics`、`/api/topics/:slug`。
- 已完成采集能力：Spaceflight News API、Launch Library 2、标准 RSS、Google News RSS、去重写入、ingestion logs、scheduled ingestion 测试。
- 已完成配置能力：`config/sources.yaml`、`config/companies.yaml`、`config/topics.yaml`、`config/curations.yaml`，以及人工精选同步到 D1。
- 已完成工程化：GitHub repository、`main`/`dev` 分支、branch protection、GitHub Actions CI、Wrangler 配置、D1 migration、本地 typecheck/lint/test/build 流程。
- 已完成部署验证：Cloudflare Pages 项目、Git-backed production 部署、`space.bytebaud.com` Pages custom domain、`/api/health` 可访问。
- 已完成 R2 bucket 创建：`space-intel-assets` 已存在，仓库 `wrangler.toml` 绑定名为 `R2_ASSETS`。
- 已完成 production runtime 验证：`/api/health` 返回 `d1: true`、`r2: true`；`ADMIN_TOKEN` 已配置到 Pages production，secret 值未进入仓库。
- 已完成首批 production ingestion：SNAPI、Google News RSS、RSS 源已写入 D1；截至 2026-05-13，`articles` 表有 1185 条。
- 已完成 production catalog/enrichment：`companies` 表 23 条、`tags` 表 6 条；文章实体关联已重建，当前 `article_companies` 44 条、`article_tags` 25 条。
- 已完成 production market seed：`market_items` 表当前 234 条，其中 financing 100、filing 58、market 51、ipo 25。
- 已完成 production launch cache seed：`launches` 表当前 25 条。
- 已扩充来源配置：`config/sources.yaml` 当前 37 个来源，其中 35 个启用；包含 15 个 RSS 源和 11 个中文 Google News RSS 聚合源。

当前待处理：

- Launch Library 2 protected endpoint 已定位到默认请求头触发 HTTP 429 的风险，采集器已加入明确 User-Agent；待该变更随 Git-backed Pages 部署后复跑验证。

下一步：

- 合并并部署 Launch Library 2 User-Agent 修正后，复跑 `/api/admin/ingest/launches`。
- 继续观察新增 RSS 和 Google News RSS 来源的采集质量、重复率和相关性。
- 保持 `SPACE_INTEL_TASKS.md` 为日常开发进度的唯一详细记录；重大状态变化同步更新本快照。

## Platform And Repository

- 代码托管：GitHub 新建私有或公开仓库，建议仓库名 `space-intel`。
- 分支策略：
  - `main`：生产分支，绑定 Cloudflare Pages 自动部署。
  - `dev`：集成分支，可绑定 Cloudflare Preview。
  - `feature/*`：功能开发分支，通过 PR 合并。
- GitHub 用途：
  - 存放应用代码、Cloudflare 配置、D1 migrations、数据源配置、公司库、专题配置。
  - 使用 Issues 管理任务，使用 Pull Requests 做变更审查。
  - 使用 GitHub Actions 执行类型检查、测试和构建。
  - Cloudflare Pages 绑定 GitHub 仓库，`main` 分支自动部署生产环境。
- 不允许提交：
  - Cloudflare API Token、SSH 私钥、数据库密钥、LLM API Key。
  - X-UI、Vaultwarden、Nezha、订阅链接、UUID、私有服务路径。
  - 任何付费新闻全文或受版权限制的全文内容。

## Tech Stack

- 前端：React + Vite + TypeScript。
- 样式：Tailwind CSS，便于快速构建响应式信息流。
- 图标：`lucide-react`。
- 后端：Cloudflare Workers 或 Pages Functions。
- 数据库：Cloudflare D1。
- 定时任务：Cloudflare Cron Triggers。
- 对象存储：Cloudflare R2。
- 可选异步能力：Cloudflare Queues。
- 可选长任务能力：Cloudflare Workflows。
- 本地包管理：`pnpm`。
- 测试：Vitest + Playwright。
- 开发期浏览器检查：Codex Browser Use 或 Playwright。
- v1 不引入 PostgreSQL、Celery、Elasticsearch、Selenium、Bright Data 或 Apify 作为必需组件；这些只能作为后续增强或兜底方案。

## Reference Projects

以下项目只作为架构、采集、标签、UI 和增强路线参考。不得直接复制代码，除非许可证、来源和实现边界明确允许；也不得绕过 Cloudflare-first、版权、安全和现有服务保护约束。

| 项目 | v1 使用方式 | 可借鉴点 |
| --- | --- | --- |
| Spaceflight News API | 核心数据源 | 航天新闻源聚合、Launch Library 2 关联、来源列表。 |
| RSSHub | v1 来源体系 | 微博、微信公众号、B站、机构官网等中文平台 RSS 桥接。 |
| TrendRadar | v1 预留导入接口 | 中文热点、舆情聚合、AI 翻译、情感分析。 |
| Glance | UI 参考 | 信息密集 Dashboard、Widget 编排、响应式概览布局。 |
| Miniflux | RSS/阅读器参考 | RSS 抓取、过滤、阅读器式列表、全文搜索思路。 |
| AI-Now | 架构参考 | 插件化数据源架构，新增来源应能通过配置和独立采集器接入。 |
| feeds.fun | 架构参考 | AI 标签 Pipeline、评分系统、标签归一化。 |
| Newspipe | API/Schema 参考 | 新闻阅读器 REST API、数据库实体设计。 |
| Finance News Aggregator | 资本页参考 | 多财经 RSS 源 facade 模式，统一资本市场资讯接口。 |
| news-scraper / Proximity / JWST Discovery Hub | 后续 VPS/Python 增强参考 | 复杂爬虫、Celery/PostgreSQL、AI 摘要、成本追踪。 |
| newspaper3k / Trafilatura / Scrapling | 后续正文提取参考 | VPS enrichment worker 可选正文抽取能力；v1 不强依赖。 |
| NewsBlur / Huginn | 概念参考 | 智能训练、自动化 Agent 流程；架构过重，不进入 v1。 |

谨慎使用：

- Bright Data MCP、Apify MCP：成本、合规和复杂度较高，只作为兜底。
- 东方财富/同花顺非官方接口：稳定性和合规风险较高，v1 只聚合公开资讯、公告和原文链接。

## Tool Installation

### Local Tools

```powershell
# Install Node.js 20+ and Git first, then:
npm install -g pnpm
npm install -g wrangler
wrangler login
```

### Project Initialization

```powershell
pnpm create vite space-intel --template react-ts
cd space-intel
pnpm add lucide-react clsx date-fns rss-parser zod
pnpm add -D wrangler @cloudflare/workers-types typescript vitest playwright eslint prettier tailwindcss @tailwindcss/vite
```

### Cloudflare Resources

```powershell
wrangler d1 create space_intel
wrangler r2 bucket create space-intel-assets
```

- Cloudflare Pages 绑定 GitHub 仓库。
- 推荐域名：`space.bytebaud.com`，避免影响现有 `blog/tle/pass/nezha/xui`。
- 所有密钥使用 Cloudflare Secrets、GitHub Secrets 或本地 `.env`，不得进入 Git 仓库。

### Optional Development Tools

- Brave Search MCP：开发期新闻补充搜索，不作为核心生产依赖。
- Playwright MCP：交互式页面测试。
- RSSHub：国内平台 RSS 聚合，必要时 VPS Docker 自托管。
- TrendRadar：中文热点/舆情增强，v1 预留导入接口。
- Apify MCP：后续付费爬虫兜底，不作为 v1 核心依赖。

## Repository Structure

```text
space-intel/
  src/
  functions/ or worker/
  migrations/
  config/
    sources.yaml
    companies.yaml
    topics.yaml
    curations.yaml
  tests/
  .github/
    workflows/
      ci.yml
  wrangler.toml or wrangler.jsonc
```

- `src/`：React 前端源码。
- `functions/` 或 `worker/`：Cloudflare API、Cron、采集逻辑。
- `migrations/`：D1 SQL migrations。
- `config/sources.yaml`：新闻源、RSS、API 源配置。
- `config/companies.yaml`：商业航天公司库。
- `config/topics.yaml`：专题、标签和关键词配置。
- `config/curations.yaml`：人工精选、首页置顶、专题收录。
- `tests/`：单元测试、集成测试。
- `.github/workflows/ci.yml`：GitHub Actions CI。
- `wrangler.toml` 或 `wrangler.jsonc`：Cloudflare 资源绑定、Cron 配置。

## Plugin-Style Source Architecture

- 新增来源必须通过 `config/sources.yaml` 声明，不允许把来源 URL、关键词、地区规则散落硬编码在页面或 API 中。
- 每类来源应有独立采集器：SNAPI、Launch Library 2、标准 RSS、Google News RSS、RSSHub、资本市场资讯。
- 采集器输出统一的 normalized item，再进入去重、标签识别、公司匹配和写入流程。
- 新增采集器必须记录来源用途、预期内容类型、失败行为、合规风险和去重策略。
- 资本市场来源优先使用公开 RSS、公告页、新闻源和原文链接；不得把逆向接口作为 v1 依赖。

## Data Sources

### International News

- Spaceflight News API。
- SpaceNews、NASA Spaceflight、Space.com、SpaceFlightNow、The Space Review 等 RSS。

### Launch And Space Events

- Launch Library 2。

### China News And Policy

- Google News RSS 中文关键词：商业航天、民营火箭、卫星互联网、低空经济、航天融资。
- RSSHub 路由：微博、B站、微信公众号、机构官网。
- 政策源：国家航天局、工信部、发改委、地方政府产业政策页面。

### Capital Market

- 国际公司：Rocket Lab、AST SpaceMobile、Planet Labs、Intuitive Machines、Virgin Galactic 等公开新闻、公告和财报链接。
- 国内公司：航天产业链上市公司公告、融资新闻、政策和研报链接。
- v1 不做实时行情、交易信号或投资建议。

### Initial Company Library

- 国际：SpaceX、Blue Origin、Rocket Lab、Relativity Space、Firefly Aerospace、Sierra Space、Axiom Space、Intuitive Machines、Planet Labs、Maxar、AST SpaceMobile。
- 国内：蓝箭航天、星河动力、天兵科技、东方空间、星际荣耀、深蓝航天、中科宇航、长光卫星、银河航天、时空道宇、微纳星空、九天微星。

## Page Layout

### Home

- 顶部导航：最新、国内、国际、发射、公司、资本、政策、专题、搜索。
- 首屏：左侧“今日重点”，右侧“即将发射”和“资本/融资快讯”。
- 中段：国内商业航天、国际商业航天、政策监管、资本市场四个信息流。
- 底部：公司热度榜、关键词趋势、来源状态。
- 首页可参考 Glance 式信息密集 Dashboard 和 Widget 组合，但必须保持新闻站可读性：标题层级清晰、卡片密度适中、移动端不堆叠过深。

### Article List

- 支持地区、来源、标签、公司、时间、关键词过滤。
- 卡片显示标题、来源、发布时间、地区、标签、相关公司、摘要、原文链接。

### Article Detail

- 展示中文标题、原文标题、来源、时间、相关公司、相关发射、摘要、要点和原文链接。
- 侧栏展示同公司新闻、同主题新闻、相关专题。

### Company Page

- 公司简介、国家/地区、赛道、官网、融资/上市状态。
- 新闻时间线、相关发射、资本动态、关键词趋势。

### Launch Page

- 日历视图 + 列表视图。
- 展示任务、火箭、发射商、时间、地点、状态和相关报道。

### Capital Page

- 分为融资动态、上市公司动态、产业链公司、研报/公告链接。
- 页面固定展示“非投资建议”说明。

### Topic Page

- 初始专题：可回收火箭、卫星互联网、月球商业服务、商业遥感、国内民营火箭、低轨通信。
- 专题内容由标签自动聚合 + 人工精选组成。

## Data Model

- `sources`：来源名称、类型、地区、RSS/API 地址、可信等级、启用状态。
- `articles`：标题、原文标题、摘要、URL、来源、发布时间、语言、地区、去重 hash、抓取状态。
- `companies`：名称、英文名、国家、赛道、官网、简介、股票代码、Logo。
- `article_companies`：文章与公司关联。
- `tags` / `article_tags`：主题标签和文章关联。
- `launches`：Launch Library 2 发射事件缓存。
- `market_items`：融资、公告、财报、股价相关资讯。
- `curations`：人工精选、置顶、专题归属、首页权重。
- `ingestion_logs`：抓取时间、来源、成功数量、失败数量、错误信息。

## Processing Rules

### Hourly Job

- 拉取 SNAPI、Launch Library 2、RSS、Google News RSS。
- 标准化标题、时间、来源、URL。
- 基于 URL、标题相似度、来源生成去重 hash。
- 自动识别地区、语言、公司和主题标签。

### Daily Job

- 生成今日简报、公司热度榜、政策/资本摘要。
- 检查来源失败率并记录异常。

### Content Rules

- 英文内容展示中文译题和中文摘要，保留英文原题和原文链接。
- 国内内容优先显示中文原题。
- 社交平台内容只展示摘要、发布时间、来源和原链接。
- 不全文转载付费或版权内容。

### Curation Rules

- v1 使用 `config/curations.yaml` 或受保护管理接口维护人工精选。
- 首页排序规则：人工权重 > 发布时间 > 来源可信度。

## Optional VPS Enrichment Worker

- Python/FastAPI/PostgreSQL 不是 v1 默认路线，只作为后续增强路径。
- 只有当 Cloudflare Worker 无法稳定完成复杂正文抽取、长链路 AI 处理或高风险页面解析时，才评估 VPS enrichment worker。
- 可选 worker 可使用 `newspaper3k`、`Trafilatura`、`Scrapling`、Celery、PostgreSQL 等工具，但必须与现有 VPS 服务隔离。
- enrichment worker 的输出只能回写摘要、标签、实体、抓取状态和原文链接，不得保存受版权限制的全文。
- 引入 VPS worker 前必须更新本约束文档、任务文件和安全说明。

## Public APIs

- `GET /api/articles`
- `GET /api/articles/:id`
- `GET /api/companies`
- `GET /api/companies/:slug`
- `GET /api/launches`
- `GET /api/market`
- `GET /api/topics/:slug`
- `POST /api/admin/curations`

## GitHub Actions

### Triggers

- push 到 `main`、`dev`。
- PR 指向 `main`、`dev`。

### Required Checks

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Pull Request Requirements

- CI 全绿。
- 不包含 secrets。
- 数据源配置变更必须说明新增来源用途和风险。
- 页面布局变更必须附本地截图或 Playwright 截图。

### Deployment

- Cloudflare Pages 通过 GitHub 集成自动部署。
- `main` 部署生产。
- PR 自动生成 Preview URL。

## Development Steps

1. 建立 GitHub 仓库和项目骨架。
2. 配置 Cloudflare Pages、D1、R2、Wrangler。
3. 实现 D1 schema、迁移、基础 API。
4. 实现 SNAPI、Launch Library 2、RSS、Google News RSS 采集器。
5. 实现首页、新闻列表、详情页、公司页、发射页、资本页、专题页。
6. 加入人工精选配置和首页排序。
7. 加入 GitHub Actions CI 和 Cloudflare 自动部署。
8. 做移动端适配、Playwright 检查、来源状态监控。

## Testing And Acceptance

### Unit Tests

- RSS/API 解析。
- 去重 hash。
- 标签识别。
- 公司匹配。

### Integration Tests

- D1 migration。
- 文章写入。
- 列表查询。
- 详情查询。
- 发射数据同步。

### Page Tests

- 首页、列表、详情、公司、发射、资本、专题页面在桌面和移动端正常显示。
- 中文和英文长标题不溢出。
- 筛选、搜索、分页可用。

### Scheduled Job Tests

- 本地用 Wrangler 触发 scheduled handler。
- 重复运行不产生重复文章。

### Acceptance Criteria

- 至少 20 个可配置来源。
- 首页展示国内、国际、发射、公司、资本、政策六类内容。
- 每小时采集后新内容可出现在页面。
- 英文内容有中文摘要和原文链接。
- 人工精选能控制首页置顶和专题内容。
- GitHub Actions CI 全绿。
- Cloudflare Pages 可从 `main` 自动部署生产站点。

## Security And Compliance

- 不提交任何 secrets、私有订阅链接、私有服务路径或凭据。
- 不影响现有 `pass.bytebaud.com`、`nezha.bytebaud.com`、`xui.bytebaud.com`、`blog.bytebaud.com`、`tle.bytebaud.com`。
- RSSHub/TrendRadar 如需自托管，部署在现有 VPS 的 Docker 中，但必须隔离端口和配置，不影响现有服务。
- 资本市场内容只做资讯聚合，页面必须明确“非投资建议”。
- 新闻内容只展示摘要和链接，不全文转载。

## Assumptions

- 生产域名默认使用 `space.bytebaud.com`。
- v1 不做用户注册、评论、邮件订阅、全文转载、实时行情和交易建议。
- v1 AI 摘要/翻译预留接口，实际接入时优先走 Cloudflare AI Gateway 或外部 LLM API。
- 国内社交平台内容优先通过 RSSHub/TrendRadar 导入，不直接逆向高风险接口。
- 所有敏感配置通过 GitHub Secrets、Cloudflare Secrets 或本地环境变量管理，不进入仓库。
