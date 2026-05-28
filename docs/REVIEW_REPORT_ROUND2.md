# Space Intel 项目审查报告（第二轮）

> 审查日期：2026-05-15
> 审查范围：第一轮审查后修改的 50 个文件
> 审查原则：只审查，不修改

---

## 修改概览

本轮修改覆盖了 50 个文件（+426/-424 行），针对第一轮审查的 P0-P2 问题进行了大量修复。以下逐项核验。

---

## 一、P0 严重问题 — 部分修复，仍有遗留

### ✅ P0-2：离线占位数据包含开发备注 — 已修复

- `src/data.ts` — `highlights` 改为空数组 `[]`
- `src/data.ts` — `upcomingLaunches` 改为空数组 `[]`
- `src/data.ts` — `marketBriefs` 改为空数组 `[]`
- `src/data.ts` — `sourceStatus` 改为空数组 `[]`
- 所有产品设计备注文字已清除

### ❌ P0-1：没有自动数据更新 — 只修了一半

**已做：**
- `src/hooks/queries.ts:16` — 添加了 `autoRefreshInterval = 5 * 60_000`（5分钟前端轮询）
- `src/queryClient.ts:8` — 全局默认 `refetchInterval: 5 * 60_000`
- `src/ingestion/scheduled.ts:60-64` — hourly 调度中加入了 `official_page` 采集

**未做：**
- `wrangler.toml` **仍然没有 `[triggers]` / `crons` 配置** — 这是核心问题！
- 前端每 5 分钟重新请求 API，但如果数据库没有新数据（因为没有自动摄取触发），刷新没有意义
- **后端数据摄取仍然需要管理员手动 POST 到 `/api/admin/ingest/*`**
- 需要添加类似以下配置：
  ```toml
  [triggers]
  crons = ["0 * * * *"]  # 每小时自动摄取
  ```

**结论：这个 P0 问题只修复了前端表象，根因（无自动摄取）仍未解决。**

---

## 二、P1 重要问题 — 大部分已修复

### ✅ P1-1：official_page 采集器缺失 — 已修复

- `src/ingestion/collectors/officialPage.ts` — 全新的官方页面采集器，包含：
  - HTML 链接提取和过滤
  - 航天关键词匹配（中英文）
  - CNSA 源全量不过滤、MIIT/NDRC 按关键词过滤
  - HTML 实体解码、日期提取
- `src/ingestion/index.ts:12` — 导出 `officialPageCollector`
- `src/ingestion/scheduled.ts:5,60-64` — hourly 调度中包含 official_page 采集
- `src/ingestion/ingestion.test.ts:378-430` — 完整单元测试（含 MIIT 过滤测试）
- `config/topics.yaml:25` — "政策监管"关键词增加了 `FAA, FCC, ITU, regulation, policy, spectrum, commercial space transportation`

### ✅ P1-2：硬编码假数据 — 已修复

- `src/components/MissionNav.tsx` — 接受 `stats?: ApiHomeStats` prop
  - 移除了"来源透明"静态信号卡
  - 移除了硬编码的"24"和"6"
  - 从 API 动态获取 `recentArticleCount` 和 `topicCount`
- `src/components/LiveHud.tsx` — 从 API 动态获取发射、市场、来源数据
  - `useLaunchesQuery('/api/launches?limit=4')`
  - `useMarketQuery('/api/market?limit=4')`
  - `useSourcesQuery()`
- 新增类型 `ApiHomeStats`、`ApiHomeResult`、`ApiSourceListResult` in `src/types.ts`
- 新增 `getHomeStats()` in `src/db/homeQueries.ts` — 动态查询近24小时文章数和专题数
- 新增 `listEnabledSources()` / `listEnabledSourceTypeStats()` in `src/db/sourceQueries.ts`
- `functions/api/home.ts` — 返回 `{ items, stats }`
- `functions/api/sources.ts` — 返回 `{ items, stats }`

---

## 三、P2 一般问题 — 全部已修复

### ✅ P2-1：英文开发者术语 — 已修复

| 文件 | 修改前 | 修改后 |
|---|---|---|
| `HomePage.tsx:21` | `kicker="Mission Feed"` | `kicker="实时聚合"` |
| `LiveHud.tsx:52` | `kicker="Live HUD"` | `kicker="实时更新"` |
| `LiveHud.tsx:59` | `kicker="Info Only"` | `kicker="信息聚合"` |
| `LiveHud.tsx:67` | `kicker="Telemetry"` | `kicker="已启用"` |
| `LiveHud.tsx:79` | `kicker="48H"` | `kicker="近期"` |

### ✅ P2-2："来源透明"信号卡 — 已移除

- `MissionNav.tsx` — "来源透明"卡片已删除，只保留动态统计卡

### ✅ P2-3：错误消息暴露内部异常 — 已修复

- 新建 `functions/api/_response.ts` — 统一错误处理
  - `publicError()` 返回通用消息 `"数据暂不可用，请稍后重试。"`
  - `logApiError()` 服务端 console.error 记录详情
- 所有 12 个 API 端点统一使用 `logApiError() + publicError()` 模式
- 所有页面使用 `safeLoadMessage()` 替代直接展示 `error.message`
- `src/utils.ts:137-139` — `safeLoadMessage()` 返回通用提示

---

## 四、第二轮新发现的问题

### 问题 1（P1）：ArticleDetailPage 仍包含开发说明文字

`src/pages/ArticleDetailPage.tsx:36-39`：
```tsx
<div className="insight-list">
  <strong>核心要点</strong>
  <span>只展示摘要和元数据，避免全文转载。</span>
  <span>实体、标签和发射关系用于快速判断线索价值。</span>
  <span>需要完整上下文时跳转原文来源。</span>
</div>
```
这是**产品设计原则说明**，不是文章的实际内容。当用户查看任何文章详情时，都会看到这三个固定的设计备注冒充"核心要点"。应该移除或替换为从数据中提取的真实要点。

### 问题 2（P1）：CRON 调度配置缺失

`wrangler.toml` 中没有配置 `[triggers]` / `crons`。前端每 5 分钟自动请求 API，但如果后端数据库从不上新数据，轮询毫无意义。`src/ingestion/scheduled.ts` 的 `runScheduledIngestion()` 函数已完善但没有被任何定时任务调用。

### 问题 3（P2）：热力词仍为硬编码

`src/data.ts:29`：
```ts
export const trendTags = ['可回收火箭', '卫星互联网', '商业遥感', '月球商业服务', '低轨通信', '政策监管'];
```
`LiveHud.tsx` 的"热力词"面板使用这个硬编码数组，而不是从数据库动态统计近期高频标签。

### 问题 4（P2）：LiveHud 空状态措辞

`src/components/LiveHud.tsx:54` — `"暂无发射缓存。"` 中的"缓存"一词对终端用户不够友好，建议改为 `"暂无发射记录。"`

### 问题 5（P3）：命令面板保留

`src/components/SiteHeader.tsx` — `cmdk` 命令面板 (⌘K) 仍然存在。这是一个开发者工具风格的交互模式，普通用户不太会使用。作为搜索功能来说，它和已有的搜索表单功能重复。

### 问题 6（P3）：LiveHud key 可能为 undefined

`src/components/LiveHud.tsx:63` — `key={item.id}` 中，如果 `id` 为 undefined，React 会报警告。应使用 `key={item.id ?? item.title}`。

---

## 五、总结对比

| 优先级 | 问题 | 第一轮状态 | 第二轮状态 |
|---|---|---|---|
| P0 | 无自动数据更新 | ❌ 无前端轮询 + 无后端 CRON | ⚠️ 有前端轮询，但**仍无 CRON** |
| P0 | 离线数据含开发备注 | ❌ 8条假数据含设计说明 | ✅ 已清空 |
| P1 | official_page 采集器缺失 | ❌ 3个源无法采集 | ✅ 已实现采集器 |
| P1 | 硬编码假数据 | ❌ MissionNav 24/6 | ✅ 已动态化 |
| P2 | 英文开发者术语 | ❌ 5处英文 kicker | ✅ 已中文化 |
| P2 | "来源透明"信号卡 | ❌ 静态无功能卡片 | ✅ 已移除 |
| P2 | 错误消息暴露 | ❌ error.message 直出 | ✅ 已通用化 |
| — | 文章详情设计说明 | — (首轮未发现) | ❌ 新增发现 |
| — | 热力词硬编码 | — (首轮未发现) | ❌ 新增发现 |

### 优先修复建议

1. **在 `wrangler.toml` 添加 CRON triggers** — 否则整个系统的数据永远是旧的
2. **移除 `ArticleDetailPage` 中的开发说明文字** — 用户看到的"核心要点"是设计备注
3. **热力词改为动态统计** — 从 tags 表查询近期高频标签
4. **LiveHud 措辞优化** — "缓存"改为"记录"

---

> 以上为第二轮审查结果，不包含代码修改。请 codex 审阅后决定修改方案。
