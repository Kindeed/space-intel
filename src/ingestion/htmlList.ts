import { normalizeHttpUrl } from '../config/url';

export type HtmlListLink = {
  title: string;
  url: string;
  contextText: string;
};

const genericNavigationTitles = new Set([
  '首页',
  '更多',
  '搜索',
  '当前位置',
  '新闻动态',
  '工作动态',
  '通知公告',
  '政策文件',
  '政策公告',
  '政策法规',
  '政务公开',
  '政府信息公开',
  '信息公告',
  '采购公告',
  '中标公告',
  '成交公告',
  '要闻动态',
  '政采公告',
  '中央公告',
  '采购头条',
  '政策解读',
  '政府采购',
  '时政要闻',
  '领导活动',
  '司局动态',
  '地方工作',
  '部属单位',
  '国家航天局',
  '机构简介',
  '机构设置',
  '信息发布',
  '国际合作',
  '国际航天',
  '图解航天',
  '精彩图集',
  '视频点播',
  '专题专栏',
  '中国航天',
  '航天白皮书',
  '重大任务',
  '宇航产品',
  '空间应用',
  '资源服务',
  '空间科学',
  '航天技术试验',
  '航天医学实验',
  '航天育种搭载实验',
  '专题报道',
  '新闻发布会',
  '学术大会',
  '新闻专题',
  '办事服务',
  '互动交流',
  '咨询建议',
  '意见征集',
  '意见反馈',
  '网站寄语',
  '留言精选',
  '在线留言',
  '联系我们',
  '网站地图',
  '相关链接',
  '探月工程数据发布与信息服务系统',
  '国家遥感数据与应用服务平台',
  '中华人民共和国中央人民政府',
  '中华人民共和国工业和信息化部',
  '中国探月与深空探测网',
  '高分辨率对地观测系统',
  '中国载人航天工程网',
  '中国航天科技集团有限公司',
  '中国航天科工集团有限公司',
  '访谈直播',
  '科普与人物',
  '历史上的今天',
  '航天知识',
  '航天人物',
  '权威解读',
  '航天文化',
  '航天网群',
  '航天数字报',
  '航天科普',
  '航天图书',
  '航天先锋',
  '预定发射',
  '发射预定',
  '发射服务',
  '产品设备',
  '产品服务',
  '产品及服务',
  '产品与服务',
  '核心产品',
  '技术路线',
  '基础设施',
  '最新新闻',
  '新闻中心',
  '媒体报道',
  '资料下载',
  '图片下载',
  '企业介绍',
  '企业文化',
  '荣誉资质',
  '关于我们',
  '加入我们',
  '公司介绍',
  '公司新闻',
  '社会责任',
  '要闻速递',
  '招贤纳士',
  '社会招聘',
  '校园招聘',
  '隐私政策',
  '法律声明',
  '了解详情',
  '蓝箭智慧',
  '北京研发中心',
  '西安研发分中心',
  '长三角区域中心',
  '原力发动机',
  '创新产品',
  '天兵文创',
  'product',
  'engine',
  'news',
  'home',
  'careers',
  'aboutus',
  'shop',
  'viewmore',
  'cooperation',
  '引力火箭',
  '火箭系列',
  'launch',
  'launchvehicle',
  'tl-2',
  'tl-3',
  'tl-3h',
  'tl-3m',
  'th-11',
  'th-12',
  'th-12v',
  'th-31',
  'th-32',
  '发动机系列',
  '卫星整星',
  '卫星与部件',
  '遥感应用',
  '航天云网平台',
  '星座简介',
  '线上产品',
  '吉林一号网',
  '宣传推广',
  '红外系列卫星',
  '力擎系列发动机',
  '力巡上面级',
  '力箭一号运载火箭',
  '力箭二号运载火箭',
  '力箭二号重型运载火箭',
  '力箭三号运载火箭',
  '力箭系列火箭',
  '力鸿系列运载器',
  '以镜头为笔，绘航天画卷，共赴星辰之约。',
  '分享到微信',
  '分享到新浪微博',
  '分享到qq',
  '查看全部',
  '详情',
]);

function isGenericNavigationTitle(title: string): boolean {
  const normalized = normalizedShortTitle(title);

  return genericNavigationTitles.has(normalized) || genericNavigationTitles.has(normalized.toLowerCase()) || /ICP备?\d+号/i.test(normalized) || /公网安备\d+号/i.test(normalized);
}

function isDateOnlyTitle(title: string): boolean {
  const normalized = normalizedShortTitle(title);
  return /^(?:20\d{2}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}(?:\s*日)?|\d{1,2}\/\d{1,2}\/20\d{2})$/.test(normalized);
}

function normalizedShortTitle(title: string): string {
  let compact = [...title].filter((character) => !isIgnorableCompactSeparator(character)).join('').replace(/^[>＞›»]+/, '');

  for (let index = 0; index < 4; index += 1) {
    const wrapped = compact.match(/^\[(.*)]$/) ?? compact.match(/^【(.*)】$/) ?? compact.match(/^\((.*)\)$/) ?? compact.match(/^（(.*)）$/);

    if (!wrapped || wrapped[1] === compact) {
      break;
    }

    compact = wrapped[1];
  }

  return compact;
}

const nearbyDatePattern = /20\d{2}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}(?:\s*日)?|\d{1,2}\/\d{1,2}\/20\d{2}/g;
const adjacentBlockBoundaryPattern = /<\/(?:article|div|li|section|tr)\b[^>]*>\s*<(?:article|div|li|section|tr)\b/i;

function crossesAdjacentBlockBoundary(value: string): boolean {
  return adjacentBlockBoundaryPattern.test(value);
}

function isValidNearbyDate(match: RegExpMatchArray): boolean {
  return extractDate(match[0]) !== null;
}

function nearestDateContext(html: string, anchorStart: number, anchorEnd: number): string | null {
  const before = html.slice(Math.max(0, anchorStart - 220), anchorStart);
  const after = html.slice(anchorEnd, Math.min(html.length, anchorEnd + 220));
  const beforeMatches = [...before.matchAll(nearbyDatePattern)];
  const beforeMatch = beforeMatches
    .reverse()
    .find((match) => isValidNearbyDate(match) && !crossesAdjacentBlockBoundary(before.slice((match.index ?? 0) + match[0].length)));
  const afterMatch = [...after.matchAll(nearbyDatePattern)].find(
    (match) => isValidNearbyDate(match) && !crossesAdjacentBlockBoundary(after.slice(0, match.index ?? 0)),
  );

  if (!beforeMatch && !afterMatch) {
    return null;
  }

  if (!beforeMatch && afterMatch) {
    return afterMatch[0];
  }

  if (beforeMatch && !afterMatch) {
    return beforeMatch[0];
  }

  if (!beforeMatch || !afterMatch) {
    return null;
  }

  const beforeDistance = before.length - ((beforeMatch.index ?? 0) + beforeMatch[0].length);
  const afterDistance = afterMatch.index ?? after.length;

  return afterDistance <= beforeDistance ? afterMatch[0] : beforeMatch[0];
}

function decodeNumericEntity(entity: string, value: string, radix: number): string {
  const codePoint = Number.parseInt(value, radix);

  const isControlCharacter = (codePoint >= 0 && codePoint <= 0x1f && ![0x09, 0x0a, 0x0d].includes(codePoint)) || (codePoint >= 0x7f && codePoint <= 0x9f);

  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff || isControlCharacter) {
    return entity;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return entity;
  }
}

export function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp(?:;|(?=$|[\s<>"'#]))/gi, ' ')
    .replace(/&amp(?:;|(?=$|[\s<>"'#]))/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&middot;/gi, '·')
    .replace(/&copy;/gi, '©')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+)(?:;|(?=$|[^0-9a-f]))/gi, (entity, value: string) => decodeNumericEntity(entity, value, 16))
    .replace(/&#(\d+)(?:;|(?=$|\D))/g, (entity, value: string) => decodeNumericEntity(entity, value, 10))
    .replace(/\s+/g, ' ')
    .trim();
}

function removeHtmlTags(value: string, separateSpan: boolean): string {
  const separatorTags = separateSpan
    ? /<\/?(?:article|blockquote|br|div|footer|h[1-6]|header|li|ol|p|section|span|table|tbody|td|th|thead|tr|ul)\b[^>]*>/gi
    : /<\/?(?:article|blockquote|br|div|footer|h[1-6]|header|li|ol|p|section|table|tbody|td|th|thead|tr|ul)\b[^>]*>/gi;

  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(separatorTags, ' ')
    .replace(/<[^>]+>/g, '');
}

export function stripHtml(value: string): string {
  return decodeHtml(removeHtmlTags(decodeHtml(removeHtmlTags(value, true)), false));
}

export function absoluteUrl(value: string, base: string): string | null {
  const decoded = decodeHtml(value);

  if (isPlaceholderHref(decoded)) {
    return null;
  }

  return normalizeHttpUrl(decoded, base);
}

function isPlaceholderHref(value: string): boolean {
  let normalized = value.trim();

  for (let index = 0; index < 4 && normalized.startsWith('{') && normalized.endsWith('}'); index += 1) {
    normalized = normalized.slice(1, -1).trim();
  }

  normalized = normalized.toLowerCase();
  const compact = [...normalized].filter((character) => !isIgnorableCompactSeparator(character)).join('');

  return (
    !normalized ||
    normalized === '#' ||
    normalized.startsWith('#') ||
    normalized.startsWith('javascript:') ||
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:') ||
    compact.startsWith('mailto:') ||
    compact.startsWith('tel:') ||
    normalized.startsWith('void(') ||
    normalized === 'void 0' ||
    normalized === 'return false' ||
    normalized === 'return false;' ||
    normalized === 'about:blank'
  );
}

function isIgnorableCompactSeparator(character: string): boolean {
  const codePoint = character.codePointAt(0);

  return character.trim() === '' || codePoint === 0x200b || codePoint === 0x200c || codePoint === 0x200d || codePoint === 0xfeff;
}

function normalizedDate(year: string, month: string, day: string): string | null {
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${normalized}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${normalized}T00:00:00Z`;
}

export function extractDate(value: string): string | null {
  for (const match of value.matchAll(/(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/g)) {
    const [, year, month, day] = match;
    const date = normalizedDate(year, month, day);

    if (date) {
      return date;
    }
  }

  for (const match of value.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) {
    const [, day, month, year] = match;
    const date = normalizedDate(year, month, day) ?? normalizedDate(year, day, month);

    if (date) {
      return date;
    }
  }

  return null;
}

export function stripLeadingDatePrefix(title: string): string {
  const match = title.match(
    /^(?:(?:\[\s*|【\s*|\(\s*|（\s*)?)(20\d{2}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}(?:\s*日)?|\d{1,2}\/\d{1,2}\/20\d{2})(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?(?:(?:\s*\]|\s*】|\s*\)|\s*）))?\s*[-–—:：]?\s*/,
  );

  if (!match || !extractDate(match[1])) {
    return title;
  }

  const cleaned = title.slice(match[0].length).trim();

  return cleaned || title;
}

function listBlocks(html: string): string[] {
  return [...html.matchAll(/<(li|tr)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
}

function visibleHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
}

function anchorTitle(anchorHtml: string): string | null {
  const openingTag = anchorHtml.match(/^<a\b[^>]*>/i)?.[0] ?? '';
  const match = openingTag.match(/\s+title\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/i);
  const title = match ? stripHtml(match[1] ?? match[2] ?? match[3] ?? '') : '';

  return title || null;
}

const anchorPattern = /<a\b[^>]*\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))[^>]*>([\s\S]*?)<\/a>/gi;

function anchorHref(match: RegExpMatchArray): string {
  return match[1] ?? match[2] ?? match[3] ?? '';
}

function anchorBody(match: RegExpMatchArray): string {
  return match[4] ?? '';
}

export function extractHtmlListLinks(html: string, baseUrl: string): HtmlListLink[] {
  const links: HtmlListLink[] = [];
  const seenCandidates = new Set<string>();
  const scanHtml = visibleHtml(html);

  function addCandidate(href: string, rawTitle: string, contextText: string): void {
    const url = absoluteUrl(href, baseUrl);
    const title = stripHtml(rawTitle);

    if (!url || !title || title.length < 4 || isGenericNavigationTitle(title) || isDateOnlyTitle(title)) {
      return;
    }

    const candidateKey = `${url}\u0000${title}`;

    if (seenCandidates.has(candidateKey)) {
      return;
    }

    seenCandidates.add(candidateKey);
    links.push({
      title,
      url,
      contextText,
    });
  }

  for (const block of listBlocks(scanHtml)) {
    const matches = [...block.matchAll(anchorPattern)];

    if (!matches.length) {
      continue;
    }

    for (const match of matches) {
      addCandidate(anchorHref(match), anchorTitle(match[0]) ?? anchorBody(match), stripHtml(block));
    }
  }

  for (const match of scanHtml.matchAll(anchorPattern)) {
    const anchorStart = match.index ?? 0;
    const anchorEnd = anchorStart + match[0].length;
    const anchorText = stripHtml(match[0]);
    const nearbyDate = nearestDateContext(scanHtml, anchorStart, anchorEnd);
    const contextText = nearbyDate && !anchorText.includes(nearbyDate) ? `${anchorText} ${nearbyDate}` : anchorText;

    addCandidate(anchorHref(match), anchorTitle(match[0]) ?? anchorBody(match), contextText);
  }

  return links;
}
