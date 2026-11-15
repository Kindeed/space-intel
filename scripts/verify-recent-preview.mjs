import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.RECENT_PREVIEW_URL || 'http://127.0.0.1:5173';
const output = process.env.RECENT_QA_DIR || '.recent/qa';
await mkdir(output, {recursive:true});
// Use a clean headless session; never connect to a user's browser profile.
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',headless:true});
const results=[];
const snapshot=await (await fetch(`${base}/recent/current.json`)).json();
const expectedSources=snapshot.sources.length;
const populatedCompany=snapshot.companies.find(company=>company.country==='China'&&snapshot.items.some(item=>item.region==='cn'&&item.companyIds.includes(company.id)&&Date.parse(item.publishedAt)>=Date.now()-30*86400000));
assert(populatedCompany,'The real snapshot must include domestic company news');
try {
  for (const viewport of [{width:1440,height:1000},{width:820,height:1180},{width:390,height:844},{width:320,height:740}]) {
    const page = await browser.newPage({viewport});
    const errors=[]; const apis=[]; const dataRequests=[];
    page.on('pageerror',(error)=>errors.push(error.message));
    page.on('request',(request)=>{if(new URL(request.url()).pathname.startsWith('/api/'))apis.push(request.url());});
    page.on('request',(request)=>{if(/\/recent\/(current|discovery)\.json$/.test(new URL(request.url()).pathname))dataRequests.push(request.url());});
    await page.goto(`${base}/recent`,{waitUntil:'networkidle'});
    await page.locator('.recent-card').first().waitFor();
    const allItems=await page.locator('.recent-card').count();
    async function clearFilters() {
      const clear=page.getByRole('button',{name:'清除筛选',exact:true});
      await clear.click(); await clear.waitFor({state:'hidden'});
    }
    assert(allItems>0,'Actual news must be visible');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'No horizontal overflow');
    await page.screenshot({path:`${output}/recent-${viewport.width}.png`,fullPage:false});

    await page.getByRole('button',{name:'30 天',exact:true}).click();
    if(viewport.width<=620)await page.getByLabel('选择省份').selectOption('湖北');
    else await page.getByLabel('省份筛选').getByRole('button',{name:/湖北/}).click();
    await page.locator('.recent-results').filter({hasText:'湖北'}).waitFor();
    assert((await page.locator('.recent-card').count())>0);
    assert((await page.locator('.recent-card').allTextContents()).every(text=>text.includes('湖北')));
    await page.getByLabel('公司筛选').selectOption('minospace');
    await page.getByRole('heading',{name:'这个范围暂时没有近期资讯'}).waitFor();
    await clearFilters();
    await page.getByLabel('公司筛选').selectOption(populatedCompany.id);
    await page.locator('.recent-results').filter({hasText:populatedCompany.name}).waitFor();
    await page.locator('.recent-card').first().waitFor();
    assert((await page.locator('.recent-card').count())>0);
    assert((await page.locator('.recent-card').allTextContents()).every(text=>text.includes(populatedCompany.name)));
    await clearFilters();
    await page.getByLabel('搜索近期资讯').fill('武汉');
    await page.getByRole('button',{name:'搜索',exact:true}).click();
    await page.locator('.recent-results').filter({hasText:'搜索：武汉'}).waitFor();
    assert((await page.locator('.recent-card').count())>0);
    assert((await page.locator('.recent-card').allTextContents()).every(text=>text.includes('武汉')));
    await page.getByLabel('搜索近期资讯').fill('卫星');
    await page.getByRole('button',{name:'搜索',exact:true}).click();
    await page.locator('.recent-results').filter({hasText:'搜索：卫星'}).waitFor();
    await page.goBack();
    await page.waitForFunction(()=>document.querySelector('input[name="q"]')?.value==='武汉');
    await page.locator('.recent-results').filter({hasText:'搜索：武汉'}).waitFor();
    await page.goForward();
    await page.waitForFunction(()=>document.querySelector('input[name="q"]')?.value==='卫星');
    await page.locator('.recent-results').filter({hasText:'搜索：卫星'}).waitFor();
    await clearFilters();
    await page.getByLabel('内容类型').selectOption('policy');
    await page.locator('.recent-results').filter({hasText:'政策公告'}).waitFor();
    const policyCount=snapshot.items.filter(item=>item.region==='cn'&&item.category==='policy'&&Date.parse(item.publishedAt)>=Date.now()-30*86400000).length;
    if(policyCount){
      await page.locator('.category-policy').first().waitFor();
      assert((await page.locator('.recent-card').allTextContents()).every(text=>text.includes('政策公告')));
    }else{
      await page.getByRole('heading',{name:'这个范围暂时没有近期资讯'}).waitFor();
      assert.equal(await page.locator('.recent-card').count(),0,'Do not fabricate policies in quiet publication periods');
    }
    await clearFilters();
    for(const [focus,label] of [['spaceport','发射场／建设项目'],['ttc','遥测／测运控']]){
      await page.getByLabel('关注领域').getByRole('button',{name:label,exact:true}).click();
      await page.waitForFunction(value=>new URLSearchParams(location.search).get('focus')===value,focus);
      const expected=snapshot.items.filter(item=>item.region==='cn'&&item.focus.includes(focus)&&Date.parse(item.publishedAt)>=Date.now()-30*86400000);
      if(expected.length){
        await page.waitForFunction(urls=>{
          const rendered=[...document.querySelectorAll('.recent-card-title')].map(node=>node.getAttribute('href'));
          return rendered.length===Math.min(100,urls.length)&&rendered.every(url=>urls.includes(url));
        },expected.map(item=>item.url));
        const links=await page.locator('.recent-card-title').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
        assert(links.length>0&&links.every(url=>expected.some(item=>item.url===url)),`${label} must show relevant items`);
      }else await page.getByRole('heading',{name:'这个范围暂时没有近期资讯'}).waitFor();
      await clearFilters();
    }
    await page.getByLabel('国内外筛选').getByRole('button',{name:'国外',exact:true}).click();
    assert((await page.locator('.recent-card').count())>0);
    const article=page.locator('.recent-card-title').first();
    assert.match(await article.getAttribute('href'),/^https?:\/\//);
    assert.equal(await article.getAttribute('target'),'_blank');

    await page.getByRole('navigation',{name:'近期资讯导航'}).getByRole('button',{name:'公司',exact:true}).click();
    await page.locator('.recent-company-grid button').first().waitFor();
    assert((await page.locator('.recent-company-grid button').count())>0);
    // Company navigation must replace stale search/project/category filters.
    await page.goto(`${base}/recent?view=companies&category=approval&focus=spaceport&facility=unknown&q=无结果&province=湖北`);
    await page.locator('.recent-company-grid button').filter({hasText:populatedCompany.name}).click();
    await page.locator('.recent-card').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('company'),populatedCompany.id);
    for(const key of ['q','category','focus','facility','province'])assert.equal(new URL(page.url()).searchParams.has(key),false);
    await page.getByRole('navigation',{name:'近期资讯导航'}).getByRole('button',{name:'发射场与项目',exact:true}).click();
    await page.locator('.recent-project-grid article').first().waitFor();
    assert.equal(await page.locator('.recent-project-grid article').count(),snapshot.facilities.length);
    await page.getByLabel('搜索项目').fill('海南');
    await page.waitForFunction(()=>[...document.querySelectorAll('.recent-project-grid article')].every(node=>node.textContent.includes('海南')));
    assert((await page.locator('.recent-project-grid article').count())>0);
    await page.screenshot({path:`${output}/projects-${viewport.width}.png`,fullPage:false});
    await page.getByLabel('搜索项目').fill('没有这个项目');
    await page.getByText('没有匹配的项目，试试其他名称或地区。').waitFor();
    await page.getByLabel('搜索项目').fill('');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await page.getByRole('navigation',{name:'近期资讯导航'}).getByRole('button',{name:'来源目录',exact:true}).click();
    await page.locator('.recent-directory-heading h2').filter({hasText:'来源目录'}).waitFor();
    await page.locator('.recent-source').first().waitFor();
    const requestsBeforeFilters=dataRequests.length;
    assert.equal(await page.locator('.recent-source').count(),Math.min(60,expectedSources));
    assert.equal(await page.locator('.recent-discovery-toggle').getAttribute('open'),null);
    await page.getByLabel('搜索来源').fill('海南');
    await page.getByLabel('来源状态').selectOption('error');
    const expectedMatches=snapshot.sources.filter(source=>`${source.name} ${source.publisherRegion||''} ${source.url}`.includes('海南')&&source.status==='error');
    await page.waitForFunction(count=>document.querySelectorAll('.recent-source').length===count,expectedMatches.length);
    await page.getByLabel('搜索来源').fill('没有这个来源');
    await page.getByText('没有匹配的来源，可以更换关键词或状态。').waitFor();
    await page.getByLabel('搜索来源').fill('');
    await page.getByLabel('来源状态').selectOption('all');
    await page.waitForFunction(count=>document.querySelectorAll('.recent-source').length===count,Math.min(60,expectedSources));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await page.screenshot({path:`${output}/sources-${viewport.width}.png`,fullPage:false});
    const more=page.getByRole('button',{name:/查看更多来源/});
    while(await more.isVisible())await more.click();
    assert.equal(await page.locator('.recent-source').count(),expectedSources);
    assert.equal(dataRequests.length,requestsBeforeFilters,'Directory search, status and paging must stay local');
    const disclosure=page.locator('.recent-discovery-toggle > summary');
    await disclosure.focus();await page.keyboard.press('Enter');
    await page.locator('.recent-discovery').waitFor({state:'visible'});
    await page.goto(`${base}/recent?view=unknown`);
    await page.locator('.recent-card').first().waitFor();
    assert.equal(await page.getByRole('navigation',{name:'近期资讯导航'}).getByRole('button',{name:'近期资讯',exact:true}).getAttribute('aria-current'),'page');
    assert.deepEqual(apis,[],'Preview browsing must not query any legacy API or health');
    assert.deepEqual(errors,[],'Browser runtime must not throw');
    results.push({viewport,allItems,sourceCount:expectedSources,apiRequests:apis.length,errors});
    await page.close();
  }
  const offline=await browser.newPage();
  await offline.route('**/recent/current.json',(route)=>route.fulfill({status:503,body:'unavailable'}));
  await offline.goto(`${base}/recent`);
  await offline.getByRole('alert').waitFor();
  assert((await offline.getByRole('alert').innerText()).includes('暂时无法取得最新资讯'));
  await offline.close();
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify({passed:true,viewports:results,unavailableState:true}));
} finally { await browser.close(); }
