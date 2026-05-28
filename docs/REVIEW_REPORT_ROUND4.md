# 审查报告：前端 UI 问题

## 背景

检查项目中的四类问题：
1. "摘要、要点、实体关系、原文链接"等内部系统用语暴露在网页上
2. 中英文混用
3. 每条新闻下方显示 "google-news-cn-commerical-space" 来源标签
4. 其他明显问题和不符合操作逻辑的地方

---

## 发现 1（严重）：ArticleDetailPage 副标题包含内部系统用语

**文件**: `src/pages/ArticleDetailPage.tsx` 第 19 行

```
subtitle="摘要、要点、实体关系和原文链接；不存储或展示受版权限制全文。"
```

这是开发者/运营的内部说明文字，不应展示给最终用户。应替换为面向用户的简短描述，例如 `"文章详情与相关信息"`。

**同时**，同文件第 45 行的链接文字 `打开原文链接` 过于生硬，建议改为 `阅读原文` 或 `查看原文`。

**连带影响**: `src/App.test.tsx` 第 31-33 行测试断言旧字符串已移除，但当前 subtitle 与旧字符串语义重叠，修复后需更新测试。

---

## 发现 2（严重）：来源 key 被当作新闻标签展示

**文件**: `src/utils.ts` 第 154 行

```typescript
tags: [row.sourceKey, row.language].filter(Boolean),
```

`articleFromApi()` 将内部 sourceKey（如 `google-news-cn-commercial-space`）和 language 硬编码为 `tags` 字段。这些 tags 在 `ArticleCard.tsx` 第 29-31 行渲染为可点击链接：

```tsx
{item.tags.slice(0, 3).map((tag) => (
  <Link key={tag} to={`/topics/${slugify(tag)}`}>{tag}</Link>
))}
```

**这就是 "google-news-cn-commerical-space" 的来源** — 它是 source key，不是真正的 topic。点击后跳转到 `/topics/google-news-cn-commercial-space`，因为数据库中没有对应 topic，`TopicDetailPage` 显示空状态 "暂无专题文章"。

**正确做法**：列表 API (`ApiArticleSummary`) 没有 tags 字段，不应在映射时伪造。要么不填充 tags，要么在服务端列表查询中 join tags 表返回真实标签。

---

## 发现 3（中等）：多处中英文混用

| 文件 | 行号 | 当前文本 | 问题 |
|------|------|---------|------|
| `src/pages/TopicsPage.tsx` | 11 | `自动标签聚合与人工精选形成持续追踪的 context。` | 英文 "context" 应改为中文 |
| `src/pages/ArticlesPage.tsx` | 23 | `按 story clustering 折叠重复报道，并用紧凑筛选控制信息密度。` | 英文 "story clustering" 应改为中文 |
| `src/pages/CapitalPage.tsx` | 34 | `placeholder="company slug"` | 英文 placeholder，应改为中文提示 |

---

## 发现 4（中等）：专题详情页无数据体验差

**文件**: `src/pages/TopicDetailPage.tsx`

当用户从新闻卡片点击 sourceKey 伪标签进入 `/topics/xxx` 时，页面显示 `暂无专题文章。`，用户无法理解为何跳转到空白页。修复发现 2 后会大幅缓解，但仍建议在空结果时给出更友好的提示。

---

## 发现 5（低）：ArticleCard 中 source name 无链接

**文件**: `src/components/ArticleCard.tsx` 第 14 行

```tsx
<span>{item.source}</span>
```

来源名称为纯文本无法点击，但底部 tag-row 却把 sourceKey 当作可点击标签。两者逻辑不一致。

---

## 发现 6（低）：测试覆盖需同步

修复 subtitle 后需同步更新 `src/App.test.tsx`，添加对新 subtitle 的断言。

---

## 修复优先级

| 优先级 | 问题 | 涉及文件 |
|--------|------|---------|
| P0 | 副标题内部用语暴露 | `src/pages/ArticleDetailPage.tsx:19` |
| P0 | sourceKey 伪标签污染新闻卡片 | `src/utils.ts:154` |
| P1 | "打开原文链接"改为更自然的表述 | `src/pages/ArticleDetailPage.tsx:45` |
| P1 | 中英文混用（context, story clustering, company slug） | `TopicsPage.tsx:11`, `ArticlesPage.tsx:23`, `CapitalPage.tsx:34` |
| P2 | 测试用例与当前状态同步 | `src/App.test.tsx` |
| P2 | 专题空状态体验优化 | `src/pages/TopicDetailPage.tsx` |

## 验证方式

1. 启动 dev server，确认新闻卡片底部不再显示 source key 标签（如 `google-news-cn-commercial-space`、`zh`、`en` 等）
2. 打开文章详情页，确认副标题不再显示 "摘要、要点、实体关系和原文链接"
3. 检查所有页面 subtitle，确认没有英文术语混入中文界面
4. 运行 `pnpm test` 确认测试通过
5. 点击新闻卡片上的标签，确认跳转到的专题页有实际内容
