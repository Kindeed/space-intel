import { chromium } from 'playwright';

const targetUrl = process.env.PLAYWRIGHT_TARGET_URL ?? 'http://127.0.0.1:5173/';
const viewports = [
  { width: 1440, height: 1000, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' },
];

const browser = await chromium.launch();

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.keyboard.press('ControlOrMeta+K');
    const hasCommandPalette = (await page.locator('.command-palette').count()) > 0;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const commandPaletteClosed = (await page.locator('.command-palette').count()) === 0;

    const hasHighlights = (await page.locator('text=今日重点').count()) > 0;
    const hasCapitalNotice = (await page.locator('text=不构成投资建议').count()) > 0;
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    const firstArticleLink = page.locator('a[href^="/articles/"]').first();
    await firstArticleLink.click();
    await page.waitForURL('**/articles/**');
    await page.waitForTimeout(250);
    const articleBody = await page.textContent('body');
    const hasArticleDetail = articleBody?.includes('核心要点') ?? false;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.locator('a[href="/launches"]:visible').first().click();
    await page.waitForURL('**/launches');
    await page.waitForTimeout(250);
    const launchBody = await page.textContent('body');
    const hasLaunchPage = launchBody?.includes('发射时间轴') ?? false;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `test-results/${viewport.name}.png`, fullPage: true });

    if (!hasCommandPalette || !commandPaletteClosed || !hasHighlights || !hasCapitalNotice || hasHorizontalOverflow || !hasArticleDetail || !hasLaunchPage) {
      throw new Error(
        `${viewport.name} layout check failed: commandPalette=${hasCommandPalette}, commandPaletteClosed=${commandPaletteClosed}, highlights=${hasHighlights}, capitalNotice=${hasCapitalNotice}, horizontalOverflow=${hasHorizontalOverflow}, articleDetail=${hasArticleDetail}, launchPage=${hasLaunchPage}`,
      );
    }

    console.log(`${viewport.name}: ok`);
    await page.close();
  }
} finally {
  await browser.close();
}
