// The work behind each tool. Kept separate from the MCP wiring so it can be tested directly.
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, basename, extname, join } from 'node:path';
import { readFrames, readImage, writePng, encodePng, IMAGE_EXTS } from './media.js';
import { hexToRgb, guessKeyColour, chromaKey, sharedTrimBox, crop, packSheet, atlasJson, sliceSheet, previewOf, isBlank } from './imageops.js';
import { encodeGif } from './gif.js';
import { requirePro } from './pro.js';

const MAX_SIDE = 16384;   // beyond this most tools and GPUs can't open the image
const WARN_SIDE = 4096;   // many mobile GPUs cap textures here

async function mustExist(p, what) {
    try { const s = await stat(p); if (!s.isFile()) throw 0; }
    catch { throw new Error(`Can't find the ${what} "${p}". Give the full path to the file.`); }
}

function outDirFor(input, outputDir, suffix) {
    if (outputDir) return resolve(outputDir);
    return join(dirname(input), `${basename(input, extname(input))}-${suffix}`);
}

async function applyBackgroundOptions(frames, opts, notes) {
    if (opts.remove_background_ai) {
        await requirePro('AI background removal');
        const { removeBackground } = await import('./ai.js');
        for (let i = 0; i < frames.length; i++) await removeBackground(frames[i], opts.ai_edges || 'normal');
        notes.push(`AI background removal (${opts.ai_edges || 'normal'} edges) on ${frames.length} frames.`);
    }
    if (opts.chroma_key) {
        const ck = opts.chroma_key;
        const hex = !ck.color || ck.color === 'auto' ? guessKeyColour(frames[0]) : ck.color;
        const key = {
            ...hexToRgb(hex),
            tolerance: ck.tolerance ?? 90,
            feather: ck.feather ?? (opts.pixel_art ? 0 : 15),
            mode: ck.match === 'colour_only' ? 'chroma' : 'rgb',
            despill: (ck.spill_suppression ?? 60) / 100
        };
        for (const f of frames) chromaKey(f, key);
        notes.push(`Removed background colour ${hex} (tolerance ${key.tolerance}, feather ${key.feather}${key.mode === 'chroma' ? ', colour only' : ''}).`);
        if (frames.every(isBlank)) throw new Error(`Everything was removed. The key colour ${hex} or the tolerance (${key.tolerance}) catches the subject too: lower the tolerance or pick the backdrop colour exactly.`);
    }
}

/** Shared by convert_video and make_gif: frames in, files out. */
async function writeOutputs(frames, { outDir, fps, columns, trim, outputs, loop, notes }) {
    const written = [];
    let trimBox = null;
    if (trim) {
        trimBox = sharedTrimBox(frames);
        if (trimBox) {
            frames = frames.map(f => crop(f, trimBox));
            notes.push(`Trimmed empty space: ${trimBox.w}×${trimBox.h} from ${trimBox.sourceW}×${trimBox.sourceH}. The offset is in the JSON.`);
        }
    }
    if (loop === 'pingpong' && frames.length > 2) frames = frames.concat(frames.slice(1, -1).reverse());
    await mkdir(outDir, { recursive: true });
    let preview = null, sheetInfo = null;

    if (outputs.includes('spritesheet') || outputs.includes('json')) {
        const packed = packSheet(frames, columns);
        const { image, cols, rows, fw, fh } = packed;
        if (image.width > MAX_SIDE || image.height > MAX_SIDE) {
            throw new Error(`The sheet would be ${image.width}×${image.height} pixels, too big to open. Lower the scale or the fps, or shorten the clip.`);
        }
        if (image.width > WARN_SIDE || image.height > WARN_SIDE) notes.push(`Heads-up: the sheet is ${image.width}×${image.height}. Many phones can't load textures over 4096×4096; lower the scale if it's for mobile.`);
        sheetInfo = { width: image.width, height: image.height, cols, rows, frameWidth: fw, frameHeight: fh, frames: frames.length };
        if (outputs.includes('spritesheet')) {
            const p = join(outDir, 'spritesheet.png');
            await writePng(p, image);
            written.push(p);
        }
        if (outputs.includes('json')) {
            const p = join(outDir, 'spritesheet.json');
            await writeFile(p, JSON.stringify(atlasJson({ cols, rows, fw, fh, count: frames.length, fps, trim: trimBox, imageName: 'spritesheet.png' }), null, 2));
            written.push(p);
        }
        preview = previewOf(image);
    }
    if (outputs.includes('gif')) {
        const p = join(outDir, 'animation.gif');
        await writeFile(p, encodeGif(frames, fps));
        written.push(p);
    }
    if (outputs.includes('frames')) {
        const pad = Math.max(3, String(frames.length - 1).length);
        const dir = join(outDir, 'frames');
        for (let i = 0; i < frames.length; i++) await writePng(join(dir, `frame_${String(i).padStart(pad, '0')}.png`), frames[i]);
        written.push(dir + '/ (' + frames.length + ' PNGs)');
    }
    if (!preview) preview = previewOf(frames[0]);
    return { written, preview, sheetInfo, frameCount: frames.length, frameSize: { w: frames[0].width, h: frames[0].height } };
}

export async function convertVideo(a) {
    const input = resolve(a.input);
    await mustExist(input, 'video');
    const fps = a.fps ?? 12;
    const notes = [];
    const { frames } = await readFrames(input, { fps, start: a.start, end: a.end, scale: a.scale ?? 1, maxFrames: a.max_frames ?? 300, pixelArt: a.pixel_art });
    if (frames.length >= (a.max_frames ?? 300)) notes.push(`Stopped at ${frames.length} frames (max_frames). Set start/end or a lower fps for a shorter loop.`);
    await applyBackgroundOptions(frames, a, notes);
    const res = await writeOutputs(frames, {
        outDir: outDirFor(input, a.output_dir, 'sprites'), fps, columns: a.columns ?? 0, trim: a.trim ?? true,
        outputs: a.outputs ?? ['spritesheet', 'json'], loop: a.loop ?? 'forward', notes
    });
    return { ...res, notes, fps };
}

export async function makeGif(a) {
    const input = resolve(a.input);
    await mustExist(input, 'file');
    const notes = [];
    let frames, fps = a.fps ?? 12;
    if (a.atlas || (a.columns && a.rows)) {
        const sheet = await readImage(input);
        let atlas = null;
        if (a.atlas) { const ap = resolve(a.atlas); await mustExist(ap, 'atlas JSON'); atlas = JSON.parse(await readFile(ap, 'utf8')); }
        frames = sliceSheet(sheet, { atlas, columns: a.columns, rows: a.rows });
        if (atlas && !a.fps) fps = atlas.fps || (atlas.meta && atlas.meta.fps) || fps;
        if (a.frame_count) frames = frames.slice(0, a.frame_count);
    } else {
        ({ frames } = await readFrames(input, { fps, start: a.start, end: a.end, scale: a.scale ?? 1, maxFrames: a.max_frames ?? 300 }));
        await applyBackgroundOptions(frames, a, notes);
    }
    const res = await writeOutputs(frames, {
        outDir: outDirFor(input, a.output_dir, 'gif'), fps, columns: 0, trim: a.trim ?? true,
        outputs: ['gif'], loop: a.loop ?? 'forward', notes
    });
    return { ...res, notes, fps };
}

export async function sliceSpritesheet(a) {
    const input = resolve(a.input);
    await mustExist(input, 'sprite sheet');
    const sheet = await readImage(input);
    let atlas = null;
    if (a.atlas) { const ap = resolve(a.atlas); await mustExist(ap, 'atlas JSON'); atlas = JSON.parse(await readFile(ap, 'utf8')); }
    let frames = sliceSheet(sheet, { atlas, columns: a.columns, rows: a.rows });
    if (a.frame_count) frames = frames.slice(0, a.frame_count);
    if (a.skip_empty ?? true) frames = frames.filter(f => !isBlank(f));
    if (!frames.length) throw new Error('Every cell was empty. Check the columns and rows.');
    const outDir = outDirFor(input, a.output_dir, 'frames');
    const pad = Math.max(3, String(frames.length - 1).length);
    for (let i = 0; i < frames.length; i++) await writePng(join(outDir, `frame_${String(i).padStart(pad, '0')}.png`), frames[i]);
    return { outDir, count: frames.length, frameSize: { w: frames[0].width, h: frames[0].height }, preview: previewOf(frames[0]) };
}

export async function removeBackgroundTool(a) {
    await requirePro('AI background removal');
    const { removeBackground } = await import('./ai.js');
    const files = [];
    for (const p of a.inputs) {
        const input = resolve(p);
        await mustExist(input, 'image');
        if (!IMAGE_EXTS.has(extname(input).toLowerCase())) throw new Error(`"${p}" isn't an image. For videos use convert_video with remove_background_ai.`);
        const img = await readImage(input);
        await removeBackground(img, a.edges || 'normal');
        const out = a.output_dir ? join(resolve(a.output_dir), basename(input, extname(input)) + '-cutout.png')
            : join(dirname(input), basename(input, extname(input)) + '-cutout.png');
        await writePng(out, img);
        files.push({ out, img });
    }
    return { files: files.map(f => f.out), preview: previewOf(files[0].img) };
}

export const pngBase64 = img => encodePng(img).toString('base64');
