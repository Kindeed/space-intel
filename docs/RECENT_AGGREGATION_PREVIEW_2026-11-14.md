# 近期资讯聚合预览验收记录

预览地址：`http://127.0.0.1:5173/recent`。本轮完成真实来源试采、滚动资讯文件和省份/公司组合筛选，不切换现有生产网站。

## 试采结果

2026-11-14 北京时间 21:24 与 21:46 完成两轮公开列表试采。第一轮检查 48 个候选、使用 49 次采集器请求，第二轮对 27 个可解析入口再取样、使用 27 次请求。之后的相关性过滤调整通过重放第二轮原始条目完成，没有额外重复请求来源。诊断性网页检查不计入上述采集器请求数。

27 个入口两轮均解析成功，国内 18、国外 9；包括 12 个企业栏目、3 个政策栏目和 12 个新闻栏目。17 个入口提供了符合当前窗口及相关性规则的资讯；其他入口有有效日期条目，但近期没有相关更新。两次本地成功不代表已经证明长期稳定，也不代表从 Cloudflare 出口访问一定成功。

最终预览包含 78 条去重资讯，其中国内 17、国外 61。JSON 70,329 字节，gzip 约 15 KB。保留最多 30 天、2,000 条，默认查看最近 7 天。来源目录不受文章窗口影响。

当前样本中能明确归属的省级地区仅湖北和广东，另有全国与未明确地区。31 个大陆省级筛选入口已经实现；不根据企业总部猜测新闻地点，不声称已具备全国各省的稳定动态覆盖。政府门户返回成功但没有相关条目时，不把首页或旧政策伪装为新资讯。

## 已完成的功能

- 国内/国外、24 小时/7 天/30 天、省份、公司、类型及关键词组合筛选；筛选在浏览器内完成。
- 公司索引、来源目录、原文跳转、暂无结果和更新失败状态。
- 原始日期与采集日期分开；只有发布日期的政府/企业条目不展示虚构的小时分钟。
- 缺少日期的 RSS 不以采集时间替代；过滤党建、培训等内部活动和偏离主题的纯天文内容。
- 单条资讯关联多个来源/公司/地区，保留仍在窗口内的上次成功结果，数量与字节体积均设上限。
- 预览路径独立于旧站，未挂载旧站的公司/专题 API hooks。浏览器验收确认零 `/api/` 请求、零 health 调用。

## 验证

Typecheck（含新 Node 采集脚本）、lint、完整 Vitest 70 文件 / 496 用例、配置生成一致性及 Vite build 通过。新预览通过 1440、820、390 宽度检查，验证省份/公司交叉筛选、空结果、关键词、政策类型、国外资讯、公司/来源视图、原文链接和快照 503 状态；没有横向溢出和浏览器运行错误。

应用内浏览器连接未配置，改用已安装 Chrome 的全新 headless 会话检查本地页面，不访问用户登录资料。截图与详细 UI 结果保存在 `.recent/qa/`。旧通用布局脚本依赖的专用 Playwright 浏览器不在本机，本轮使用新预览验收脚本完成等效检查。

## 本地运行

```powershell
pnpm recent:collect
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 5173 --strictPort
```

采集脚本读取 `config/recent-pilot.json`，URL 和用途仍从 `config/sources.yaml` 读取。数据输出 `public/recent/current.json`，中间证据位于 `.recent/`，两者均忽略 Git。Windows 下先停止正在运行的 Vite dev server 再更新资讯文件，避免文件监听器占用妨碍原子替换；本轮最终预览使用生产构建的静态服务器。

采集只运行一次；页面的刷新按钮重新读取已发布文件，不触发外部采集。尚未启用每日定时任务，也没有向生产 R2 发布数据。来源试采和网页预览不读取/写入生产 D1，不更改套餐。

## 后续实施

先补齐高价值地方政策与公司更新入口、验证跨日新增量，再接入 Actions 定时采集和 R2 快照发布。R2 发布必须覆盖预算、并发、失败保持及新旧来源运行环境隔离；预览不得因合并就自动启用第二套生产采集。现有生产 cron、旧库和独立恢复验收保持原任务状态。

## 通过两轮解析的来源

| 来源 | 地区 | 类型 | 第二轮解析条目 | 过滤后近期条目 |
| --- | --- | --- | ---: | ---: |
| [中科宇航新闻](https://www.cas-space.com/) | 国内 | 企业 | 10 | 5 |
| [中国航天科工集团新闻](http://www.casic.com.cn/) | 国内 | 新闻 | 6 | 2 |
| [长光卫星新闻](https://www.jl1.cn/index.aspx) | 国内 | 企业 | 3 | 0 |
| [国家航天局政策公告](https://www.cnsa.gov.cn/n6758823/n6758839/index.html) | 国内 | 政策 | 10 | 1 |
| [European Spaceflight](https://europeanspaceflight.com/feed/) | 国外 | 新闻 | 10 | 10 |
| [广东省发改委政策文件](https://drc.gd.gov.cn/qtwj/) | 国内 | 政策 | 2 | 0 |
| [蓝箭航天新闻](https://www.landspace.com/site/) | 国内 | 企业 | 8 | 0 |
| [NASA News](https://www.nasa.gov/news-release/feed/) | 国外 | 新闻 | 10 | 2 |
| [NASASpaceflight](https://www.nasaspaceflight.com/feed/) | 国外 | 新闻 | 10 | 8 |
| [东方空间新闻](https://www.orienspace.com/newsPage) | 国内 | 企业 | 15 | 1 |
| [九天微星](https://www.commsat.cn/news.html) | 国内 | 企业 | 4 | 0 |
| [时空道宇](https://www.geespace.com/news/) | 国内 | 企业 | 3 | 0 |
| [中科星图](https://www.geovis.com.cn/news/) | 国内 | 企业 | 7 | 0 |
| [湖北经信热点聚焦](https://jxt.hubei.gov.cn/bmdt/rdjj/index_1.shtml) | 国内 | 新闻 | 1 | 1 |
| [江苏工信政策发布](https://gxt.jiangsu.gov.cn/col/col6299/index.html) | 国内 | 政策 | 3 | 0 |
| [九州云箭](https://www.jzyjspace.com/news/1/) | 国内 | 企业 | 2 | 0 |
| [微纳星空](https://www.minospace.cn/news_list.html) | 国内 | 企业 | 9 | 3 |
| [航宇微](https://www.myorbita.net/xw/list_13.aspx) | 国内 | 企业 | 4 | 3 |
| [星网宇达](https://www.starneto.com/new_center/) | 国内 | 企业 | 1 | 0 |
| [星邑空间](https://www.xingyispace.com/news/list_29.html) | 国内 | 企业 | 9 | 0 |
| [SatNews](https://news.satnews.com/feed/) | 国外 | 新闻 | 10 | 9 |
| [中国航天科技集团新闻](https://www.spacechina.com/n25/n2014789/index.html) | 国内 | 新闻 | 1 | 1 |
| [Spaceflight Now](https://spaceflightnow.com/feed/) | 国外 | 新闻 | 10 | 8 |
| [SpaceNews](https://spacenews.com/feed/) | 国外 | 新闻 | 16 | 12 |
| [SpacePolicyOnline](https://spacepolicyonline.com/feed/) | 国外 | 新闻 | 10 | 4 |
| [SpaceQ](https://spaceq.ca/feed/) | 国外 | 新闻 | 10 | 6 |
| [Universe Today](https://www.universetoday.com/feed/) | 国外 | 新闻 | 20 | 6 |

未选入的 21 个入口及结果、逐源采样时间和统计见 `recent-pilot-2026-11-14.json`；未确认来源继续留在研究目录。
