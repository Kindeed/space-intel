# Cloudflare 重建与线上采集修复记录

日期：2026-05-28

## 检查结论

- Cloudflare Pages production 仍停在 `main@ec61f2b`，未包含本地最新修复。
- 线上网页可正常装载，当前生产 HTML 加载 `/assets/index-tZuvYeDk.js`。
- 远程 D1 存在历史未闭合 `ingestion_logs`，主要集中在 `the-space-review-rss` 和 `snapi`。
- Launch Library 2 scheduled ingestion 持续返回 HTTP 429。

## 已修复

- scheduled ingestion 对每个来源增加默认 25 秒单源超时。
- 超时来源会闭合 ingestion log，写入 `failure_count=1` 和 `Source ingestion timed out after 25000ms`，后续来源继续执行。
- Launch Library 2 改为每 6 小时执行一次，降低 429 噪声。
- `/api/health` 改为优先展示最近已闭合采集日志，并返回 `openIngestionLogCount`。
- 新增超时继续执行、Launch Library 2 节流和 health 诊断测试。

## 验证

- `pnpm typecheck` 通过。
- `pnpm lint` 通过。
- `pnpm test` 通过：20 个测试文件，64 条测试。
- `pnpm build` 通过。
- `pnpm verify:layout` 通过：desktop、tablet、mobile。

## 部署后操作

- 合并到 `main` 后确认 Cloudflare Pages production deployment source 不再是 `ec61f2b`。
- 确认 `space.bytebaud.com` 的 JS asset hash 从 `/assets/index-tZuvYeDk.js` 变更。
- 确认 scheduled Worker 已由 GitHub Actions 部署。
- 代码部署确认后，清理超过 2 小时未闭合的历史 `ingestion_logs`。
