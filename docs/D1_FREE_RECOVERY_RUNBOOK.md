# D1 免费方案恢复与采集验收

## 已授权范围

完善、合并并部署 PR #33；额度恢复后核对并补齐索引，观察完整来源轮转，验证新闻和发射数据。保持 Free，不升级、不绕过限流、不改其他服务；不运行每分钟 health 轮询。

## 发布后的读取边界

- `/api/health` 只执行 `SELECT 1 AS healthy`，不读取业务表，数据库不可用时返回 503。`assets` 仅表示绑定存在。
- `/api/health?diagnostics=1` 为显式详细检查。日志只读最近 240 个日志 ID；成功时间和失败来源均限于该范围，响应标明范围。开放日志和未来发射计数最多展示 200，`*CountExact: false` 表示实际更多。
- 详细计数必须使用指定索引，缺失时返回不可用，禁止退回历史全表扫描。正常轻量检查不依赖这些索引。
- 公开 JSON 缓存为 120 秒；health、admin、鉴权、Cookie 和失败响应继续绕过缓存。
- Cron 输出 `space_intel_ingestion` 结构摘要，含计划时间、来源、成功/失败和写入数，不增加 D1 查询。`Ok` 调用状态不能代替来源成功。

## 预算恢复后，只检查一次

本次每日预算最早在 **2026-11-15 08:00 北京时间 / 00:00 UTC** 恢复。届时用一次轻量 health 或 `SELECT 1` 验证。若仍被拒绝，停止业务查询，检查控制台预算/平台状态，不循环重试。

从 D1 控制台指标核对当天读取/写入量，注意日期范围与 UTC 重置时间；不要将过去 24 小时总量当作当天用量。核对索引目录只需一次小查询：

```sql
SELECT name, tbl_name, sql FROM sqlite_master
WHERE type = 'index'
  AND tbl_name IN ('articles', 'ingestion_logs', 'launches')
ORDER BY tbl_name, name;
```

## 按缺失项补齐索引

只执行审查后的 `migrations/0009_health_query_indexes.sql` 中缺失的三项，每条分别执行并记录结果和预算；不要直接重放所有历史 migrations。

1. `idx_articles_published_at`：初始 schema 应已有，存在即跳过。
2. `idx_launches_window_start`：未来发射查询和有界统计使用。
3. `idx_ingestion_logs_open_started`：只索引 `finished_at IS NULL` 的日志，同时支持开放日志统计与过期闭合。

完整历史日志索引可能为约 113k 历史行写入索引，超过 Free 单日 100k 写预算。本 PR 已改用主键范围读取历史摘要，移除了未部署草稿中的完整日志索引，避免为诊断回填整个历史表。创建部分索引仍需扫描日志表一次，因此要记入读取预算。必要时只做一次 `SELECT COUNT(*) FROM (SELECT 1 FROM ingestion_logs WHERE finished_at IS NULL LIMIT 201)` 评估开放日志数量；若结果达到上界或预算不足，停止并重新评估，不能盲目建大索引。

索引完成后一次性核对目录与 `EXPLAIN QUERY PLAN`，确认开放日志用部分索引、近期日志用 INTEGER PRIMARY KEY 范围、未来发射用时间索引。可执行一次显式详细 health 验证，禁止定时反复调用。若可获得执行 meta，同时保存 `rows_read` / `rows_written`，不凭本地计划断言生产用量。

## 一次完整轮转的观察

1. 索引核对后记录 UTC 开始时间和 `SELECT MAX(id) FROM ingestion_logs`、`SELECT MAX(id) FROM articles` 两个主键基线。下一个计划分钟开始观察，轮转长度以启用来源数为准，当前为 60 分钟。
2. 使用 Worker 实时日志/平台指标观察摘要，不额外查询 D1。若日志流中断，记录观测缺口，不把缺失记录算作成功。
3. 轮转结束仅查询一次有界日志：`WHERE id > <基线> AND id <= <基线+120> ORDER BY id LIMIT 120`，返回来源、开始/完成、成功/失败数和错误。在本地按观察时间筛选并对照配置来源集合；不要对整张日志表按日期反复 GROUP BY。
4. 联合检查闭合日志、当前版本 CPU/内存/异常指标和结构摘要。任何未闭合来源、缺失来源或 D1 错误均保留问题状态。上游 HTTP 失败与 Worker 资源限制分开统计。
5. 文章用主键基线后最多 100 条样本核对真实新入库记录；发布时间可能较早，不能只看 MAX(published_at)。公开首页、资讯及新文章详情各验证一次，允许 120 秒缓存传播。
6. LL2 应在其时隙闭合且 `failure_count = 0`、`success_count > 0`。之后用索引读取最多五个未来发射，并核对公开 `/api/launches?limit=5` 和发射页。源成功但内容无变化仍可代表缓存重新拉取；仅有旧缓存可访问不能代表恢复。

若 LL2 继续 429，保留上游问题并等待允许的窗口；不密集重试、不轮换出口规避限流、不拿开发 API 的旧数据冒充生产更新。逐源失败不应阻断下一分钟任务。

## 来源与限制

- [D1 定价与每日重置](https://developers.cloudflare.com/d1/platform/pricing/)：Free 每日读 5M / 写 100k；DDL 和控制台查询也计入预算。
- [D1 索引与成本](https://developers.cloudflare.com/d1/best-practices/use-indexes/)：索引回填及后续写入有成本，部分索引可减少索引项。
- [LL2 官方文档](https://ll.thespacedevs.com/docs)：2.2.0 不受支持，生产改用 2.3.0；匿名请求每小时 15 次。本站保持每轮一次，不保证共享出口不会被限流。
- 上游 403/404/503/526 与每日维护的独立验证仍需如实记录；不得仅凭 CPU 错误为零宣称全站更新恢复。
