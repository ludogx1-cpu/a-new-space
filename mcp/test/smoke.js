// End-to-end test: starts the MCP server over stdio, like Claude does, and calls each tool.
// Pro tools are checked for the "needs Pro" message; set GOLDEN_PAW_TEST_AI=1 to also
// run the AI model (it bypasses the licence with a test-only licence file).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import ffmpegStatic from 'ffmpeg-static';

const work = mkdtempSync(join(tmpdir(), 'gpa-test-'));
const home = join(work, 'home');
let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!cond) failed++; };

// A 2-second green-screen clip: a red square sliding across.
const video = join(work, 'clip.mp4');
const ff = spawnSync(process.env.FFMPEG_PATH || ffmpegStatic, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
    'color=c=0x00ff00:s=320x240:d=2:r=30', '-f', 'lavfi', '-i', 'color=c=red:s=60x60:d=2:r=30',
    '-filter_complex', "[0][1]overlay=x='20+t*100':y=90:shortest=1",
    '-pix_fmt', 'yuv420p', video]);
check('test clip created', ff.status === 0, ff.stderr && ff.stderr.toString().slice(0, 200));

const transport = new StdioClientTransport({
    command: process.execPath, args: [fileURLToPath(new URL('../src/server.js', import.meta.url))],
    env: { ...process.env, GOLDEN_PAW_HOME: home, GOLDEN_PAW_PRO_KEY: '' }, stderr: 'pipe'
});
const client = new Client({ name: 'smoke', version: '1' });
await client.connect(transport);

const { tools } = await client.listTools();
const names = tools.map(t => t.name).sort();
check('tools listed', ['activate_pro', 'convert_video', 'make_gif', 'remove_background', 'slice_spritesheet'].every(n => names.includes(n)), names.join(', '));

check('every tool has a title and safety annotations', tools.every(t => t.title && t.annotations && typeof t.annotations.readOnlyHint === 'boolean' && typeof t.annotations.destructiveHint === 'boolean'));

const text = r => r.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

// 1. Video → sheet + JSON + GIF + frames, with auto green-screen removal.
const out1 = join(work, 'out1');
let r = await client.callTool({ name: 'convert_video', arguments: { input: video, output_dir: out1, fps: 10, chroma_key: { color: 'auto' }, outputs: ['spritesheet', 'json', 'gif', 'frames'] } });
check('convert_video succeeds', !r.isError, text(r).split('\n')[0]);
check('returns a preview image', r.content.some(c => c.type === 'image' && c.data.length > 100));
const sheet = PNG.sync.read(readFileSync(join(out1, 'spritesheet.png')));
const atlas = JSON.parse(readFileSync(join(out1, 'spritesheet.json'), 'utf8'));
check('JSON matches sheet', atlas.meta.size.w === sheet.width && atlas.meta.size.h === sheet.height && Object.keys(atlas.frames).length === atlas.count, `${sheet.width}×${sheet.height}, ${atlas.count} frames, ${atlas.cols}×${atlas.rows}`);
check('20 frames at 10 fps', atlas.count === 20 && atlas.fps === 10);
check('trimmed to the moving square', atlas.trimmed && atlas.frameHeight <= 62 && atlas.frameWidth < 320, `${atlas.frameWidth}×${atlas.frameHeight}`);
const f0 = atlas.frames[Object.keys(atlas.frames)[0]].frame;
const px = (x, y) => sheet.data[(y * sheet.width + x) * 4 + 3];
check('background is transparent', px(f0.x + f0.w - 1, f0.y + f0.h - 1) === 0 || px(f0.x + f0.w - 2, f0.y + 1) === 0);
const mid = ((f0.y + 30) * sheet.width + f0.x + 30) * 4;
check('red square kept and opaque', sheet.data[mid + 3] === 255 && sheet.data[mid] > 200 && sheet.data[mid + 1] < 60, `rgba ${[...sheet.data.slice(mid, mid + 4)]}`);
const gif = readFileSync(join(out1, 'animation.gif'));
check('GIF written', gif.slice(0, 6).toString() === 'GIF89a' && gif.length > 500, `${(gif.length / 1024).toFixed(1)} KB`);
check('frame PNGs written', readdirSync(join(out1, 'frames')).length === 20);

// 2. Sheet → frames (slice) and sheet → GIF via the atlas.
r = await client.callTool({ name: 'slice_spritesheet', arguments: { input: join(out1, 'spritesheet.png'), atlas: join(out1, 'spritesheet.json'), output_dir: join(work, 'sliced') } });
check('slice_spritesheet with atlas', !r.isError && readdirSync(join(work, 'sliced')).length === 20, text(r).split('\n')[0]);
r = await client.callTool({ name: 'slice_spritesheet', arguments: { input: join(out1, 'spritesheet.png'), columns: atlas.cols, rows: atlas.rows, output_dir: join(work, 'grid') } });
check('slice_spritesheet with grid (skips empty cells)', !r.isError && readdirSync(join(work, 'grid')).length === 20, text(r).split('\n')[0]);
r = await client.callTool({ name: 'make_gif', arguments: { input: join(out1, 'spritesheet.png'), atlas: join(out1, 'spritesheet.json'), output_dir: join(work, 'gif2') } });
check('make_gif from a sprite sheet', !r.isError && existsSync(join(work, 'gif2', 'animation.gif')), text(r).split('\n')[0]);

// 3. Options: one horizontal row, scale, pingpong.
r = await client.callTool({ name: 'convert_video', arguments: { input: video, output_dir: join(work, 'out3'), fps: 5, end: 1, scale: 0.5, columns: 5, loop: 'pingpong', chroma_key: { color: '#00ff00' }, trim: false } });
const a3 = JSON.parse(readFileSync(join(work, 'out3', 'spritesheet.json'), 'utf8'));
check('scale, columns and pingpong', !r.isError && a3.frameWidth === 160 && a3.cols === 5 && a3.count === 8, `${a3.count} frames ${a3.frameWidth}×${a3.frameHeight}, ${a3.cols} cols`);

// 4. Friendly errors.
r = await client.callTool({ name: 'convert_video', arguments: { input: join(work, 'nope.mp4') } });
check('missing file → clear error', r.isError && /Can't find/.test(text(r)));
r = await client.callTool({ name: 'convert_video', arguments: { input: video, output_dir: join(work, 'x'), chroma_key: { color: '#ff0000', tolerance: 442 } } });
check('over-keying → clear error', r.isError && /Everything was removed/.test(text(r)));
r = await client.callTool({ name: 'remove_background', arguments: { inputs: [join(work, 'sliced', 'frame_000.png')] } });
check('Pro tool without a licence → buy link', r.isError && /goldenpaw\.dog/.test(text(r)) && /activate_pro/.test(text(r)));
r = await client.callTool({ name: 'activate_pro', arguments: { licence_key: 'short' } });
check('bad licence key → clear error', r.isError && /licence key/.test(text(r)));
r = await client.callTool({ name: 'activate_pro', arguments: {} });
check('Pro status', !r.isError && /isn't active/.test(text(r)));
await client.close();

// 5. Optional: run the real AI model (uses a local test licence, never a real key).
if (process.env.GOLDEN_PAW_TEST_AI) {
    const aiHome = join(work, 'aihome');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(aiHome, { recursive: true });
    writeFileSync(join(aiHome, 'pro.json'), JSON.stringify({ key: 'TEST', instanceId: 'TEST', checkedAt: Date.now() }));
    const t2 = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/server.js', import.meta.url))], env: { ...process.env, GOLDEN_PAW_HOME: aiHome }, stderr: 'inherit' });
    const c2 = new Client({ name: 'smoke-ai', version: '1' });
    await c2.connect(t2);
    const t0 = Date.now();
    r = await c2.callTool({ name: 'remove_background', arguments: { inputs: [process.env.GOLDEN_PAW_TEST_IMAGE || join(work, 'sliced', 'frame_000.png')], output_dir: join(work, 'ai') } }, undefined, { timeout: 600000 });
    check('AI remove_background', !r.isError, `${text(r).split('\n')[0]} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await c2.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
console.log('Output folder:', work);
process.exit(failed ? 1 : 0);
