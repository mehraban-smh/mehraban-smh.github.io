// usage: node inspect.js <html> <outprefix> <times csv> <scene: ext|0|1|2> <regions: x,y,w,h;...  in viewBox units>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, file, out, times, scene, regions] = process.argv;
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}); const page = await b.newPage({ viewport: { width: 1625, height: 1300 }, deviceScaleFactor: 2 });
  await page.goto('file://' + file);
  await page.addStyleTag({ content: '.wrap{max-width:none!important}' });
  await page.evaluate(() => document.getElementById('twStage').scrollIntoView({block: 'start', behavior: 'instant'}));
  await page.waitForTimeout(4800);
  if (scene !== 'ext') { await page.evaluate(i => document.querySelectorAll('.tw-win')[i].click(), +scene); await page.waitForTimeout(2600); }
  const box = await page.locator('#twStage').boundingBox();
  const k = box.width / 1600;
  const setT = ms => page.evaluate(ms => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw')) { a.pause(); a.currentTime = ms; } }), ms);
  for (const t of times.split(',')) {
    await setT(+t); await page.waitForTimeout(150);
    let i = 0;
    for (const r of regions.split(';')) {
      const [x, y, w, h] = r.split(',').map(Number);
      await page.screenshot({ path: `${out}-${t}-${i++}.png`, clip: { x: box.x + x * k, y: box.y + y * k, width: w * k, height: h * k } });
    }
  }
  await b.close();
})();
