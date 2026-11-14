# 商业航天信息源首轮目录 · 2026-11-14

本目录先建立信息来源地图，再用真实样本决定采集方式、更新频率与存储。仅研究资料；没有导入运行配置或新增线上采集任务。

共 213 个去重入口：60 个来自现有启用配置，153 个新增候选。国内 176，国际 37。这里的入口包含导航首页、部门目录和新闻栏目，不等于独立发布者数量，也不等于可持续采集源数量。

大陆 31 个省级分组均有政府门户入口；另列香港、澳门、兵团和台湾扩展分组。企业及相关机构实体 45 家，其中国内 34 家；9 家尚无确认入口。没有根据名称猜测企业总部、注册地或工厂属地。

## 目录文件

- `catalog.json`：来源用途、预期内容、原始链接、证据、风险、验证状态。
- `regions.json`：行政区域导航及覆盖缺口；门户覆盖不等于当地产业信息覆盖完整。
- `companies.json`：公司赛道、官网/新闻入口与待补实体。
- `evidence.json`：相关公开检索/阅读器证据和政策样本，不保存全文。

## 国内组织方式

入口按“国家级 → 省级 → 城市/区县/园区”分层；部门再区分发改、工信/经信、科技、采购交易、自然资源/财政。公司按火箭/发动机、卫星制造、星座运营、测运控/地面站、遥感应用、北斗/部件建立独立实体。

省份页与公司页是同一批文章的不同视图。同一份政策只保留一个规范记录，各部门转载链接作为出处关系；不同新闻稿报道同一项目时保留各自报道，再关联同一个事件，不能把不同观点简单删成一篇。

每条记录分别标注发布机构属地、政策适用区域、项目发生地及涉及公司。国家政策在地方门户的转载仍属于国家政策。省级政策的转载件也不重复算新增政策。

发展趋势应追踪“政策发布 → 申报/获批 → 招标/中标 → 签约/开工 → 投产/试验/发射”等具体事件，并把同一项目跨部门、跨公司的后续报道串起来。签约金额、拟建产能和已经实现的交付分别记录；不直接用新闻篇数或企业宣传强度推断产业增长。

先试采北京、天津、上海、江苏、浙江、安徽、山东、湖北、湖南、广东、海南、四川、陕西的高价值栏目。其他省份保留发现入口，按真实航天相关产出提高优先级。城市与园区列入下一轮扩充，不声称已覆盖全国园区。

## 国外规划

按“国家/地区 + 机构/监管部门 + 企业 + 专业媒体 + 任务/发射数据”组织；不机械照搬省级行政层级。

- 机构一手信息：NASA、ESA、JAXA、ISRO；后续核实各国许可/频谱/采购与监管公告入口。
- 企业：保留现有 SpaceX、Rocket Lab、Blue Origin 等 11 家官网实体，进一步定位稳定新闻与公告栏目。
- 专业媒体：沿用现有 SpaceNews、Payload、European Spaceflight 等候选渠道，区分独立报道和转载。
- 发射：LL2 用于结构化事件发现，官方机构和运营方用于核对；SNAPI 是分发渠道，应保留原发布媒体。
- 非洲、中东、拉美及欧洲/印度/日本的商业企业仍有明显缺口，下一轮按商业活动和可验证一手渠道补齐。

ESA 新找到的是 RSS 目录，不能当成已修复的订阅；现有失效源仍需另行处理。JAXA 当前为年份入口，需核实稳定父栏目。

## 分类与存储

分类本身不压缩内容；扩大来源通常会增加抓取量、日志量和关联数据。存储与读取分别控制：

如果第一阶段只是“按省份、公司分类的来源导航”，站内只维护来源名、链接、类别和状态，确实很轻。若要跨来源搜索、按时间查看新闻和分析发展趋势，则仍需保存文章元数据；可以按“来源导航 → 标题/日期/摘要聚合 → 项目与政策事件追踪”逐步增加能力。只存链接也意味着原站撤稿或迁移后可能无法回看，重要政策需要另行评估必要的版本记录。

1. 核心只存标题、原文URL、原发布者、真实发布时间、必要摘要和内容指纹；正文、图片、附件默认跳转原站。政策PDF先存出处及文号/效力待核状态，按需要提取必要字段。
2. 一条规范文章以轻量关系关联多个地区、公司和主题，避免为每个省/公司复制正文；规范URL与政策文号辅助去重，原始URL不丢。
3. 来源配置、公司和区域目录先放 Git 文件，不为每次页面访问读取数据库。
4. 浏览读取预生成的首页/地区/公司/发射快照；采集端整理后增量发布，网页显示快照时间并在采集失败时保留上次成功版本。此项是设计建议，尚未实施重构。
5. 每源保存最近状态、最近成功时间和有界错误；不要为每个低频来源每分钟写一条空采集日志。

例如 1,000 篇文章、每篇关联 3 个视图，复制存储是 3,000 份内容；规范化后是 1,000 份内容加 3,000 条轻量关联。实际字节节省应以样本测量，不能直接宣称总量减少三分之二。此前线上故障已确认涉及 D1 读取额度，不是已经证实磁盘空间耗尽。

## 验证与接入顺序

当前目录所有新增入口 `researchOnly=true`，`collectionStatus=not_tested`。已有配置单独标注 `existingRuntimeEnabled`，仅说明配置状态。政府门户 HTTP 200 只证明本次首页可达，链接发现也不证明被链接站点已可读。

第一轮取少量优先栏目，在两个有间隔的时间点抽取近期样本，验证发布日期、原文链接、主题命中、转载、分页、动态渲染和访问规则；记录无关内容比例、重复率、平均条目大小及新增量。政策还需核对适用地区、文号、发布日期/实施日期、失效状态与转载关系。

新闻、政策、采购的频率分别由实际更新量决定。初始建议：政策/采购每天 1–2 次，企业新闻每天 2–4 次，媒体 30–60 分钟；发射维持现有受限频率，事件临近时再按上游额度评估。只是试采参数，不保证分钟级时效。

通过样本验收后才进入 `config/sources.yaml`，分小批启用，比较相关新增文章数与请求/读取/写入预算。不把本目录一次性塞进现有每分钟单源轮转；否则来源增加会拉长完整轮转，并扩大日志压力。

遇到阻断、验证码或登录需求先标注限制，使用公开替代入口；微信公众号等可作发现和人工补充，不作为必须登录的自动采集依赖。

## 地区入口索引

| 地区 | 候选入口数 | 覆盖说明 |
| --- | ---: | --- |
| 北京 | 3 | 优先试采 |
| 河北 | 7 | 基础入口，待补部门/栏目 |
| 天津 | 4 | 优先试采 |
| 山西 | 6 | 基础入口，待补部门/栏目 |
| 辽宁 | 6 | 基础入口，待补部门/栏目 |
| 内蒙古 | 7 | 基础入口，待补部门/栏目 |
| 上海 | 5 | 优先试采 |
| 黑龙江 | 6 | 基础入口，待补部门/栏目 |
| 吉林 | 2 | 基础入口，待补部门/栏目 |
| 江苏 | 5 | 优先试采 |
| 浙江 | 3 | 优先试采 |
| 安徽 | 2 | 优先试采 |
| 江西 | 1 | 基础入口，待补部门/栏目 |
| 山东 | 1 | 优先试采 |
| 福建 | 6 | 基础入口，待补部门/栏目 |
| 湖北 | 2 | 优先试采 |
| 河南 | 1 | 基础入口，待补部门/栏目 |
| 湖南 | 1 | 优先试采 |
| 广东 | 3 | 优先试采 |
| 广西 | 1 | 基础入口，待补部门/栏目 |
| 重庆 | 4 | 基础入口，待补部门/栏目 |
| 四川 | 6 | 优先试采 |
| 贵州 | 7 | 基础入口，待补部门/栏目 |
| 海南 | 1 | 优先试采 |
| 云南 | 7 | 基础入口，待补部门/栏目 |
| 陕西 | 7 | 优先试采 |
| 西藏 | 5 | 基础入口，待补部门/栏目 |
| 甘肃 | 1 | 基础入口，待补部门/栏目 |
| 新疆 | 6 | 基础入口，待补部门/栏目 |
| 香港 | 1 | 基础入口，待补部门/栏目 |
| 澳门 | 1 | 基础入口，待补部门/栏目 |
| 宁夏 | 6 | 基础入口，待补部门/栏目 |
| 青海 | 1 | 基础入口，待补部门/栏目 |
| 新疆生产建设兵团 | 1 | 基础入口，待补部门/栏目 |
| 台湾 | 0 | 待核实入口 |

## 国内公司索引

| 公司 | 赛道 | 入口 |
| --- | --- | --- |
| 蓝箭航天 | Launch | [蓝箭航天官网](https://www.landspace.com/)、[蓝箭航天新闻](https://www.landspace.com/site/) |
| 星河动力 | Launch | [星河动力官方动态](https://www.galactic-energy.cn/) |
| 天兵科技 | Launch | [天兵科技新闻](https://www.spacepioneer.cc/news) |
| 东方空间 | Launch | [东方空间新闻](https://www.orienspace.com/newsPage) |
| 星际荣耀 | Launch | [星际荣耀官方动态](https://www.i-space.com.cn/news) |
| 深蓝航天 | Launch | [深蓝航天新闻](https://www.dbaspace.com/indexs.html) |
| 中科宇航 | Launch | [中科宇航新闻](https://www.cas-space.com/) |
| 长光卫星 | Remote sensing | [长光卫星新闻](https://www.jl1.cn/index.aspx) |
| 银河航天 | Satellite internet | [银河航天官方动态](https://www.yinhehangtian.cn/yinheNews) |
| 时空道宇 | Satellite internet | [时空道宇官方动态](https://www.geespace.com/news/) |
| 微纳星空 | Satellite manufacturing | [微纳星空官方动态](https://www.minospace.cn/news_list.html) |
| 九天微星 | Satellite manufacturing | [九天微星官方动态](https://www.commsat.cn/news.html) |
| 天仪空间（天仪研究院） | SAR遥感与卫星制造 | [天仪空间（天仪研究院）官方动态](https://cn.spacety.com/news) |
| 航天驭星 | 测运控与地面站 | [航天驭星官方动态](https://www.emposat.com/dynamic/news/list) |
| 九州云箭 | 火箭发动机 | [九州云箭官方动态](https://www.jzyjspace.com/news/1/) |
| 航天宏图 | 遥感应用与企业公告 | [航天宏图官方动态](https://www.piesat.cn/website/cn/) |
| 中科星图 | 空天信息应用 | [中科星图官方动态](https://www.geovis.com.cn/news/) |
| 中科星图测控 | 卫星测运控 | [中科星图测控官方动态](https://www.spaceinsighter.com/companynews) |
| 航宇微 | 卫星芯片与遥感 | [航宇微官方动态](https://www.myorbita.net/xw/list_13.aspx) |
| 星网宇达 | 导航与测控 | [星网宇达官方动态](https://www.starneto.com/new_center/) |
| 合众思壮 | 北斗导航 | [合众思壮官方动态](https://www.unistrong.com/News/NewsList.aspx?classid=11) |
| 北斗星通 | 北斗导航 | [北斗星通官方动态](https://navchina.com/) |
| 星邑空间 | 测运控与卫星应用 | [星邑空间官方动态](https://www.xingyispace.com/news/list_29.html) |
| 中科天塔 | 星载设备与测运控 | [中科天塔官方动态](https://www.tianta.com.cn/) |
| 中国运载火箭技术研究院 | 运载火箭与商业发射 | [中国运载火箭技术研究院官方动态](https://www.calt.com/) |
| 国星宇航 | 卫星与在轨计算 | 待核实官方入口 |
| 中国星网 | 卫星互联网 | 待核实官方入口 |
| 上海垣信 | 卫星互联网 | 待核实官方入口 |
| 国电高科 | 卫星物联网 | 待核实官方入口 |
| 箭元科技 | 运载火箭 | 待核实官方入口 |
| 天链测控 | 测运控 | 待核实官方入口 |
| 易动宇航 | 空间推进 | 待核实官方入口 |
| 华力创通 | 卫星通信与导航 | 待核实官方入口 |
| 天银机电 | 卫星部件 | 待核实官方入口 |

## 全部入口

| 类别 | 名称 | 区域 | 验证状态 |
| --- | --- | --- | --- |
| existing_api | [Spaceflight News](https://api.spaceflightnewsapi.net/v4/articles/) | 国际 | configured_not_revalidated |
| existing_api | [Launch Library 2](https://ll.thespacedevs.com/2.3.0/launches/upcoming/?mode=normal&hide_recent_previous=true) | 国际 | configured_not_revalidated |
| existing_rss | [NASASpaceflight](https://www.nasaspaceflight.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SpaceNews](https://spacenews.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [Space.com](https://www.space.com/feeds/all) | 国际 | configured_not_revalidated |
| existing_rss | [Spaceflight Now](https://spaceflightnow.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [The Space Review](https://www.thespacereview.com/articles.xml) | 国际 | configured_not_revalidated |
| existing_rss | [NASA News](https://www.nasa.gov/news-release/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [ESA News](https://www.esa.int/rssfeed/Our_Activities/Space_Transportation) | 国际 | configured_not_revalidated |
| existing_rss | [Payload](https://payloadspace.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [European Spaceflight](https://europeanspaceflight.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SpaceWatch.Global](https://spacewatch.global/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SpaceQ](https://spaceq.ca/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [Via Satellite](https://www.satellitetoday.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SatNews](https://news.satnews.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SpaceRef](https://spaceref.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [Universe Today](https://www.universetoday.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [Ars Technica Space](https://arstechnica.com/space/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [SpacePolicyOnline](https://spacepolicyonline.com/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [Commercial Space Federation](https://commercialspace.org/feed/) | 国际 | configured_not_revalidated |
| existing_rss | [China in Space](https://www.china-in-space.com/feed) | 国际 | configured_not_revalidated |
| existing_rss | [China Space Monitor](https://chinaspacemonitor.substack.com/feed) | 国际 | configured_not_revalidated |
| existing_google_news_rss | [民营火箭来源](https://news.google.com/rss/search?q=%E6%B0%91%E8%90%A5%E7%81%AB%E7%AE%AD&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_google_news_rss | [卫星互联网来源](https://news.google.com/rss/search?q=%E5%8D%AB%E6%98%9F%E4%BA%92%E8%81%94%E7%BD%91&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_google_news_rss | [航天政策来源](https://news.google.com/rss/search?q=%E8%88%AA%E5%A4%A9%20%E6%94%BF%E7%AD%96&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_google_news_rss | [可回收火箭来源](https://news.google.com/rss/search?q=%E5%8F%AF%E5%9B%9E%E6%94%B6%E7%81%AB%E7%AE%AD&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_google_news_rss | [商业遥感来源](https://news.google.com/rss/search?q=%E5%95%86%E4%B8%9A%E9%81%A5%E6%84%9F&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_google_news_rss | [卫星发射来源](https://news.google.com/rss/search?q=%E5%8D%AB%E6%98%9F%E5%8F%91%E5%B0%84%20%E5%95%86%E4%B8%9A&hl=zh-CN&gl=CN&ceid=CN:zh-Hans) | 中国 | configured_not_revalidated |
| existing_official_page | [国家航天局新闻](https://www.cnsa.gov.cn/n6758823/n6758838/index.html) | 中国 | configured_not_revalidated |
| existing_official_page | [国家航天局政策公告](https://www.cnsa.gov.cn/n6758823/n6758839/index.html) | 中国 | configured_not_revalidated |
| existing_official_page | [工业和信息化部新闻](https://www.miit.gov.cn/xwdt/index.html) | 中国 | configured_not_revalidated |
| existing_official_page | [国家发展改革委政策](https://www.ndrc.gov.cn/xxgk/zcfb/) | 中国 | configured_not_revalidated |
| existing_official_page | [中国载人航天工程新闻](https://www.cmse.gov.cn/xwzx/) | 中国 | configured_not_revalidated |
| existing_official_page | [科学技术部工作动态](https://www.most.gov.cn/kjbgz/) | 中国 | configured_not_revalidated |
| existing_procurement_page | [中国政府采购网中央公告](https://www.ccgp.gov.cn/cggg/zygg/) | 中国 | configured_not_revalidated |
| existing_procurement_page | [中国政府采购网地方公告](https://www.ccgp.gov.cn/cggg/dfgg/) | 中国 | configured_not_revalidated |
| existing_procurement_page | [全国公共资源交易平台航天公告](https://www.ggzy.gov.cn/) | 中国 | configured_not_revalidated |
| existing_official_page | [北京市经信局工作动态](https://jxj.beijing.gov.cn/jxdt/gzdt/) | 北京 | configured_not_revalidated |
| existing_official_page | [北京市经信局通知公告](https://jxj.beijing.gov.cn/jxdt/tzgg/) | 北京 | configured_not_revalidated |
| existing_official_page | [上海市政府要闻](https://www.shanghai.gov.cn/nw4411/) | 上海 | configured_not_revalidated |
| existing_official_page | [上海市政府政策文件](https://www.shanghai.gov.cn/nw12344/) | 上海 | configured_not_revalidated |
| existing_official_page | [广东省政府政策文件](https://www.gd.gov.cn/zwgk/gongbao/) | 广东 | configured_not_revalidated |
| existing_official_page | [广东省发改委政策文件](https://drc.gd.gov.cn/qtwj/) | 广东 | configured_not_revalidated |
| existing_official_page | [无锡市政府新闻](https://www.wuxi.gov.cn/) | 江苏 | configured_not_revalidated |
| existing_official_page | [无锡高新区新闻](https://www.wnd.gov.cn/index.shtml) | 江苏 | configured_not_revalidated |
| existing_official_page | [中国航天科技集团新闻](https://www.spacechina.com/n25/n2014789/index.html) | 中国 | configured_not_revalidated |
| existing_official_page | [中国航天科工集团新闻](http://www.casic.com.cn/) | 中国 | configured_not_revalidated |
| existing_official_page | [蓝箭航天新闻](https://www.landspace.com/site/) | 中国 | configured_not_revalidated |
| existing_official_page | [东方空间新闻](https://www.orienspace.com/newsPage) | 中国 | configured_not_revalidated |
| existing_official_page | [天兵科技新闻](https://www.spacepioneer.cc/news) | 中国 | configured_not_revalidated |
| existing_official_page | [中科宇航新闻](https://www.cas-space.com/) | 中国 | configured_not_revalidated |
| existing_official_page | [深蓝航天新闻](https://www.dbaspace.com/indexs.html) | 中国 | configured_not_revalidated |
| existing_official_page | [长光卫星新闻](https://www.jl1.cn/index.aspx) | 中国 | configured_not_revalidated |
| existing_official_page | [卫星通信观察](https://www.satbb.com/) | 中国 | configured_not_revalidated |
| existing_official_page | [未来天玑动态](https://futurephecda.com/) | 中国 | configured_not_revalidated |
| existing_official_page | [中国载人航天飞行任务](https://www.cmse.gov.cn/fxrw/) | 中国 | configured_not_revalidated |
| existing_official_page | [中国载人航天官方公告](https://www.cmse.gov.cn/gfgg/) | 中国 | configured_not_revalidated |
| existing_official_page | [航天科技商业火箭发射机会](https://www.spacechina.com/n25/n2014789/n2014809/c4583479/content.html) | 中国 | configured_not_revalidated |
| existing_official_page | [长城公司发射机会](https://www.cgwic.com/Launchservice/piggyback.html) | 中国 | configured_not_revalidated |
| existing_official_page | [中关村商业航天联盟](https://www.zcaia.org.cn/) | 中国 | configured_not_revalidated |
| government_directory | [北京政府门户](https://www.beijing.gov.cn/) | 北京 | homepage_reachable |
| government_directory | [河北政府门户](http://www.hebei.gov.cn) | 河北 | homepage_reachable |
| government_procurement_directory | [河北 · 政府采购](http://www.ccgp-hebei.gov.cn/province/) | 河北 | linked_by_official_portal |
| government_department_directory | [河北 · 省发展和改革委员会](http://hbdrc.hebei.gov.cn/) | 河北 | linked_by_official_portal |
| government_department_directory | [河北 · 省科学技术厅](https://kjt.hebei.gov.cn/) | 河北 | linked_by_official_portal |
| government_department_directory | [河北 · 省工业和信息化厅](http://gxt.hebei.gov.cn/) | 河北 | linked_by_official_portal |
| government_department_directory | [河北 · 省财政厅](http://czt.hebei.gov.cn/) | 河北 | linked_by_official_portal |
| government_department_directory | [河北 · 省自然资源厅](http://zrzy.hebei.gov.cn/) | 河北 | linked_by_official_portal |
| government_directory | [天津政府门户](http://www.tj.gov.cn/) | 天津 | homepage_reachable |
| government_procurement_directory | [天津 · 公共资源](http://ggzy.zwfwb.tj.gov.cn/) | 天津 | linked_by_official_portal |
| government_department_directory | [天津 · 市发展改革委](http://fzgg.tj.gov.cn/) | 天津 | linked_by_official_portal |
| government_department_directory | [天津 · 市工业和信息化局](http://gyxxh.tj.gov.cn/) | 天津 | linked_by_official_portal |
| government_directory | [山西政府门户](http://www.shanxi.gov.cn) | 山西 | homepage_reachable |
| government_department_directory | [山西 · 省发展和改革委员会](http://fgw.shanxi.gov.cn/) | 山西 | linked_by_official_portal |
| government_department_directory | [山西 · 省科学技术厅](http://kjt.shanxi.gov.cn/) | 山西 | linked_by_official_portal |
| government_department_directory | [山西 · 省工业和信息化厅](http://gxt.shanxi.gov.cn/) | 山西 | linked_by_official_portal |
| government_department_directory | [山西 · 省财政厅](http://czt.shanxi.gov.cn/) | 山西 | linked_by_official_portal |
| government_department_directory | [山西 · 省自然资源厅](http://zrzyt.shanxi.gov.cn/) | 山西 | linked_by_official_portal |
| government_directory | [辽宁政府门户](http://www.ln.gov.cn/) | 辽宁 | homepage_reachable |
| government_department_directory | [辽宁 · 省发展改革委](http://fgw.ln.gov.cn/) | 辽宁 | linked_by_official_portal |
| government_department_directory | [辽宁 · 省科技厅](http://kjt.ln.gov.cn/) | 辽宁 | linked_by_official_portal |
| government_department_directory | [辽宁 · 省工业和信息化厅](http://gxt.ln.gov.cn/) | 辽宁 | linked_by_official_portal |
| government_department_directory | [辽宁 · 省财政厅](http://czt.ln.gov.cn/) | 辽宁 | linked_by_official_portal |
| government_department_directory | [辽宁 · 省自然资源厅](http://zrzy.ln.gov.cn/) | 辽宁 | linked_by_official_portal |
| government_directory | [内蒙古政府门户](http://www.nmg.gov.cn/) | 内蒙古 | homepage_reachable |
| government_department_directory | [内蒙古 · 发展和改革委员会](http://fgw.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_department_directory | [内蒙古 · 科学技术厅](http://kjt.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_department_directory | [内蒙古 · 工业和信息化厅](http://gxt.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_department_directory | [内蒙古 · 财政厅](http://czt.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_department_directory | [内蒙古 · 自然资源厅](http://zrzy.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_procurement_directory | [内蒙古 · 自治区公共资源交易中心](http://ggzyjy.nmg.gov.cn/) | 内蒙古 | linked_by_official_portal |
| government_directory | [上海政府门户](http://www.shanghai.gov.cn) | 上海 | homepage_reachable |
| government_department_directory | [上海 · 市发展改革委](http://fgw.sh.gov.cn/) | 上海 | linked_by_official_portal |
| government_department_directory | [上海 · 市经济信息化委](http://www.sheitc.sh.gov.cn/) | 上海 | linked_by_official_portal |
| government_directory | [黑龙江政府门户](http://www.hlj.gov.cn/) | 黑龙江 | homepage_reachable |
| government_department_directory | [黑龙江 · 省发展和改革委员会](http://drc.hlj.gov.cn/) | 黑龙江 | linked_by_official_portal |
| government_department_directory | [黑龙江 · 省科学技术厅](http://kjt.hlj.gov.cn/) | 黑龙江 | linked_by_official_portal |
| government_department_directory | [黑龙江 · 省工业和信息化厅](http://gxt.hlj.gov.cn/) | 黑龙江 | linked_by_official_portal |
| government_department_directory | [黑龙江 · 省财政厅](http://czt.hlj.gov.cn/) | 黑龙江 | linked_by_official_portal |
| government_department_directory | [黑龙江 · 省自然资源厅](http://zrzyt.hlj.gov.cn/) | 黑龙江 | linked_by_official_portal |
| government_directory | [吉林政府门户](http://www.jl.gov.cn/) | 吉林 | homepage_reachable |
| government_procurement_directory | [吉林 · 吉林省公共资源交易一体化平台](https://www.jl.gov.cn/zwfw/ggzyjy/index.html) | 吉林 | linked_by_official_portal |
| government_directory | [江苏政府门户](http://www.jiangsu.gov.cn) | 江苏 | homepage_probe_failed |
| government_directory | [浙江政府门户](http://www.zj.gov.cn) | 浙江 | homepage_reachable |
| government_procurement_directory | [浙江 · 公共资源交易](https://ggzy.zj.gov.cn/) | 浙江 | linked_by_official_portal |
| government_procurement_directory | [浙江 · 政府采购](https://zfcg.czt.zj.gov.cn/) | 浙江 | linked_by_official_portal |
| government_directory | [安徽政府门户](http://www.ah.gov.cn/) | 安徽 | homepage_reachable |
| government_directory | [江西政府门户](http://www.jiangxi.gov.cn) | 江西 | homepage_probe_failed |
| government_directory | [山东政府门户](http://www.shandong.gov.cn/) | 山东 | homepage_probe_failed |
| government_directory | [福建政府门户](http://www.fujian.gov.cn/) | 福建 | homepage_reachable |
| government_department_directory | [福建 · 省科技厅](https://kjt.fujian.gov.cn/) | 福建 | linked_by_official_portal |
| government_department_directory | [福建 · 省财政厅](https://czt.fujian.gov.cn/) | 福建 | linked_by_official_portal |
| government_department_directory | [福建 · 省自然资源厅](https://zrzyt.fujian.gov.cn/) | 福建 | linked_by_official_portal |
| government_procurement_directory | [福建 · 福建省公共资源交易电子公共服务平台](https://ggzyfw.fujian.gov.cn/) | 福建 | linked_by_official_portal |
| government_procurement_directory | [福建 · 福建省公共资源交易电子行政监督平台](https://ggzyjd.fujian.gov.cn/) | 福建 | linked_by_official_portal |
| government_directory | [湖北政府门户](http://www.hubei.gov.cn/) | 湖北 | homepage_probe_failed |
| government_directory | [河南政府门户](http://www.henan.gov.cn/) | 河南 | homepage_reachable |
| government_directory | [湖南政府门户](http://www.hunan.gov.cn/) | 湖南 | homepage_probe_failed |
| government_directory | [广东政府门户](http://www.gd.gov.cn/) | 广东 | homepage_reachable |
| government_directory | [广西政府门户](http://www.gxzf.gov.cn/) | 广西 | homepage_probe_failed |
| government_directory | [重庆政府门户](http://www.cq.gov.cn/) | 重庆 | homepage_reachable |
| government_department_directory | [重庆 · 市发展改革委](http://fzggw.cq.gov.cn/) | 重庆 | linked_by_official_portal |
| government_department_directory | [重庆 · 市经济信息委](https://jjxxw.cq.gov.cn/) | 重庆 | linked_by_official_portal |
| government_department_directory | [重庆 · 市规划自然资源局](http://ghzrzyj.cq.gov.cn/) | 重庆 | linked_by_official_portal |
| government_directory | [四川政府门户](http://www.sc.gov.cn/) | 四川 | homepage_reachable |
| government_department_directory | [四川 · 自然资源](https://dnr.sc.gov.cn/) | 四川 | linked_by_official_portal |
| government_department_directory | [四川 · 省发展改革委](http://fgw.sc.gov.cn/) | 四川 | linked_by_official_portal |
| government_department_directory | [四川 · 经济和信息化厅](http://jxt.sc.gov.cn/) | 四川 | linked_by_official_portal |
| government_department_directory | [四川 · 科技厅](http://kjt.sc.gov.cn/) | 四川 | linked_by_official_portal |
| government_department_directory | [四川 · 财政厅](http://czt.sc.gov.cn/) | 四川 | linked_by_official_portal |
| government_directory | [贵州政府门户](http://www.guizhou.gov.cn/) | 贵州 | homepage_reachable |
| government_department_directory | [贵州 · 省发展改革委](http://fgw.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_department_directory | [贵州 · 省科技厅](http://kjt.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_department_directory | [贵州 · 省工业和信息化厅](http://gxt.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_department_directory | [贵州 · 省财政厅](http://czt.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_department_directory | [贵州 · 省自然资源厅](https://zrzy.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_procurement_directory | [贵州 · 省公共资源交易中心](https://ggzy.guizhou.gov.cn/) | 贵州 | linked_by_official_portal |
| government_directory | [海南政府门户](https://www.hainan.gov.cn/) | 海南 | homepage_reachable |
| government_directory | [云南政府门户](http://www.yn.gov.cn/) | 云南 | homepage_reachable |
| government_department_directory | [云南 · 云南省发展和改革委员会](https://yndrc.yn.gov.cn/) | 云南 | linked_by_official_portal |
| government_department_directory | [云南 · 云南省工业和信息化厅](http://gxt.yn.gov.cn/) | 云南 | linked_by_official_portal |
| government_department_directory | [云南 · 云南省科学技术厅](http://kjt.yn.gov.cn/) | 云南 | linked_by_official_portal |
| government_department_directory | [云南 · 云南省财政厅](http://czt.yn.gov.cn/) | 云南 | linked_by_official_portal |
| government_department_directory | [云南 · 云南省自然资源厅](http://dnr.yn.gov.cn/) | 云南 | linked_by_official_portal |
| government_procurement_directory | [云南 · 云南省政府采购](http://www.yngp.com/) | 云南 | linked_by_official_portal |
| government_directory | [陕西政府门户](http://www.shaanxi.gov.cn) | 陕西 | homepage_reachable |
| government_department_directory | [陕西 · 省发展改革委](http://sndrc.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_department_directory | [陕西 · 省科技厅](http://kjt.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_department_directory | [陕西 · 省工业和信息化厅](http://gxt.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_department_directory | [陕西 · 省财政厅](http://czt.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_department_directory | [陕西 · 省自然资源厅](http://zrzyt.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_procurement_directory | [陕西 · 省公共资源交易中心](http://ggzy.shaanxi.gov.cn/) | 陕西 | linked_by_official_portal |
| government_directory | [西藏政府门户](http://www.xizang.gov.cn/) | 西藏 | homepage_reachable |
| government_department_directory | [西藏 · 自治区发展和改革委员会](http://drc.xizang.gov.cn/) | 西藏 | linked_by_official_portal |
| government_department_directory | [西藏 · 自治区科学技术厅](http://sti.xizang.gov.cn/) | 西藏 | linked_by_official_portal |
| government_department_directory | [西藏 · 自治区经济和信息化厅](http://jxt.xizang.gov.cn/) | 西藏 | linked_by_official_portal |
| government_department_directory | [西藏 · 自治区自然资源厅](http://zrzyt.xizang.gov.cn/) | 西藏 | linked_by_official_portal |
| government_directory | [甘肃政府门户](http://www.gansu.gov.cn/) | 甘肃 | homepage_probe_failed |
| government_directory | [新疆政府门户](http://www.xinjiang.gov.cn/) | 新疆 | homepage_reachable |
| government_department_directory | [新疆 · 发展和改革委员会](http://xjdrc.xinjiang.gov.cn/) | 新疆 | linked_by_official_portal |
| government_department_directory | [新疆 · 科学技术厅](http://kjt.xinjiang.gov.cn/) | 新疆 | linked_by_official_portal |
| government_department_directory | [新疆 · 工业和信息化厅](http://gxt.xinjiang.gov.cn/) | 新疆 | linked_by_official_portal |
| government_department_directory | [新疆 · 财政厅](http://czt.xinjiang.gov.cn/) | 新疆 | linked_by_official_portal |
| government_department_directory | [新疆 · 自然资源厅](http://zrzyt.xinjiang.gov.cn/) | 新疆 | linked_by_official_portal |
| government_directory | [香港政府门户](http://www.gov.hk/) | 香港 | homepage_reachable |
| government_directory | [澳门政府门户](http://www.gov.mo/) | 澳门 | homepage_reachable |
| government_directory | [宁夏政府门户](http://www.nx.gov.cn/) | 宁夏 | homepage_reachable |
| government_department_directory | [宁夏 · 自治区发展和改革委员会](http://fzggw.nx.gov.cn/) | 宁夏 | linked_by_official_portal |
| government_department_directory | [宁夏 · 自治区科学技术厅](https://kjt.nx.gov.cn/) | 宁夏 | linked_by_official_portal |
| government_department_directory | [宁夏 · 自治区工业和信息化厅](http://gxt.nx.gov.cn/) | 宁夏 | linked_by_official_portal |
| government_department_directory | [宁夏 · 自治区财政厅](http://czt.nx.gov.cn/) | 宁夏 | linked_by_official_portal |
| government_department_directory | [宁夏 · 自治区自然资源厅](http://zrzyt.nx.gov.cn/) | 宁夏 | linked_by_official_portal |
| government_directory | [青海政府门户](http://www.qinghai.gov.cn/) | 青海 | homepage_probe_failed |
| government_directory | [新疆生产建设兵团政府门户](http://www.xjbt.gov.cn/) | 新疆生产建设兵团 | homepage_probe_failed |
| government_listing | [江苏工信公告公示](https://gxt.jiangsu.gov.cn/col/col6281/index.html) | 江苏 | search_discovered_listing |
| government_listing | [江苏工信政策发布](https://gxt.jiangsu.gov.cn/col/col6299/index.html) | 江苏 | search_discovered_listing |
| government_listing | [湖北经信热点聚焦](https://jxt.hubei.gov.cn/bmdt/rdjj/index_1.shtml) | 湖北 | search_discovered_listing |
| government_listing | [芜湖工信通知公告](https://gxj.wuhu.gov.cn/xwzx/tzgg/index.html) | 安徽 | search_discovered_listing |
| company_official | [星河动力官方动态](https://www.galactic-energy.cn/) | 中国 | search_discovered |
| company_official | [星际荣耀官方动态](https://www.i-space.com.cn/news) | 中国 | search_discovered |
| company_official | [银河航天官方动态](https://www.yinhehangtian.cn/yinheNews) | 中国 | search_discovered |
| company_official | [时空道宇官方动态](https://www.geespace.com/news/) | 中国 | reader_open_listing |
| company_official | [微纳星空官方动态](https://www.minospace.cn/news_list.html) | 中国 | reader_open_listing |
| company_official | [九天微星官方动态](https://www.commsat.cn/news.html) | 中国 | search_discovered |
| company_official | [天仪空间（天仪研究院）官方动态](https://cn.spacety.com/news) | 中国 | search_discovered |
| company_official | [航天驭星官方动态](https://www.emposat.com/dynamic/news/list) | 中国 | reader_open_empty |
| company_official | [九州云箭官方动态](https://www.jzyjspace.com/news/1/) | 中国 | search_discovered |
| company_official | [航天宏图官方动态](https://www.piesat.cn/website/cn/) | 中国 | search_discovered |
| company_official | [中科星图官方动态](https://www.geovis.com.cn/news/) | 中国 | search_discovered |
| company_official | [中科星图测控官方动态](https://www.spaceinsighter.com/companynews) | 中国 | search_discovered |
| company_official | [航宇微官方动态](https://www.myorbita.net/xw/list_13.aspx) | 中国 | search_discovered |
| company_official | [星网宇达官方动态](https://www.starneto.com/new_center/) | 中国 | search_discovered |
| company_official | [合众思壮官方动态](https://www.unistrong.com/News/NewsList.aspx?classid=11) | 中国 | search_discovered |
| company_official | [北斗星通官方动态](https://navchina.com/) | 中国 | search_discovered |
| company_official | [星邑空间官方动态](https://www.xingyispace.com/news/list_29.html) | 中国 | search_discovered |
| company_official | [中科天塔官方动态](https://www.tianta.com.cn/) | 中国 | search_discovered |
| company_official | [中国运载火箭技术研究院官方动态](https://www.calt.com/) | 中国 | search_discovered |
| company_homepage | [SpaceX官网](https://www.spacex.com/) | 国际 | existing_entity_website |
| company_homepage | [Rocket Lab官网](https://www.rocketlabusa.com/) | 国际 | existing_entity_website |
| company_homepage | [Blue Origin官网](https://www.blueorigin.com/) | 国际 | existing_entity_website |
| company_homepage | [Relativity Space官网](https://www.relativityspace.com/) | 国际 | existing_entity_website |
| company_homepage | [Firefly Aerospace官网](https://fireflyspace.com/) | 国际 | existing_entity_website |
| company_homepage | [Sierra Space官网](https://www.sierraspace.com/) | 国际 | existing_entity_website |
| company_homepage | [Axiom Space官网](https://www.axiomspace.com/) | 国际 | existing_entity_website |
| company_homepage | [Intuitive Machines官网](https://www.intuitivemachines.com/) | 国际 | existing_entity_website |
| company_homepage | [Planet Labs官网](https://www.planet.com/) | 国际 | existing_entity_website |
| company_homepage | [Maxar官网](https://www.maxar.com/) | 国际 | existing_entity_website |
| company_homepage | [AST SpaceMobile官网](https://ast-science.com/) | 国际 | existing_entity_website |
| company_homepage | [蓝箭航天官网](https://www.landspace.com/) | 中国 | existing_entity_website |
| agency_official | [ESA新闻中心](https://www.esa.int/Newsroom/) | 国际 | search_discovered |
| agency_feed_discovery | [ESA官方RSS目录](https://www.esa.int/Services/RSS_Feeds) | 国际 | search_discovered |
| agency_official | [JAXA新闻稿](https://global.jaxa.jp/press/2026/) | 国际 | search_discovered |
| agency_official | [ISRO新闻](https://www.isro.gov.in/Press.html) | 国际 | search_discovered |

## 证据边界

省级入口来自[北京市政府公开页脚目录](https://www.beijing.gov.cn/images/public_foot_response_2020.js)及一次首页探测。部门入口来自这些公开门户的链接；并非猜测域名。单条政策样本见 `evidence.json`，不混入连续来源数。

企业检索确认示例：[银河航天新闻](https://www.yinhehangtian.cn/yinheNews)、[时空道宇企业动态](https://www.geespace.com/news/)、[微纳星空新闻](https://www.minospace.cn/news_list.html)。航天驭星页面在阅读器中未显示新闻，不标记可采。航天宏图命中详情模板，暂以官网导航占位，待定位列表。

本轮没有查询生产D1、轮询 health、调整套餐或改动线上采集。PR #33/#34 的恢复验收仍等待此前记录的配额重置窗口，不以来源研究替代线上恢复结论。

本地已检查 JSON 结构、URL 格式、重复入口、地区/公司引用、候选状态、部门目录路径及新增文件敏感信息模式；没有用这些结构检查替代来源试采。

`tsc -b --noEmit`、`eslint .`、`git diff --check` 和研究文件空白检查通过。本轮只新增研究文档和JSON，未修改运行代码、数据库或来源配置，未新增采集行为测试或执行生产部署。
