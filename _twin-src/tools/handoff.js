// Zoom hand-off check: for each zone, render the exterior at its final zoom (no blur, no transition) and the room view,
// both frozen at the same time, and save them side by side plus a 50% blend. usage: node handoff.js <html> <outprefix>
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const [,, file, out] = process.argv;
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.goto('file://' + file);
  await p.evaluate(() => document.getElementById('twStage').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(5200);
  const res = [];
  for (const z of ['mould', 'comfort', 'resilience']) {
    const freeze = () => p.evaluate(() => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw')) { a.pause(); a.currentTime = 38000; } }));
    await p.evaluate(z => { const sc = TW_SCENES_REF[z]; }, z).catch(() => {});
    const ext = await p.evaluate(z => { const s = document.getElementById('twStage'); const e = document.getElementById('twExt');
      const txt = [...document.scripts].map(x => x.textContent).find(t => t.includes('const TW_SCENES'));
      const i = txt.indexOf(z + ': { title:'); const line = txt.slice(i, txt.indexOf('\n', i)); const m = line.match(/ x:(-?[\d.]+), y:(-?[\d.]+), s:([\d.]+)/);
      e.style.transition = 'none'; e.style.filter = 'none'; e.style.transformOrigin = m[1] + '% ' + m[2] + '%'; e.style.transform = 'scale(' + m[3] + ')';
      document.getElementById('twExtLayer').style.opacity = 0; return [m[1], m[2], m[3]]; }, z);
    await freeze(); await p.waitForTimeout(200);
    await p.locator('#twStage').screenshot({ path: `${out}-${z}-ext.png` });
    await p.evaluate(z => { const e = document.getElementById('twExt'); e.style.opacity = 0;
      const r = document.querySelector('.tw-room[data-scene="' + z + '"]'); r.style.transition = 'none'; r.classList.add('show'); r.style.transform = 'none'; }, z);
    await freeze(); await p.waitForTimeout(200);
    await p.locator('#twStage').screenshot({ path: `${out}-${z}-room.png` });
    await p.evaluate(z => { const e = document.getElementById('twExt'); e.style.opacity = .5; e.style.zIndex = 5; e.style.position = 'absolute'; }, z);
    await p.waitForTimeout(150);
    await p.locator('#twStage').screenshot({ path: `${out}-${z}-blend.png` });
    await p.evaluate(z => { const e = document.getElementById('twExt'); e.style = ''; document.getElementById('twExtLayer').style.opacity = '';
      const r = document.querySelector('.tw-room[data-scene="' + z + '"]'); r.classList.remove('show'); r.style = ''; }, z);
    res.push({ z, ext });
  }
  console.log(JSON.stringify(res));
  await b.close();
})();
