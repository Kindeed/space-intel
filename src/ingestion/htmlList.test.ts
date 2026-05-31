import { describe, expect, it } from 'vitest';
import { absoluteUrl, extractDate, extractHtmlListLinks, stripLeadingDatePrefix } from './htmlList';

describe('HTML list extraction', () => {
  it('keeps only http and https list links', () => {
    expect(absoluteUrl('/notice/demo.html', 'https://example.com/list/')).toBe('https://example.com/notice/demo.html');
    expect(absoluteUrl('http://example.com/notice/demo.html', 'https://example.com/list/')).toBe('http://example.com/notice/demo.html');
    expect(absoluteUrl('/notice/demo.html?keyword=space&amp;page=1', 'https://example.com/list/')).toBe('https://example.com/notice/demo.html?keyword=space&page=1');
    expect(absoluteUrl('javascript:alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('javascript&#58;alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('java script:alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('java\tscript:alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('java\u00a0script:alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('java\u200bscript:alert(1)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('data :text/html,hi', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('{javascript:;}', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('{{javascript:;}}', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('void(0)', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('void 0', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('return false;', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('#', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('{{#}}', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('mailto:contact@example.com', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('mail to:contact@example.com', 'https://example.com/list/')).toBeNull();
    expect(absoluteUrl('te\u200bl:+8613800000000', 'https://example.com/list/')).toBeNull();
  });

  it('drops non-web hrefs while extracting list links', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><a href="javascript:alert(1)">商业航天政策公告</a></li>
        <li><a href="{javascript:;}">力擎系列发动机</a></li>
        <li><a href="{{javascript:;}}">商业航天模板伪链接</a></li>
        <li><a href="{{#}}">商业航天模板锚点</a></li>
        <li><a href="void 0">商业航天 void 占位</a></li>
        <li><a href="return false;">商业航天 return false 占位</a></li>
        <li><a href="java script:alert(1)">商业航天混淆脚本链接</a></li>
        <li><a href="java&nbsp;script:alert(1)">商业航天 NBSP 混淆脚本链接</a></li>
        <li><a href="java&#x200b;script:alert(1)">商业航天零宽混淆脚本链接</a></li>
        <li><a href="data :text/html,hi">商业航天混淆数据链接</a></li>
        <li><a href="javascript&#58;alert(1)">商业航天伪链接</a></li>
        <li><a href="#">分享到微信</a></li>
        <li><a href="mailto:contact@example.com">商业航天联系邮箱</a></li>
        <li><a href="mail&nbsp;to:contact@example.com">商业航天混淆联系邮箱</a></li>
        <li><a href="te&#x200b;l:+8613800000000">商业航天混淆联系电话</a></li>
        <li><a href="./valid.html?keyword=space&amp;page=1">商业航天有效公告</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '商业航天有效公告',
        url: 'https://example.com/news/valid.html?keyword=space&page=1',
        contextText: '商业航天有效公告',
      },
    ]);
  });

  it('extracts unquoted and spaced href attribute values from legacy pages', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><a href=./unquoted.html>商业航天无引号公告</a></li>
        <li><a href = "./spaced.html">商业航天空格属性公告</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '商业航天无引号公告', url: 'https://example.com/news/unquoted.html' },
      { title: '商业航天空格属性公告', url: 'https://example.com/news/spaced.html' },
    ]);
  });

  it('ignores links embedded inside script and style blocks', () => {
    const links = extractHtmlListLinks(
      `<script>
        document.write('<a href="+ url +">商业航天分页伪链接</a>');
      </script>
      <style>
        .fake::before { content: '<a href="./style.html">商业航天样式伪链接</a>'; }
      </style>
      <main>
        <a href="./real.html">商业航天真实新闻发布</a>
      </main>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '商业航天真实新闻发布', url: 'https://example.com/news/real.html' },
    ]);
  });

  it('extracts every usable link from the same list block', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a href="./category.html">通知公告</a>
          <span>2026-05-09</span>
          <a href="./space-policy.html">商业航天公共试验平台申报通知</a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '商业航天公共试验平台申报通知', url: 'https://example.com/news/space-policy.html' },
    ]);
    expect(links[0].contextText).toContain('2026-05-09');
  });

  it('prefers anchor title attributes over card summary text', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a href="./space.html" title="神舟二十二号载人飞船顺利撤离空间站组合体">
            <div>
              <div>神舟二十二号载人飞船顺利撤离空间站组合体<span>2026-05-29</span></div>
              <div>北京时间2026年5月29日14时44分，神舟二十二号载人飞船与空间站组合体成功分离。</div>
            </div>
          </a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '神舟二十二号载人飞船顺利撤离空间站组合体',
        url: 'https://example.com/news/space.html',
        contextText:
          '神舟二十二号载人飞船顺利撤离空间站组合体 2026-05-29 北京时间2026年5月29日14时44分，神舟二十二号载人飞船与空间站组合体成功分离。',
      },
    ]);
  });

  it('extracts legacy spaced title attributes before card body text', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a href="./space.html" title = "商业航天政策公告发布">
            <div>
              <span>2026-05-30</span>
              <span>商业航天政策公告发布</span>
              <p>这是列表卡片摘要，不应该进入公开标题。</p>
            </div>
          </a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '商业航天政策公告发布',
        url: 'https://example.com/news/space.html',
        contextText: '2026-05-30 商业航天政策公告发布 这是列表卡片摘要，不应该进入公开标题。',
      },
    ]);
  });

  it('does not treat data-href and data-title as real anchor attributes', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a data-href="./tracking.html" data-title="低质量跟踪标题" href="./article.html" title="商业航天真实公告">
            商业航天真实公告摘要
          </a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '商业航天真实公告',
        url: 'https://example.com/news/article.html',
        contextText: '商业航天真实公告摘要',
      },
    ]);
  });

  it('does not treat child element title attributes as anchor titles', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a href="./article.html">
            <img src="./thumb.jpg" title="缩略图">
            <span>商业航天真实公告发布</span>
          </a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '商业航天真实公告发布',
        url: 'https://example.com/news/article.html',
        contextText: '商业航天真实公告发布',
      },
    ]);
  });

  it('also extracts standalone article card links when list blocks exist', () => {
    const links = extractHtmlListLinks(
      `<nav>
        <ul>
          <li><a href="./category.html">新闻动态</a></li>
          <li><a href="./listed.html">商业航天 listed article</a></li>
        </ul>
      </nav>
      <main>
        <div class="news-card">
          <a href="./card.html">航天科工召开数字航天工作会</a>
        </div>
      </main>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '商业航天 listed article', url: 'https://example.com/news/listed.html' },
      { title: '航天科工召开数字航天工作会', url: 'https://example.com/news/card.html' },
    ]);
    expect(links[1].contextText).toBe('航天科工召开数字航天工作会');
  });

  it('keeps nearby dates before standalone article card links', () => {
    const links = extractHtmlListLinks(
      `<main>
        <div class="news-card">
          <span>2026/03/30</span>
          <a href="./space.html">力箭二号遥一运载火箭成功发射轻舟初样试飞船</a>
        </div>
      </main>`,
      'https://example.com/news/',
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      title: '力箭二号遥一运载火箭成功发射轻舟初样试飞船',
      url: 'https://example.com/news/space.html',
    });
    expect(links[0].contextText).toContain('2026/03/30');
  });

  it('keeps nearby dates after standalone article card links', () => {
    const links = extractHtmlListLinks(
      `<main>
        <div class="news-card">
          <a href="./casic.html">关于航天科工许可字库的使用说明</a>
          <span>2024.06.18</span>
        </div>
      </main>`,
      'https://example.com/news/',
    );

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      title: '关于航天科工许可字库的使用说明',
      url: 'https://example.com/news/casic.html',
    });
    expect(links[0].contextText).toContain('2024.06.18');
  });

  it('does not borrow nearby dates across adjacent standalone cards', () => {
    const links = extractHtmlListLinks(
      `<main>
        <div class="news-card">
          <a href="./first.html">商业航天第一条真实新闻发布</a>
        </div>
        <div class="news-card">
          <span>2026-05-30</span>
          <a href="./second.html">商业航天第二条真实新闻发布</a>
        </div>
      </main>`,
      'https://example.com/news/',
    );

    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      title: '商业航天第一条真实新闻发布',
      url: 'https://example.com/news/first.html',
      contextText: '商业航天第一条真实新闻发布',
    });
    expect(links[1]).toMatchObject({
      title: '商业航天第二条真实新闻发布',
      url: 'https://example.com/news/second.html',
    });
    expect(links[1].contextText).toContain('2026-05-30');
  });

  it('skips invalid nearby dates before choosing standalone card context', () => {
    const links = extractHtmlListLinks(
      `<main>
        <div class="news-card">
          <span>2026-05-30</span>
          <span>2026-13-40</span>
          <a href="./before.html">商业航天前置日期真实新闻发布</a>
        </div>
        <div class="news-card">
          <a href="./after.html">商业航天后置日期真实新闻发布</a>
          <span>2026-02-30</span>
          <span>2026-06-01</span>
        </div>
      </main>`,
      'https://example.com/news/',
    );

    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      title: '商业航天前置日期真实新闻发布',
      contextText: '商业航天前置日期真实新闻发布 2026-05-30',
    });
    expect(links[1]).toMatchObject({
      title: '商业航天后置日期真实新闻发布',
      contextText: '商业航天后置日期真实新闻发布 2026-06-01',
    });
  });

  it('filters observed standalone section and product entry titles', () => {
    const links = extractHtmlListLinks(
      `<main>
        <a href="./culture.html">航天文化</a>
        <a href="./plan.html">预定发射</a>
        <a href="./service.html">发射服务</a>
        <a href="./equipment.html">产品设备</a>
        <a href="./product-service.html">产品服务</a>
        <a href="./products.html">产品及服务</a>
        <a href="./products-and-services.html">产品与服务</a>
        <a href="./core.html">核心产品</a>
        <a href="./route.html">技术路线</a>
        <a href="./infrastructure.html">基础设施</a>
        <a href="./latest.html">最新新闻</a>
        <a href="./news-center.html">新闻中心</a>
        <a href="./media.html">媒体报道</a>
        <a href="./download.html">资料下载</a>
        <a href="./photo-download.html">图片下载</a>
        <a href="./wisdom.html">蓝箭智慧</a>
        <a href="./beijing-rd.html">北京研发中心</a>
        <a href="./xian-rd.html">西安研发分中心</a>
        <a href="./yangtze-rd.html">长三角区域中心</a>
        <a href="./about.html">关于我们</a>
        <a href="./culture.html">企业文化</a>
        <a href="./company-news.html">公司新闻</a>
        <a href="./privacy.html">隐私政策</a>
        <a href="./legal.html">法律声明</a>
        <a href="./detail-more.html">了解详情</a>
        <a href="./join.html">加入我们</a>
        <a href="./gravity-engine.html">原力发动机</a>
        <a href="./new-product.html">创新产品</a>
        <a href="./cloud.html">航天云网平台</a>
        <a href="./cultural-goods.html">天兵文创</a>
        <a href="./engine.html">Engine</a>
        <a href="./home.html">Home</a>
        <a href="./news.html">News</a>
        <a href="./careers.html">Careers</a>
        <a href="./about-us.html">About us</a>
        <a href="./shop.html">Shop</a>
        <a href="./cooperation.html">Cooperation</a>
        <a href="./more.html">VIEW MORE</a>
        <a href="./gravity.html">引力火箭</a>
        <a href="./launch.html">Launch Vehicle</a>
        <a href="./tl2.html">TL-2</a>
        <a href="./tl3.html">TL-3</a>
        <a href="./th11.html">TH-11</a>
        <a href="./engine-series.html">发动机系列</a>
        <a href="./propulsion.html">力擎系列发动机</a>
        <a href="./upper-stage.html">力巡上面级</a>
        <a href="./product.html">力箭一号运载火箭</a>
        <a href="./series.html">力箭系列火箭</a>
        <a href="./photo.html">以镜头为笔，绘航天画卷，共赴星辰之约。</a>
        <a href="./remote.html">遥感应用</a>
        <a href="./constellation.html">星座简介</a>
        <a href="./online-product.html">线上产品</a>
        <a href="./jl1mall.html">吉林一号网</a>
        <a href="./promotion.html">宣传推广</a>
        <a href="./infrared.html">红外系列卫星</a>
        <a href="./share-wechat.html">分享到微信</a>
        <a href="./share-weibo.html">分享到新浪微博</a>
        <a href="./share-qq.html">分享到qq</a>
        <a href="./article.html">力箭一号遥二运载火箭发射任务圆满成功</a>
      </main>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '力箭一号遥二运载火箭发射任务圆满成功', url: 'https://example.com/news/article.html' },
    ]);
  });

  it('filters observed CNSA section and breadcrumb links', () => {
    const links = extractHtmlListLinks(
      `<main>
        <a href="./publish.html">信息发布</a>
        <a href="./cooperation.html">国际合作</a>
        <a href="./gallery.html">> 精彩图集</a>
        <a href="./home.html">国家航天局</a>
        <a href="./related.html">相关链接</a>
        <a href="./leader.html">领导活动</a>
        <a href="./politics.html">时政要闻</a>
        <a href="./division.html">司局动态</a>
        <a href="./local.html">地方工作</a>
        <a href="./cmse-test.html">航天技术试验</a>
        <a href="./press.html">新闻发布会</a>
        <a href="./feedback.html">意见反馈</a>
        <a href="./moondata.html">探月工程数据发布与信息服务系统</a>
        <a href="https://www.miit.gov.cn/">中华人民共和国工业和信息化部</a>
        <a href="http://www.spacechina.com/">中国航天科技集团有限公司</a>
        <a href="https://beian.miit.gov.cn/">京ICP备05081655号</a>
        <a href="https://beian.miit.gov.cn/">版权所有 © 东方空间 鲁 ICP 备 2021043021 号</a>
        <a href="https://beian.miit.gov.cn/">京公网安备11040102700100号</a>
        <a href="./article.html">嫦娥六号月球样品研究取得新进展</a>
      </main>`,
      'https://www.cnsa.gov.cn/n6758823/n6758838/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      {
        title: '嫦娥六号月球样品研究取得新进展',
        url: 'https://www.cnsa.gov.cn/n6758823/n6758838/article.html',
      },
    ]);
  });

  it('filters date-only and detail anchors before URL dedupe', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <a href="./space.html">[2026-05-28]</a>
          <a href="./space.html">商业航天发动机试车任务完成</a>
        </li>
        <li>
          <a href="./detail.html">【详情】</a>
          <a href="./all.html">[查看全部]</a>
          <a href="./round-detail.html">（详情）</a>
          <a href="./round-all.html">(查看全部)</a>
          <a href="./nested-detail.html">【[详情]】</a>
          <a href="./nested-all.html">（【查看全部】）</a>
          <a href="./zero-width-detail.html">详&#x200b;情</a>
          <a href="./zero-width-all.html">查&#x200b;看全部</a>
        </li>
        <li>
          <a href="./slash-date.html">2026/03/30</a>
          <a href="./day-first.html">11/10/2025</a>
          <a href="./round-date.html">（2026-05-28）</a>
          <a href="./spaced-date.html">【2026 年 5 月 28 日】</a>
          <a href="./nested-date.html">（【2026-05-28】）</a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, url: link.url }))).toEqual([
      { title: '商业航天发动机试车任务完成', url: 'https://example.com/news/space.html' },
    ]);
  });

  it('extracts day-first slash dates used by company news cards', () => {
    expect(extractDate('11/10/2025 引力一号实现第二次海上发射')).toBe('2025-10-11T00:00:00Z');
    expect(extractDate('13/09/2025 东方空间亮相山东商业航天记者会')).toBe('2025-09-13T00:00:00Z');
    expect(extractDate('12/31/2025 箭指苍穹，创见未来')).toBe('2025-12-31T00:00:00Z');
    expect(extractDate('32/09/2025 无效日期')).toBeNull();
  });

  it('extracts year-first dates with spaces around Chinese separators', () => {
    expect(extractDate('发布日期：2026 年 5 月 30 日 商业航天政策公告')).toBe('2026-05-30T00:00:00Z');
    expect(extractDate('页面占位 2026 年 13 月 40 日 发布时间 2026 年 5 月 31 日')).toBe('2026-05-31T00:00:00Z');
  });

  it('skips invalid date-shaped candidates before later valid dates', () => {
    expect(extractDate('页面占位 2026-13-40 发布时间 2026-05-30')).toBe('2026-05-30T00:00:00Z');
    expect(extractDate('页面占位 2026-02-30 发布时间 13/09/2025')).toBe('2025-09-13T00:00:00Z');
  });

  it('strips leading source dates while preserving undated titles', () => {
    expect(stripLeadingDatePrefix('2026-05-30 商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('【2026年5月30日】商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('[11/10/2025] 引力一号完成海上发射')).toBe('引力一号完成海上发射');
    expect(stripLeadingDatePrefix('2026-05-30T08:00:00Z 商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('2026-05-30 08:00 商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('【2026 年 5 月 30 日】商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('2026 年 5 月 30 日 08:00 商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('商业航天政策公告发布')).toBe('商业航天政策公告发布');
    expect(stripLeadingDatePrefix('2026-13-40 商业航天政策公告发布')).toBe('2026-13-40 商业航天政策公告发布');
    expect(stripLeadingDatePrefix('2026-13-40T08:00:00Z 商业航天政策公告发布')).toBe('2026-13-40T08:00:00Z 商业航天政策公告发布');
    expect(stripLeadingDatePrefix('【2026年2月30日】商业航天政策公告发布')).toBe('【2026年2月30日】商业航天政策公告发布');
  });

  it('decodes decimal and hexadecimal numeric entities in extracted list text', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><span>2026&#x5e74;05&#x6708;09&#x65e5;</span><a href="./space.html">商业航天&#183;卫星互联网&#x2014;政策发布</a></li>
        <li><span>2026&#24180 05&#26376 10&#26085</span><a href="./semicolonless-decimal.html">商业航天&#183 卫星互联网&#8212 政策发布</a></li>
        <li><span>2026&#x5e74 05&#x6708 11&#x65e5</span><a href="./semicolonless-hex.html">商业航天&#x00b7 卫星互联网&#x2014 政策发布</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links.map((link) => ({ title: link.title, contextText: link.contextText }))).toEqual([
      { title: '商业航天·卫星互联网—政策发布', contextText: '2026年05月09日 商业航天·卫星互联网—政策发布' },
      { title: '商业航天· 卫星互联网— 政策发布', contextText: '2026年 05月 10日 商业航天· 卫星互联网— 政策发布' },
      { title: '商业航天· 卫星互联网— 政策发布', contextText: '2026年 05月 11日 商业航天· 卫星互联网— 政策发布' },
    ]);
  });

  it('decodes named entities case-insensitively in extracted list text', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><a href="./space.html">商业航天&amp;卫星&apos;应用&NBSP;&QUOT;政策&QUOT;</a></li>
        <li><a href="./semicolonless.html">商业航天&amp 卫星&nbsp 应用</a></li>
        <li><a href="./literal.html">商业航天&ampere&nbspword 术语</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links[0]).toMatchObject({
      title: '商业航天&卫星\'应用 "政策"',
      contextText: '商业航天&卫星\'应用 "政策"',
    });
    expect(links[1]).toMatchObject({
      title: '商业航天& 卫星 应用',
      contextText: '商业航天& 卫星 应用',
    });
    expect(links[2]).toMatchObject({
      title: '商业航天&ampere&nbspword 术语',
      contextText: '商业航天&ampere&nbspword 术语',
    });
  });

  it('decodes common typography named entities from source pages', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><a href="./space.html">&ldquo;商业航天&rdquo;&mdash;卫星应用&middot;采购公告&raquo;</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links[0]).toMatchObject({
      title: '"商业航天"—卫星应用·采购公告»',
      contextText: '"商业航天"—卫星应用·采购公告»',
    });
  });

  it('removes literal and escaped HTML tags from extracted list text', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li>
          <span>2026-05-09</span>
          <a href="./space.html" title="商业&lt;b&gt;航天&lt;/b&gt;政策发布">
            <strong>商业</strong><em>航天</em><br>政策&lt;span&gt;发布&lt;/span&gt;
          </a>
        </li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links).toEqual([
      {
        title: '商业航天政策发布',
        url: 'https://example.com/news/space.html',
        contextText: '2026-05-09 商业航天 政策发布',
      },
    ]);
  });

  it('does not decode numeric entities into hidden control characters', () => {
    const links = extractHtmlListLinks(
      `<ul>
        <li><a href="./space.html">商业航天&#0;政策&#x7f;发布</a></li>
      </ul>`,
      'https://example.com/news/',
    );

    expect(links[0]).toMatchObject({
      title: '商业航天&#0;政策&#x7f;发布',
      contextText: '商业航天&#0;政策&#x7f;发布',
    });
    expect(links[0].title).not.toContain('\u0000');
    expect(links[0].title).not.toContain('\u007f');
  });
});
