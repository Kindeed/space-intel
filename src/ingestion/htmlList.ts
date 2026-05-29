export type HtmlListLink = {
  title: string;
  url: string;
  contextText: string;
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

export function absoluteUrl(value: string, base: string): string | null {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export function extractDate(value: string): string | null {
  const match = value.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
}

function listBlocks(html: string): string[] {
  const blocks = [...html.matchAll(/<(li|tr)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((match) => match[0]);

  if (blocks.length) {
    return blocks;
  }

  return [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)].map((match) => match[0]);
}

export function extractHtmlListLinks(html: string, baseUrl: string): HtmlListLink[] {
  const links: HtmlListLink[] = [];

  for (const block of listBlocks(html)) {
    const match = block.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);

    if (!match) {
      continue;
    }

    const url = absoluteUrl(match[1], baseUrl);
    const title = stripHtml(match[2]);

    if (!url || !title || title.length < 4) {
      continue;
    }

    links.push({
      title,
      url,
      contextText: stripHtml(block),
    });
  }

  return links;
}
