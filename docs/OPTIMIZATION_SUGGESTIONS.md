# 商业航天全量情报站 (Space Intel) 优化建议书

本文件基于 2026-05-13 对项目结构、前端代码及 UI/UX 的审查整理而成，旨在为后续迭代提供工程架构与体验设计的优化方向。

---

## 一、 工程架构优化 (Engineering Architecture)

### 1. 代码解耦与模块化 (Decoupling)
*   **现状**：`src/App.tsx` 过于臃肿（Mega-file），包含大量 API 类型定义、工具函数、多个页面组件及全局布局。
*   **建议方案**：
    *   **拆分页面**：建立 `src/pages/` 目录，将 `HomePage`, `ArticlesPage`, `CompanyDetailPage`, `LaunchPage` 等独立成文件。
    *   **组件抽离**：建立 `src/components/` 目录，将 `ArticleCard`, `SiteHeader`, `PageShell`, `RightRail` 等可复用组件抽离。
    *   **类型定义归档**：建立 `src/types.ts` 或 `src/api/types.ts` 集中管理 API 响应结构。
    *   **封装 API Hook**：使用 `useEffect` 散落在各页面不利于管理，建议封装成 `useArticles`, `useCompany` 等自定义 Hook，未来可无缝切换至 `TanStack Query`。

### 2. 样式方案规范化 (Styling)
*   **现状**：混合使用了 Tailwind 4 的新特性与大量手动编写的 BEM 风格 CSS。
*   **建议方案**：
    *   **设计令牌 (Design Tokens)**：在 Tailwind 的 `@theme` 中定义核心品牌色（如 `brand-green`）、间距比例和阴影，减少 `styles.css` 中的硬编码。
    *   **减少 CSS 体积**：基础布局（padding, margin, flex/grid）尽量全面转为 Tailwind 工具类。复杂的复合交互组件（如 `ArticleCard`）可保留局部 CSS。

### 3. 加载与错误处理 (Resilience)
*   **现状**：加载状态通过简单文本提示，错误处理仅有基础报错。
*   **建议方案**：
    *   **骨架屏 (Skeleton Screens)**：为新闻列表、公司卡片设计骨架屏动画，消除 API 加载时的页面跳动感。
    *   **全局错误边界 (ErrorBoundary)**：防止单个 API 崩溃导致整个应用白屏。

---

## 二、 UI/UX 体验优化 (User Experience)

### 1. 布局与空间利用 (Layout)
*   **导航精简**：目前顶部导航与左侧边栏功能重合度较高。建议左侧专注“频道/分类”，顶部专注“工具/后台/搜索”。
*   **移动端适配**：首页 `Feature Card` 在小屏下垂直高度过大，建议改为横向滚动或更紧凑的卡片堆叠方式。

### 2. 筛选与交互 (Interactivity)
*   **筛选器易用性**：目前筛选框（如 `tag`, `company`）需要手输 `slug` 或 `key`。
    *   **建议**：改为下拉列表（Select）或 自动补全（Autocomplete）输入框。
*   **联想搜索**：搜索框增加“热门搜索”或基于当前库的实时联想功能。

### 3. 信息密度与专业感 (Visual Identity)
*   **深色模式 (Dark Mode)**：航天/情报类站点极适合深色模式，能更好地突出高亮的元数据（如卫星轨迹、融资状态）。
*   **数据可视化**：
    *   **资本页**：增加融资额度/事件数量的简单柱状图。
    *   **发射页**：提供“时间轴视图”替代单一列表，增强时序感。

### 4. 内容元数据强化 (Metadata)
*   **来源可信度**：在卡片显著位置标注来源权重（如“官方”、“媒体”、“推测”）。
*   **翻译交互**：对于自动生成的中文摘要，增加“查看英文原稿”或“人工核校标识”。

---

## 三、 下一步路线图 (Roadmap)

1.  **Phase 1 (Refactor)**: 拆分 `App.tsx`，建立规范的目录结构。
2.  **Phase 2 (UX Boost)**: 引入骨架屏，优化筛选器的交互（改为选择模式）。
3.  **Phase 3 (Data Viz)**: 在发射页和资本页引入基础的数据可视化组件。
