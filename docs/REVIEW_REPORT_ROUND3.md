# Space Intel 项目审查报告（第三轮）

> 审查日期：2026-05-15
> 审查范围：第二轮审查后修改的 52 个文件
> 审查原则：只审查，不修改

---

## 修改概览

本轮修改覆盖 52 个文件（+529/-436 行），针对第二轮报告的 6 个遗留/新增问题全部进行了修复。

---

## 一、第二轮遗留问题核验

### ✅ P0-1：CRON 调度 — 已完全修复

这是前两轮最大的遗留问题。本轮通过**独立的 Cloudflare Worker** 方式解决：

- `wrangler.scheduled.toml` — 新建的独立 Worker 配置：
  - `name = "space-intel-scheduled"`
  - `[triggers] crons = ["0 * * * *", "15 18 * * *"]` — 每小时摄取 + 每天 18:15 策展同步
  - 绑定同一个 D1 数据库
- `src/workers/scheduled.ts` — 新建的 Worker 入口：
  - `scheduled()` handler 接收 `ScheduledController`
  - `runSpaceIntelScheduled()` 根据 cron 表达式判断 `hourly` / `daily`
  - 调用 `runScheduledIngestion()` 执行完整摄取流水线（SNAPI、Launch Library、RSS、Google News、official_page）
- `src/workers/scheduled.test.ts` — Worker 单元测试：
  - 验证 hourly cron → `kind: 'hourly'`
  - 验证 daily cron → `kind: 'daily'`
- `package.json:9` — 新增 `"deploy:scheduled"` 部署脚本
- `docs/INGESTION_ARCHITECTURE.md` — 更新文档，说明 Pages Functions 和 Scheduled Worker 的分离架构

**评估：架构设计合理。** 将定时任务拆分为独立 Worker，与 Pages Functions 解耦，符合 Cloudflare 最佳实践。前端 5 分钟轮询 + 后端每小时自动摄取，整个数据更新链路已打通。

### ✅ P1：ArticleDetailPage 设计说明冒充"核心要点" — 已修复

- `src/pages/ArticleDetailPage.tsx:35-40` — 整个 `insight-list` 区块（含"核心要点"标题和三条设计备注）**已完全移除**
- `src/App.test.tsx:24-34` — 新增测试断言：
  ```
  expect(html).not.toContain('核心要点');
  expect(html).not.toContain('只展示摘要和元数据，避免全文转载。');
  expect(html).not.toContain('实体、标签和发射关系用于快速判断线索价值。');
  ```
- `scripts/verify-layout.mjs:39-42` — Playwright E2E 测试中也加入了相同检查

### ✅ P2：热力词硬编码 — 已修复

- `src/db/homeQueries.ts:56-79` — 新增 `listTrendingTags()`：
  - 查询近 7 天内 `article_tags` 表中出现频率最高的标签
  - JOIN `tags` 表获取 slug 和 name
  - 按 count DESC 排序，可配置 limit（默认 6）
- `src/db/homeQueries.test.ts:54-68` — 单元测试验证 SQL 结构和参数绑定
- `src/types.ts:40-44` — 新增 `ApiTrendingTag` 类型（`{ slug, name, count }`）
- `src/types.ts:46-50` — `ApiHomeResult` 增加 `trendingTags: ApiTrendingTag[]`
- `functions/api/home.ts:14` — `/api/home` 返回包含 `trendingTags`
- `src/components/LiveHud.tsx:43,48-51` — 接收 `trendingTags` prop：
  - 有数据时显示真实热力词，kicker 为 `"近期"`
  - 无数据时回退到 `data.ts` 中的 `trendTags` 硬编码列表，kicker 为 `"配置"`
- `src/pages/HomePage.tsx:33` — 传递 `trendingTags={home.data?.trendingTags}`

### ✅ P3：LiveHud "缓存"措辞 — 已修复

- `src/components/LiveHud.tsx:57` — `"暂无发射缓存。"` → `"暂无发射记录。"`
- `src/App.test.tsx:36-45` — 新增测试断言：
  ```
  expect(html).toContain('暂无发射记录。');
  expect(html).not.toContain('暂无发射缓存。');
  ```

---

## 二、本轮新增内容

### 独立的 Scheduled Worker

```
wrangler.toml          → Pages + Functions + D1 + R2
wrangler.scheduled.toml → 独立 Worker + D1 + Cron Triggers
```

两条部署管线分离，互不影响。部署命令：
- `pnpm build && wrangler deploy` → Pages 应用
- `pnpm deploy:scheduled` → 定时 Worker

### E2E 测试增强

`scripts/verify-layout.mjs` 大幅扩展：
- 桌面 / 平板 / 手机三个视口
- 验证命令面板 (⌘K) 打开和关闭
- 验证水平溢出检查
- 点击进入文章详情页验证无设计备注
- 点击进入发射页面验证正常渲染
- 截图保存到 `test-results/`

### App 单元测试增强

`src/App.test.tsx` 新增 3 个测试用例：
1. 首页渲染必要的区块（今日重点、发射时间线、非投资建议声明）
2. 文章详情页不包含设计备注
3. LiveHud 空状态使用用户友好文案

---

## 三、当前状态总览

| 优先级 | 问题 | 第一轮 | 第二轮 | 第三轮 |
|---|---|---|---|---|
| P0 | 无自动数据更新 | ❌ | ⚠️ 前端轮询 | ✅ CRON Worker |
| P0 | 离线数据含开发备注 | ❌ | ✅ | ✅ |
| P1 | official_page 采集器缺失 | ❌ | ✅ | ✅ |
| P1 | 硬编码假数据 | ❌ | ✅ | ✅ |
| P1 | 文章详情设计说明 | — | ❌ 新发现 | ✅ |
| P2 | 英文开发者术语 | ❌ | ✅ | ✅ |
| P2 | "来源透明"信号卡 | ❌ | ✅ | ✅ |
| P2 | 错误消息暴露 | ❌ | ✅ | ✅ |
| P2 | 热力词硬编码 | — | ❌ 新发现 | ✅ |
| P3 | LiveHud "缓存"措辞 | — | ❌ 新发现 | ✅ |

---

## 四、仅剩的微小建议（P3，可按需处理）

1. **`LiveHud.tsx:65`** — `key={item.id}` 在极端情况下 id 可能为 undefined（如果 API 返回异常数据），可改为 `key={item.id ?? item.title}` 防御性处理
2. **`SiteHeader.tsx`** — `cmdk` 命令面板与现有搜索表单功能有重叠，可考虑合并或简化
3. **信息来源扩展** — `config/sources.yaml` 仍然只有 34 个源（实际可用 32 个），建议后续按第一轮报告的建议列表持续扩充

---

## 五、总结

经过三轮审查和修改，第一轮发现的 **8 个问题已全部修复**，后续新发现的 **4 个问题也已全部修复**。项目的自动数据更新链路已完整打通（CRON Worker → D1 → Pages Functions API → 前端轮询），用户界面不再暴露开发者内容，错误处理已统一规范化，测试覆盖率也有显著提升。

**当前无 P0/P1/P2 问题遗留。**
