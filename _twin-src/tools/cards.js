// Open every marker card of one room and screenshot each. usage: node cards.js <html> <outprefix> <viewport width> <scene-index 0..2> 0
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, file, out, width, idx, mk] = process.argv;
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const page = await browser.newPage({ viewport: { width: +width, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + file);
  await page.evaluate(() => document.getElementById('research').scrollIntoView());
  await page.waitForTimeout(4800);
  await page.evaluate(i => document.querySelectorAll('.tw-win')[i].click(), +idx);
  await page.waitForTimeout(2600);
  await page.evaluate(() => document.getElementById('twStage').scrollIntoView({block: 'center'}));
  await page.evaluate(T => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw') && a.animationName !== 'twsonar') { a.pause(); a.currentTime = T; } }), +(process.env.T || 2500));
  await page.waitForTimeout(200);
  const st = page.locator('#twStage');
  await st.screenshot({ path: `${out}.png` });
  if (mk !== undefined) {
    const mks = page.locator('.tw-room.show .tw-mk');
    const n = await mks.count();
    for (let i = 0; i < n; i++) { await page.evaluate(() => document.getElementById('twCardX').click()); await mks.nth(i).dispatchEvent('click'); await page.waitForTimeout(400); await st.screenshot({ path: `${out}-mk${i}.png` }); }
  }
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})();
