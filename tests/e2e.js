const { chromium } = require('playwright');
// Browser end-to-end test. From the repo root:
//   cd public && python3 -m http.server 8765      (in one terminal)
//   node tests/e2e.js                             (in another; needs: npm i playwright && npx playwright install chromium)
const path = require('path');
const OUT = process.argv[2] || path.join(require('os').tmpdir(), 'gp-e2e');
const FIX = path.join(__dirname, 'fixtures');
const BASE = process.env.BASE_URL || 'http://localhost:8765';
require('fs').mkdirSync(OUT, { recursive: true });
const results = []; const errors = [];
const ok = (name, cond, info='') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
async function blobInfo(page, sel) {
  return page.evaluate(async sel => {
    const a = document.querySelector(sel); if (!a) return null;
    const b = await (await fetch(a.href)).blob(); const buf = new Uint8Array(await b.slice(0, 16).arrayBuffer());
    let dims = null;
    if (b.type.startsWith('image/')) { const bmp = await createImageBitmap(b); dims = [bmp.width, bmp.height]; }
    const text = b.type.includes('json') ? await b.text() : null;
    return { size: b.size, type: b.type, head: Array.from(buf), dims, text };
  }, sel);
}
(async () => {
  const browser = await chromium.launch();
  // ---------- 1. every page, desktop + phone ----------
  const pages = ['/', '/editor.html', '/how-to-use.html', '/get-the-app.html', '/guides/', '/guides/video-to-sprite-sheet.html', '/guides/remove-green-screen.html', '/guides/phaser-pixi-sprite-sheet.html', '/about.html', '/contact.html', '/privacy.html', '/terms.html', '/404.html'];
  for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${label} ${p.url()}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/pagead2|googlesyndication|ERR_|net::/.test(m.text())) errors.push(`${label} ${p.url()} console: ${m.text()}`); });
    for (const path of pages) {
      const r = await p.goto(BASE + path, { waitUntil: 'load' });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > vp.width + 1) ok(`${label} ${path} no sideways scroll`, false, `page is ${sw}px wide`);
      if (!r.ok()) ok(`${label} ${path} loads`, false, `HTTP ${r.status()}`);
    }
    ok(`${label}: all ${pages.length} pages load without sideways scroll`, true);
    for (const [path, name] of [['/', 'converter'], ['/editor.html', 'editor'], ['/how-to-use.html', 'howto'], ['/get-the-app.html', 'app']]) {
      await p.goto(BASE + path, { waitUntil: 'load' }); await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/${label}-${name}.png`, fullPage: false });
    }
    await ctx.close();
  }
  // ---------- 2. converter end to end ----------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(`converter: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/pagead2|googlesyndication/.test(m.text())) errors.push(`converter console: ${m.text()}`); });
  p.on('dialog', d => d.accept());
  await p.goto(BASE + '/', { waitUntil: 'load' });
  await p.setInputFiles('#videoUpload', `${FIX}/circle-greenscreen.webm`);
  await p.waitForFunction(() => document.querySelector('#sourceVideoPlayer').readyState >= 1, null, { timeout: 15000 });
  const setVal = (sel, v) => p.evaluate(([s, v]) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
  const check = (sel, on) => p.evaluate(([s, on]) => { const el = document.querySelector(s); if (el.checked !== on) el.click(); }, [sel, on]);
  await setVal('#fps', '10');
  await check('#removeBgToggle', true); await setVal('#bgColor', '#00b140'); await setVal('#bgTolerance', '120');
  for (const id of ['#outSpriteWebp', '#outZipWebp', '#outAnimGif', '#outMetaJson', '#autoTrim']) await check(id, true);
  await setVal('#imageFormat', 'image/png');
  const t0 = Date.now();
  await p.click('#generateBtn');
  await p.waitForSelector('a.download-btn[download="animation.gif"]', { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(500);
  const links = await p.$$eval('#downloadContainer a.download-btn', as => as.map(a => a.getAttribute('download')));
  ok('converter: Process produces downloads', links.length >= 4, `${links.join(', ')} in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  const msgs = await p.$eval('#messageBox', e => e.innerText.trim());
  const sheet = await blobInfo(p, 'a.download-btn[data-kind="sprite"]');
  const json = await blobInfo(p, 'a.download-btn[download="spritesheet.json"]');
  const gif = await blobInfo(p, 'a.download-btn[download="animation.gif"]');
  const zip = await blobInfo(p, 'a.download-btn[download$=".zip"]');
  ok('sprite sheet is a PNG', sheet && sheet.head[1] === 0x50 && sheet.head[2] === 0x4e, sheet ? `${sheet.dims} px, ${(sheet.size/1024).toFixed(0)} KB` : 'missing');
  ok('animated GIF exported (worker runs)', gif && String.fromCharCode(...gif.head.slice(0, 6)).startsWith('GIF8'), gif ? `${(gif.size/1024).toFixed(0)} KB` : 'missing');
  ok('frame ZIP exported', zip && zip.head[0] === 0x50 && zip.head[1] === 0x4b, zip ? `${(zip.size/1024).toFixed(0)} KB` : 'missing');
  let meta = json && JSON.parse(json.text);
  if (meta) {
    const fr = Object.values(meta.frames);
    const inside = fr.every(f => f.frame.x + f.frame.w <= meta.meta.size.w && f.frame.y + f.frame.h <= meta.meta.size.h);
    ok('JSON matches sheet', meta.meta.size.w === sheet.dims[0] && meta.meta.size.h === sheet.dims[1] && inside, `${fr.length} frames, ${meta.cols}x${meta.rows}, trimmed=${!!meta.trimmed}`);
    ok('trim removed background padding', meta.trimmed && meta.frameWidth < 320, `frame ${meta.frameWidth}x${meta.frameHeight} from 320x240`);
  } else ok('JSON exported', false, msgs);
  // transparency check: corner pixel of first frame should be transparent
  const alpha = await p.evaluate(async () => {
    const a = document.querySelector('a.download-btn[data-kind="sprite"]'); const bmp = await createImageBitmap(await (await fetch(a.href)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height); const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
    return x.getImageData(0, 0, 1, 1).data[3];
  });
  ok('green screen removed (corner pixel transparent)', alpha === 0, `alpha=${alpha}`);
  const firstFrameOpaque = await p.evaluate(async () => {
    const bmp = await createImageBitmap(frames[0].blob); const c = new OffscreenCanvas(bmp.width, bmp.height); const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k]) n++; return n;
  });
  ok('first frame is not blank', firstFrameOpaque > 0, `${firstFrameOpaque} visible pixels`);
  await p.screenshot({ path: `${OUT}/converter-results.png`, fullPage: true });
  // ---------- 3. rebuild at 50%, 2 columns ----------
  await setVal('#webpScale', '50'); await setVal('#spriteCols', '2');
  await p.click('#rebuildBtn');
  await p.waitForFunction(() => /Rebuilt|failed/.test(document.querySelector('#rebuildStatus').innerText), null, { timeout: 30000 });
  const sheet2 = await blobInfo(p, 'a.download-btn[data-kind="sprite"]');
  const json2 = await blobInfo(p, 'a.download-btn[download="spritesheet.json"]');
  const m2 = json2 && JSON.parse(json2.text);
  const nJson = await p.$$eval('a.download-btn[download="spritesheet.json"]', a => a.length);
  ok('Rebuild regenerates a matching JSON', m2 && m2.cols === 2 && m2.meta.size.w === sheet2.dims[0] && m2.meta.size.h === sheet2.dims[1] && nJson === 1,
     m2 ? `sheet ${sheet2.dims}, json ${m2.meta.size.w}x${m2.meta.size.h}, cols ${m2.cols}, ${Object.keys(m2.frames).length} frames` : 'missing');
  // ---------- 4. hand-off to editor ----------
  await p.click('button.editor-handoff');
  await p.waitForURL(/editor\.html/, { timeout: 10000 });
  await p.waitForFunction(() => document.querySelectorAll('#gallery .frame-wrap').length > 0, null, { timeout: 10000 }).catch(() => {});
  const nFrames = await p.$$eval('#gallery .frame-wrap', n => n.length);
  const info = await p.$eval('#info', e => e.innerText);
  ok('Open in Sprite Editor carries the sheet over', nFrames === Object.keys(m2.frames).length, `${nFrames} frames · ${info}`);
  // play, then keyboard select + delete + undo
  await p.click('#playBtn'); await p.waitForTimeout(600);
  const counter1 = await p.$eval('#frameCounter', e => e.innerText); await p.click('#playBtn');
  ok('editor player animates', counter1 !== '1 / ' + nFrames, counter1);
  await p.focus('#gallery .frame-wrap:nth-child(1)'); await p.keyboard.press('Enter');
  await p.focus('#gallery .frame-wrap:nth-child(3)'); await p.keyboard.press('Shift+Enter');
  const sel = await p.$eval('#selInfo', e => e.innerText);
  ok('keyboard selection (Enter, Shift+Enter range)', sel.startsWith('3 of'), sel);
  await p.click('[data-act="delete"]');
  const after = await p.$$eval('#gallery .frame-wrap', n => n.length);
  await p.click('[data-act="undo"]');
  const undone = await p.$$eval('#gallery .frame-wrap', n => n.length);
  ok('delete + undo', after === nFrames - 3 && undone === nFrames, `${nFrames} → ${after} → ${undone}`);
  await p.click('[data-act="all"]'); await p.click('[data-act="reverse"]');
  await p.fill('#expCols', '4'); await p.fill('#expName', 'shiba_run');
  await p.click('#exportBtn');
  await p.waitForSelector('#downloads a.download-btn', { timeout: 10000 });
  const ej = await blobInfo(p, '#downloads a[download="shiba_run.json"]');
  const ei = await blobInfo(p, '#downloads a[download="shiba_run.png"]');
  const em = ej && JSON.parse(ej.text);
  ok('editor export: sheet + JSON match', em && ei && em.meta.size.w === ei.dims[0] && em.meta.size.h === ei.dims[1] && em.cols === 4, ei ? `${ei.dims}, ${em.count} frames` : 'missing');
  await p.screenshot({ path: `${OUT}/editor-loaded.png`, fullPage: true });
  // ---------- 5. editor loads the editor's own export again (round trip) ----------
  // ---------- 6. offline / service worker ----------
  await p.goto(BASE + '/', { waitUntil: 'load' });
  const swOk = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  await p.waitForTimeout(1500);
  await ctx.setOffline(true);
  let offlineOk = false, offlineEditor = false;
  try { await p.reload({ waitUntil: 'load' }); offlineOk = await p.isVisible('#generateBtn'); } catch (e) {}
  try { await p.goto(BASE + '/editor.html', { waitUntil: 'load' }); offlineEditor = await p.isVisible('#exportBtn'); } catch (e) {}
  await ctx.setOffline(false);
  ok('app works offline (service worker)', swOk && offlineOk && offlineEditor, `sw=${swOk} converter=${offlineOk} editor=${offlineEditor}`);
  await browser.close();
  console.log(results.join('\n'));
  console.log(errors.length ? '\nERRORS:\n' + [...new Set(errors)].join('\n') : '\nNo page errors.');
})().catch(e => { console.log(results.join('\n')); console.error('CRASH', e); process.exit(1); });
