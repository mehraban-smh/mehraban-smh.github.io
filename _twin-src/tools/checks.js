// Regression checks: phone overflow, reduced motion, intro, animation pause off screen. usage: node checks.js <html> <outdir>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const file = 'file://' + process.argv[2], out = process.argv[3];
(async () => {
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  // 1) phone width
  let page = await browser.newPage({ viewport: { width: 380, height: 800 }, deviceScaleFactor: 2 });
  await page.goto(file);
  await page.evaluate(() => document.getElementById('research').scrollIntoView());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: out + '/m-ext.png' });
  await page.locator('.tw-win .tw-co').nth(2).click(); await page.waitForTimeout(2600);
  await page.locator('.tw-room.show .tw-mk').nth(2).click(); await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/m-room.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('phone horizontal overflow px:', overflow);
  await page.close();
  // 2) reduced motion: static first frame, no intro
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page = await ctx.newPage();
  await page.goto(file);
  await page.evaluate(() => document.getElementById('twStage').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(800);
  await page.locator('#twStage').screenshot({ path: out + '/rm-ext.png' });
  console.log('reduced-motion stage classes:', await page.evaluate(() => document.getElementById('twStage').className));
  await ctx.close();
  // 3) intro, deterministic: freeze transitions right after .tw-go and step through
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => ms === 4300 ? 0 : st(f, ms, ...a); });
  await page.goto(file);
  await page.evaluate(() => document.getElementById('twStage').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.getElementById('twStage').classList.contains('tw-go'));
  await page.evaluate(() => { window.__tr = document.getAnimations().filter(a => a instanceof CSSTransition); window.__tr.forEach(a => a.pause()); });
  console.log('intro transitions:', await page.evaluate(() => window.__tr.length));
  for (const t of [300, 800, 1300, 1700, 2100, 2500, 3000, 3800]) {
    await page.evaluate(t => window.__tr.forEach(a => a.currentTime = t), t);
    await page.waitForTimeout(120);
    await page.locator('#twStage').screenshot({ path: `${out}/intro-${t}.png` });
  }
  await page.close();
  // 4) animation bookkeeping: what runs outside vs inside
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(file);
  await page.evaluate(() => document.getElementById('research').scrollIntoView());
  await page.waitForTimeout(5000);
  const count = () => page.evaluate(() => { const a = document.getAnimations(); return { total: a.length, running: a.filter(x => x.playState === 'running').length }; });
  console.log('outside:', JSON.stringify(await count()));
  await page.locator('.tw-win .tw-co').nth(0).click(); await page.waitForTimeout(2600);
  console.log('inside mould room:', JSON.stringify(await count()));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  console.log('scrolled away:', JSON.stringify(await count()));
  await browser.close();
})();
