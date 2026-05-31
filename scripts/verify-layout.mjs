import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const viewports = [
  { width: 1440, height: 1000, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' },
];

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  if (!address || typeof address === 'string') {
    throw new Error('Could not allocate a local preview port');
  }

  return address.port;
}

async function waitForPreview(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until Vite finishes binding the preview port.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for local preview at ${url}`);
}

async function startPreviewServer() {
  const port = await availablePort();
  const viteEntry = join('node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteEntry, 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    stdio: 'ignore',
    windowsHide: true,
  });
  const url = `http://127.0.0.1:${port}/`;

  await waitForPreview(url);
  return { child, url };
}

async function runViteBuild() {
  const viteEntry = join('node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteEntry, 'build'], {
    stdio: 'inherit',
    windowsHide: true,
  });

  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`vite build failed with exit code ${code}`));
    });
  });

  if (!existsSync('dist/index.html')) {
    throw new Error('dist/index.html is missing after vite build.');
  }
}

if (!process.env.PLAYWRIGHT_TARGET_URL) {
  await runViteBuild();
}

const preview = process.env.PLAYWRIGHT_TARGET_URL ? null : await startPreviewServer();
const targetUrl = process.env.PLAYWRIGHT_TARGET_URL ?? preview.url;
const policyUrl = new URL('/policy', targetUrl).toString();
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
    const hasPolicySignal = (await page.locator('a[href="/policy"]').count()) > 0;
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    const firstArticleLink = page.locator('a[href^="/articles/"]').first();
    const articleLinkCount = await firstArticleLink.count();
    let hasArticleDetail = false;
    let articleDetailHasDesignNotes = false;

    if (articleLinkCount > 0) {
      await firstArticleLink.click();
      await page.waitForURL('**/articles/**');
      await page.waitForTimeout(250);
      const articleBody = await page.textContent('body');
      hasArticleDetail = articleBody?.includes('文章详情') || articleBody?.includes('阅读原文') || false;
      articleDetailHasDesignNotes =
        articleBody?.includes('核心要点') ||
        articleBody?.includes('只展示摘要和元数据，避免全文转载。') ||
        articleBody?.includes('实体、标签和发射关系用于快速判断线索价值。') ||
        articleBody?.includes('摘要、要点、实体关系和原文链接') ||
        articleBody?.includes('打开原文链接') ||
        false;
    } else {
      const homeBody = await page.textContent('body');
      hasArticleDetail = homeBody?.includes('暂无可展示线索') || homeBody?.includes('首页数据暂不可用') || homeBody?.includes('今日重点') || false;
    }

    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.locator('a[href="/launches"]:visible').first().click();
    await page.waitForURL('**/launches');
    await page.waitForTimeout(250);
    const launchBody = await page.textContent('body');
    const hasLaunchPage = launchBody?.includes('发射时间线') ?? false;
    await page.goto(policyUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const hasPolicyPage = (await page.locator('form[action="/policy"], [aria-label="政策分页"]').count()) > 0;
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `test-results/${viewport.name}.png`, fullPage: true });

    if (!hasCommandPalette || !commandPaletteClosed || !hasHighlights || !hasPolicySignal || hasHorizontalOverflow || !hasArticleDetail || articleDetailHasDesignNotes || !hasLaunchPage || !hasPolicyPage) {
      throw new Error(
        `${viewport.name} layout check failed: commandPalette=${hasCommandPalette}, commandPaletteClosed=${commandPaletteClosed}, highlights=${hasHighlights}, policySignal=${hasPolicySignal}, horizontalOverflow=${hasHorizontalOverflow}, articleDetail=${hasArticleDetail}, articleDetailHasDesignNotes=${articleDetailHasDesignNotes}, launchPage=${hasLaunchPage}, policyPage=${hasPolicyPage}`,
      );
    }

    console.log(`${viewport.name}: ok`);
    await page.close();
  }
} finally {
  await browser.close();
  if (preview) {
    preview.child.kill();
  }
}
