// usage: node deskshot.js <html> <outprefix> <viewport widths csv> [freezeMs]
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, file, out, ws, fz] = process.argv;
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  for (const W of ws.split(',').map(Number)) {
    const p = await b.newPage({ viewport: { width: W, height: 900 }, deviceScaleFactor: 2 });
    await p.goto('file://' + file);
    await p.evaluate(() => document.getElementById('twStage').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(5200);
    await p.evaluate(T => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw')) { a.pause(); a.currentTime = T; } }), +(fz || 38000));
    await p.waitForTimeout(200);
    await p.locator('#twStage').screenshot({ path: `${out}-${W}.png` });
    await p.close();
  }
  await b.close();
})();
