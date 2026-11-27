// The AI mask clean-up (dropSpecks): drops small loose specks, keeps the subject, a
// second large subject and soft edges. Also checks the website uses the same code.
import { readFileSync } from 'node:fs';
import { dropSpecks } from '../src/ai.js';

let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!cond) failed++; };

const w = 200, h = 100, a = new Uint8Array(w * h);
const box = (x0, y0, x1, y1, v) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[y * w + x] = v; };
box(20, 20, 80, 80, 255);   // the dog
box(80, 20, 83, 80, 40);    // its soft edge, 3 px
box(120, 30, 160, 70, 255); // a second, smaller dog (44% of the first)
box(180, 5, 184, 9, 200);   // a speck (16 px)
box(185, 5, 187, 7, 20);    // a faint haze next to the speck
box(5, 90, 7, 92, 255);     // another speck
dropSpecks(a, w, h, 1);
check('subject kept', a[50 * w + 50] === 255);
check('soft edge kept', a[50 * w + 82] === 40);
check('second subject kept', a[50 * w + 140] === 255);
check('specks removed', a[6 * w + 181] === 0 && a[91 * w + 6] === 0);
check('faint haze away from the subject removed', a[6 * w + 186] === 0);

const rgba = new Uint8Array(w * h * 4);
rgba[(50 * w + 50) * 4 + 3] = 255; rgba[(6 * w + 181) * 4 + 3] = 255;
for (let y = 40; y < 60; y++) for (let x = 40; x < 60; x++) rgba[(y * w + x) * 4 + 3] = 255;
dropSpecks(rgba.subarray(3), w, h, 4);
check('works on RGBA', rgba[(50 * w + 50) * 4 + 3] === 255 && rgba[(6 * w + 181) * 4 + 3] === 0);

const body = src => src.slice(src.indexOf('function dropSpecks'), src.indexOf('\n}', src.indexOf('function dropSpecks')) + 2).replace(/^\s+/gm, '');
const plugin = body(readFileSync(new URL('../src/ai.js', import.meta.url), 'utf8'));
const site = body(readFileSync(new URL('../../public/assets/ai-bg.js', import.meta.url), 'utf8').replace(/\n    }/g, '\n}'));
check('website uses the same clean-up', plugin.length > 500 && plugin === site);

console.log(failed ? `\n${failed} check(s) failed` : '\nClean-up checks passed');
process.exit(failed ? 1 : 0);
