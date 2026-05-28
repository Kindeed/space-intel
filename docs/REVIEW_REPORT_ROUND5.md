# Space Intel 项目审查报告（第五轮）

> 审查日期：2026-05-28
> 审查范围：第四轮修复后的工作区、任务清单、配置、测试和布局验证脚本

## 结论

- 第四轮报告中的用户可见文案、sourceKey 伪标签和中英文混用问题已修复。
- 本轮新发现 3 个小问题，均已修复。
- typecheck、lint、test、build 和布局检查需在修复后重新执行。

## 本轮发现与修复

| 优先级 | 问题 | 处理 |
| --- | --- | --- |
| P1 | 文章列表聚合后 `hasMore` 会把“被聚合掉的重复报道”误判为下一页可用。 | 改为基于扩展抓取窗口和聚合后剩余可见条目判断，并补充回归测试。 |
| P2 | 布局验证脚本仍把旧文案 `打开原文链接` 当作文章详情有效信号。 | 改为检查 `阅读原文`，并把旧内部说明加入禁用文案断言。 |
| P2 | 本地 `.claude/settings.local.json` 未被忽略，存在误提交本机工具权限配置的风险。 | `.gitignore` 增加 `.claude/`。 |
| P3 | 多个依赖有同主版本补丁/小版本更新。 | 已更新当前 semver 范围内依赖和 lockfile；大版本候选保留为后续单独迁移。 |

## 仍需外部确认

- scheduled Worker 的 GitHub 自动部署仍依赖仓库 Secret `CLOUDFLARE_API_TOKEN`。该值不能进入仓库，需要在 GitHub 仓库设置中确认。
- Launch Library 2 User-Agent 修正仍需随主分支部署后，在 production 复跑受保护的 launch ingestion endpoint。
- 依赖检查仅剩大版本候选，包括 ESLint 10、Vite 8、TypeScript 6、lucide-react 1 等；这些需要单独评估破坏性变更。
