// Phone screenshot harness for the "Explore the house" block.
// usage: node phone-shots.js <html> <outdir> [widths csv, default 360,390,430] [freezeMs, default 38000]
// Navigation hooks (a prototype may add these attributes to its own UI; otherwise the defaults are used):
//   [data-tw-open]        tapped first if visible (e.g. a "tap to explore" opener for a fullscreen mode)
//   [data-tw-go="mould"]  element that enters a zone; default: the zone title .tw-win[data-z=..] .tw-winlabel, else the .tw-win itself
//   [data-tw-spot]        element that opens a marker card; default: first .tw-room.show .tw-mk
//   [data-tw-close]       element that closes the explorer (fullscreen modes) after the run
// Taps are real touch taps at element centres (no element.scrollIntoView, which would scroll the overflow:hidden stage).
// Output per width W: W-1-ext.png, W-2-mould.png, W-3-comfort.png, W-4-resilience.png, W-5-card.png (resilience, first marker),
// W-6-card-comfort.png, plus report.json (page errors, horizontal overflow, smallest tap targets, element boxes).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [,, file, out, widthsArg, freezeArg] = process.argv;
  const widths = (widthsArg || '360,390,430').split(',').map(Number);
  const freeze = +(freezeArg || 38000);
  fs.mkdirSync(out, { recursive: true });
  const report = {};
  const b = await chromium.launch();
  for (const W of widths) {
    const H = { 360: 780, 390: 844, 430: 932 }[W] || 844;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + file);
    await p.evaluate(() => { const s = document.getElementById('twStage'); window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - 90); });
    await p.waitForTimeout(5200);
    const vis = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity === 0 || cs.display === 'none') return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
    const tap = async (sels, wait) => { for (const s of sels) { const c = await vis(s); if (c) {
        if (c.y < 0 || c.y > H) { await p.evaluate(dy => window.scrollBy(0, dy), c.y - H / 2); await p.waitForTimeout(400); const c2 = await vis(s); await p.touchscreen.tap(c2.x, c2.y); }
        else await p.touchscreen.tap(c.x, c.y);
        await p.waitForTimeout(wait); return s; } } return null; };
    const freezeAt = () => p.evaluate(T => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw') && a.animationName !== 'twsonar') { a.pause(); a.currentTime = T; } }), freeze);
    const unfreeze = () => p.evaluate(() => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw') && a.playState === 'paused') a.play(); }));
    const shot = async name => { await freezeAt(); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${W}-${name}.png` }); await unfreeze(); };
    const rec = { errors: errs, taps: [] };
    await tap(['[data-tw-open]'], 1200);
    await shot('1-ext');
    rec.overflowX = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    rec.stage = await p.evaluate(() => { const r = document.getElementById('twStage').getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, width: r.width, height: r.height }; });
    // smallest visible interactive targets in the block (CSS px)
    rec.targets = await p.evaluate(() => [...document.querySelectorAll('#twStage button, #twStage a, [data-tw-go], [data-tw-spot], .tw-winlabel')].map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { cls: e.className || e.tagName, txt: (e.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), font: cs.fontSize, visible: r.width > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0 }; }).filter(t => t.visible));
    const zones = ['mould', 'comfort', 'resilience'];
    for (let i = 0; i < 3; i++) {
      const z = zones[i];
      const used = await tap([`[data-tw-go="${z}"]`, `.tw-win[data-z="${z}"] .tw-winlabel`, `.tw-win[data-z="${z}"]`], 2900);
      rec.taps.push({ zone: z, via: used });
      await shot(`${i + 2}-${z}`);
      if (z === 'comfort') { const u = await tap(['[data-tw-spot]', '.tw-room.show .tw-mk'], 700); rec.taps.push({ card: z, via: u }); await shot('6-card-comfort');
        rec.cardComfort = await p.evaluate(() => { const c = document.getElementById('twCard'); const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, font: getComputedStyle(document.getElementById('twD')).fontSize }; });
        await tap(['#twCardX'], 500); }
      if (z === 'resilience') { const u = await tap(['[data-tw-spot]', '.tw-room.show .tw-mk'], 700); rec.taps.push({ card: z, via: u }); await shot('5-card');
        rec.roomTargets = await p.evaluate(() => [...document.querySelectorAll('.tw-room.show .tw-mk, #twBack, #twChipLink, #twCardX, [data-tw-spot]')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className || e.id, w: Math.round(r.width), h: Math.round(r.height) }; }));
        await tap(['#twCardX'], 500); }
      const back = await tap(['#twBack'], 2600); rec.taps.push({ back: z, via: back });
    }
    await tap(['[data-tw-close]'], 800);
    rec.overflowXEnd = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    report[W] = rec;
    await ctx.close();
  }
  // desktop regression frames
  const d = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await d.goto('file://' + file);
  await d.evaluate(() => document.getElementById('twStage').scrollIntoView({ block: 'center' }));
  await d.waitForTimeout(5200);
  await d.evaluate(T => document.getAnimations().forEach(a => { if (a.animationName && a.animationName.startsWith('tw')) { a.pause(); a.currentTime = T; } }), freeze);
  await d.locator('#twStage').screenshot({ path: `${out}/desktop-1280-ext.png` });
  await b.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([w, r]) => [w, { errors: r.errors.length, overflowX: r.overflowX, stage: r.stage, taps: r.taps }]))));
})();
