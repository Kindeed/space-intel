# Space Intel 项目审查报告

> 审查日期：2026-05-15
> 审查范围：全项目（前端、后端、数据摄取、配置）
> 审查原则：只审查，不修改

---

## 一、网页不会自动拉取最新信息源更新 — **确认存在问题**

### 现状

- `src/hooks/queries.ts:32` — `refetchOnWindowFocus: false`，且**没有任何 `refetchInterval`**（轮询间隔）
- `src/queryClient.ts:7` — `staleTime: 60000`（1分钟），但数据过期后不会自动重新获取，只有用户手动导航/刷新页面时才会重新请求
- **没有 WebSocket、没有 Server-Sent Events、没有定时器**
- **没有 Cloudflare Workers Cron Triggers** 配置 — 在 `wrangler.toml` 中没有 `[triggers]` 或 `crons` 配置

### 摄取流程完全是手动的

- 所有数据摄取通过 `POST /api/admin/ingest/*` 端点触发（见 `functions/api/admin/ingest/rss.ts:9`）
- `src/ingestion/scheduled.ts` 虽然有 `hourly`/`daily` 的调度逻辑，但它只是一个**被导出的函数库**，实际没有被任何 Cron Job 或定时器调用
- 这意味着除非管理员**手动调用管理API**，否则数据库永远不会更新

### 建议修复方向

- 在 `wrangler.toml` 中添加 Cloudflare Cron Triggers，每小时自动调用摄取函数
- 前端添加 `refetchInterval: 300000`（5分钟自动刷新）
- 或考虑使用 WebSocket/SSE 做实时推送

---

## 二、开发者/内部内容暴露在界面上 — **多处存在问题**

### 2.1 错误信息直接暴露给用户

- `src/pages/ArticlesPage.tsx:41` — `错误：{apiState.error.message}` — 直接展示内部错误消息（SQL错误、连接失败等）
- `functions/api/home.ts:14-18` — 500 错误响应包含 `detail: error.message`，将内部异常细节返回给前端

### 2.2 英文开发者术语出现在中文界面

| 文件 | 位置 | 当前内容 | 问题 |
|---|---|---|---|
| `src/pages/HomePage.tsx` | :21 | `kicker="Mission Feed"` | 英文，应为中文 |
| `src/components/LiveHud.tsx` | :17 | `kicker="Live HUD"` | HUD 是游戏/军事术语 |
| `src/components/LiveHud.tsx` | :33 | `kicker="Info Only"` | 英文，风格不统一 |
| `src/components/LiveHud.tsx` | :45 | `kicker="Telemetry"` | 开发者术语 |
| `src/components/LiveHud.tsx` | :58 | `kicker="48H"` | 应使用中文表达 |

### 2.3 离线占位数据包含产品设计备注（严重）

`src/data.ts` 中的离线回退数据大量包含**产品设计文档的备注文字**，而非真实新闻内容：

- :34 — `"英文资讯保留原文标题和来源链接，同时展示中文摘要，便于国内读者快速判断信息价值"` — 这是设计规范说明，不是新闻！
- :17-18 — 来源字段使用 `"国内产业源"`、`"政策源"`、`"资本/公告源"` 等占位符名称
- :45 — `"政策信息进入监管频道，并用标签连接相关产业链公司"` — 同样是设计说明
- :58 — `"资本与公告线索聚合到资本页，便于跟踪订单、融资和上市公司动态"` — 功能描述，不是内容

### 2.4 硬编码的假数据

- `src/components/MissionNav.tsx:24-25` — **"24 条重点线索"**和**"6 条追踪专题"**是硬编码的静态数字，无论实际数据如何都不会变化
- `src/data.ts:139-143` — `sourceStatus` 数据是硬编码的假数据（"API 源: 2, RSS 源: 15, 中文聚合: 11"），应从 API 动态获取

### 2.5 命令面板

- `src/components/SiteHeader.tsx` 中的 `cmdk` 命令面板（⌘K）— 这是开发者工具风格的交互，普通用户不太会用到

### 建议修复方向

- 错误信息改为用户友好的提示，如"数据加载失败，请稍后重试"，不要在 UI 中输出 `error.message`
- API 500 响应移出 `detail` 字段或改为通用消息
- 所有 kicker 统一为中文
- **离线占位数据需要彻底重写**，替换为合理的示例内容或直接显示"暂无数据"
- `MissionNav` 中的统计数据应从 API 动态获取
- 命令面板改为面向用户的搜索功能或移除

---

## 三、"来源透明"等信号卡的作用分析

`src/components/MissionNav.tsx:16-31` 中有两个信号卡：

```tsx
{/* 信号卡 1 */}
<span>来源透明</span>
<strong>摘要、标签、实体与原文链接</strong>
<p>保留来源入口，便于快速回看上下文。</p>

{/* 信号卡 2 */}
<span>今日统计</span>
<strong>24</strong> <em>重点线索</em>
<strong>6</strong> <em>追踪专题</em>
```

### 问题

- **"来源透明"** — 这是一个静态的产品理念声明，描述了平台的设计原则。对于普通用户来说，这段文字没有提供任何可操作的信息，只是占据了侧边栏空间。它更合适放在"关于我们"页面，而不是主导航侧边栏。
- **"今日统计"** — 数字是硬编码的（永远显示 24 和 6），完全不代表实际数据，属于**虚假信息展示**。

### 建议修复方向

- "来源透明"卡片移除或移到关于页面
- "今日统计"改为从 API 动态获取真实数据，若暂不可用则直接移除

---

## 四、政策部分应只放当地政府政策

### 现状问题

| 源 | 类型 | 问题 |
|---|---|---|
| 国家航天局新闻 (cnsa-news) | `official_page` | **没有对应的采集器实现！** `official_page` 类型在 `src/ingestion/collectors/` 中没有对应的采集器，数据从未被采集 |
| 工信部新闻 (miit-news) | `official_page` | 同上，无法采集 |
| 发改委政策 (ndrc-policy) | `official_page` | 同上，无法采集 |
| Google News RSS - 航天政策 | `google_news_rss` | 聚合所有新闻源，不仅限于政府政策，质量不可控 |
| SpaceNews, SpaceWatch, The Space Review | `rss` | 这些是**商业媒体**，不是政府官方来源 |

### 核心问题

1. 三个配置为 `official_page` 类型的中国政府源（CNSA、MIIT、NDRC）**根本没有采集器实现**（`src/ingestion/collectors/` 中只有 `rss.ts`、`spaceflightNews.ts`、`googleNewsRss.ts`、`launchLibrary.ts`、`placeholder.ts`），意味着从未实际采集过政策数据
2. "政策"内容实际上来自 Google News RSS 聚合，混入了大量非政府来源
3. 国际"政策"内容来自商业媒体，不是政府官方来源
4. `config/topics.yaml:23-26` — "政策监管"专题的关键词只有中文，无法匹配英文政策内容

### 建议修复方向

- 为 `official_page` 类型实现网页抓取采集器
- 移除 Google News RSS 中的"航天政策"搜索词，改为直接抓取政府官网
- 将政策源分为"国内政策"（中国政府官网）和"国际政策"（FAA、FCC、ITU 等），只使用官方来源
- 增加 FAA Office of Commercial Space Transportation、FCC Space Bureau、ITU 等国际官方政策来源
- "政策监管"专题增加英文关键词

---

## 五、信息来源太少 — 扩展建议

### 当前来源统计（34个配置，实际可用 29 个）

| 类型 | 数量 | 说明 |
|---|---|---|
| RSS | 15 | 国际航天媒体 |
| Google News RSS | 11 | 中文关键词搜索聚合 |
| API | 2 | SNAPI + Launch Library 2 |
| official_page | 3 | **无法采集（无采集器），实际为 0** |
| capital_filing | 4 | SEC 文件（仅元数据） |
| rsshub | 2 | 已禁用 |

### 建议增加的来源

**国际 RSS 源：**
- Ars Technica Space — https://feeds.arstechnica.com/arstechnica/space
- CNBC Space — https://www.cnbc.com/id/10000113/device/rss/rss.html
- Reuters Aerospace & Defense
- NASA Commercial Crew Blog
- SpaceX 官方更新
- Blue Origin News
- ULA (United Launch Alliance) 新闻
- Arianespace 新闻

**中文信息源：**
- 中国航天科技集团官网新闻
- 中国航天科工集团官网
- 36氪 航天频道 — https://36kr.com/search/articles/航天
- 泰伯网 (taibo.cn) — 航天/地理信息行业媒体
- 卫星与网络 杂志
- 航天爱好者网

**官方政策源：**
- FAA Office of Commercial Space Transportation — https://www.faa.gov/space
- FCC Space Bureau
- 国家国防科工局 (SASTIND)
- 中国载人航天工程网

**API 源：**
- SpaceDevs API 其他端点（Launch Library 已有，可扩展）
- N2YO (卫星追踪 API)
- NASA APIs

**资本市场：**
- 东方财富 航天板块
- 同花顺 航天概念
- CNBC Space Business

---

## 总结优先级

| 优先级 | 问题 | 影响 |
|---|---|---|
| **P0 严重** | 没有自动数据更新机制，数据永远是旧的 | 网站基本不可用 |
| **P0 严重** | 离线占位数据包含开发设计文档备注 | 用户看到开发备注，专业形象受损 |
| **P1 重要** | official_page 采集器缺失，政策源无法工作 | 政策功能完全是空壳 |
| **P1 重要** | 硬编码假数据（24条线索、6个专题） | 误导用户 |
| **P2 一般** | 英文开发者术语暴露在中文界面 | 用户体验差 |
| **P2 一般** | "来源透明"等静态声明卡无功能价值 | 浪费界面空间 |
| **P2 一般** | 错误消息直接暴露内部异常 | 安全隐患 + 体验差 |
| **P3 建议** | 信息源数量有限（实际可用仅29个） | 内容覆盖不足 |

---

> 以上为审查结果，不包含代码修改。请 codex 审阅后决定修改方案。
