# Hy-MT 1.8B 英文资讯中文翻译接入计划

## Summary

目标是在不保存全文、不破坏现有 API 的前提下，用自部署腾讯混元开源翻译模型 `Hy-MT 1.8B` 将英文标题和摘要翻译为中文展示。系统默认只翻译新采集英文文章；历史数据通过受保护回填接口分批处理。

默认方案：

- 翻译模型：`tencent/Hy-MT2-1.8B` 或其 GGUF 量化版本。
- 部署方式：VPS 上运行 OpenAI-compatible translation service。
- Cloudflare Worker 只调用翻译服务，不在 Worker 内加载模型。
- 失败时原文入库，不阻断采集。

## Key Changes

### 1. 数据库与 API

新增 D1 migration：

- `articles.original_summary TEXT`
- `articles.translation_status TEXT NOT NULL DEFAULT 'skipped'`
- `articles.translation_provider TEXT`
- `articles.translated_at TEXT`
- `articles.translation_error TEXT`

字段语义：

- `title`：展示标题。英文文章翻译成功后存中文。
- `summary`：展示摘要。英文文章翻译成功后存中文。
- `original_title`：原始英文标题，已有字段继续使用。
- `original_summary`：原始英文摘要。
- `translation_status`：`translated | skipped | failed`
- `translation_provider`：第一版固定为 `hy_mt_1_8b`。
- `translation_error`：只保存短错误信息，不保存请求密钥或完整异常堆栈。

API 调整：

- `/api/articles` 和 `/api/articles/:id` 继续返回 `title/summary`，前端无需大改。
- 额外返回 `originalSummary`、`translationStatus`、`translationProvider`。
- 搜索条件扩展为同时查询 `title`、`summary`、`original_title`、`original_summary`。
- 文章详情页保留现有“原文标题”展示逻辑，并在有 `originalSummary` 时展示原文摘要。

### 2. 翻译服务接入

新增 translation adapter：

- Provider 名称：`hy_mt_1_8b`
- 协议：OpenAI-compatible `/v1/chat/completions`
- 环境变量：
  - `TRANSLATION_PROVIDER=hy_mt_1_8b`
  - `TRANSLATION_API_URL=https://<translation-service>/v1/chat/completions`
  - `TRANSLATION_API_TOKEN=<secret>`
  - `TRANSLATION_MODEL=hy-mt-1.8b`
  - `TRANSLATION_ENABLED=true`
  - `TRANSLATION_TIMEOUT_MS=8000`
  - `TRANSLATION_MAX_ITEMS_PER_SOURCE=8`

调用规则：

- 仅处理 `language === 'en'` 的文章。
- 空标题、空摘要、中文内容、未配置翻译环境变量时标记 `skipped`。
- 每个 source 单次采集最多翻译 8 条，避免 scheduled Worker 超时。
- 翻译失败标记 `failed`，但继续保存原始标题/摘要。
- Prompt 要求输出 JSON：`{"title":"中文标题","summary":"中文摘要"}`
- 术语要求：公司名、任务名、火箭型号优先保留或按固定词表翻译，例如 SpaceX、Rocket Lab 保留英文，Starship 译为“星舰”，Falcon 9 译为“猎鹰 9”，Long March 译为“长征”。

### 3. 采集与回填流程

新文章流程：

- collector 仍输出原始 item。
- dedupe hash 仍基于原始标题/URL/rawId，不使用翻译结果。
- `runSourceIngestion` 在 `collectSource` 后、`persistArticleRecords` 前调用翻译 enrich。
- 翻译成功后写入中文 `title/summary`，同时保留 `originalTitle/originalSummary`。

历史回填：

- 新增受保护 endpoint：`POST /api/admin/translate/backfill`
- 使用现有 `ADMIN_TOKEN` Bearer 鉴权。
- 默认每次处理 20 条：
  - `language = 'en'`
  - `translation_status IN ('skipped', 'failed')`
  - 有英文 `title` 或 `summary`
- endpoint 返回处理数量、成功数量、失败数量、跳过数量。
- 不自动大批量跑全库；由管理员多次触发或后续再接 daily batch。

VPS 翻译服务要求：

- 使用 Docker 或 systemd 单独运行，不影响现有 `pass/nezha/xui/blog/tle` 服务。
- 暴露 HTTPS endpoint，必须有 token 鉴权。
- 服务只接收标题和摘要，不接收全文。
- 生产 token 不写入 Git，只配置到 Cloudflare scheduled Worker 和 Pages Functions secrets。

### 4. 文档与任务记录

更新固定文件：

- 创建 `docs/TRANSLATION_INTEGRATION_PLAN.md`，写入本计划。
- 更新 `SPACE_INTEL_TASKS.md`：
  - 增加 Hy-MT 1.8B 翻译接入任务状态。
  - 记录“新采集先翻译，历史数据分批回填”。
- 更新 `docs/INGESTION_ARCHITECTURE.md`：
  - 说明翻译在 ingestion 后、persistence 前执行。
  - 明确 dedupe 使用原始标题/URL。
  - 明确翻译失败不阻断采集。
- 如涉及 VPS 服务，更新 `SPACE_INTEL_DEV_CONSTRAINTS.md` 的 Optional VPS Enrichment Worker 部分，说明该服务只做标题/摘要翻译且必须隔离部署。

## Test Plan

必须新增或更新测试：

- translation adapter：
  - 成功解析 JSON 输出。
  - 非 JSON、空输出、超时、HTTP 500 时返回 failed。
  - 未配置环境变量时 skipped。
- ingestion：
  - 英文文章翻译成功后 `title/summary` 为中文，`originalTitle/originalSummary` 保留英文。
  - 翻译失败不阻断入库。
  - 中文文章不调用翻译服务。
  - dedupe hash 不受翻译结果影响。
- db/API：
  - migration 字段可读写。
  - `/api/articles` 返回新增翻译字段。
  - 搜索覆盖 `original_summary`。
- admin backfill：
  - 需要 `ADMIN_TOKEN`。
  - limit 生效。
  - 成功/失败/跳过计数正确。
- 验证命令：
  - `pnpm typecheck`
  - `pnpm check:config`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - `pnpm verify:layout`
  - secrets 扫描确认没有 token、私有路径或服务密钥进入仓库。

## Assumptions

- 第一版只接入自部署 Hy-MT 1.8B，不接腾讯云付费 API、不接 OpenAI、不接 DeepL。
- 第一版只翻译标题和摘要，不抓取、不保存、不翻译新闻全文。
- 翻译服务已由用户在 VPS 上准备，或由后续执行任务另行部署；仓库侧只实现调用 adapter、数据字段、API 和回填接口。
- `TRANSLATION_API_URL` 和 `TRANSLATION_API_TOKEN` 只通过 Cloudflare Secrets 配置。
- 若翻译服务不可用，站点继续展示英文原文标题/摘要，采集链路不得整体失败。
- 数据保留策略暂不改变：文章继续长期保留；后续可单独增加 retention cleanup。
