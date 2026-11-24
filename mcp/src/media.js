// Reading video and images into RGBA frames, and writing PNGs.
// ffmpeg runs as a separate program (ffmpeg-static ships a build for each platform;
// set FFMPEG_PATH to use your own).
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { PNG } from 'pngjs';
import ffmpegStatic from 'ffmpeg-static';

export const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);

export function ffmpegPath() {
    return process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
}

function runFfmpeg(args) {
    return new Promise((resolve, reject) => {
        let err = '';
        const p = spawn(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
        p.stderr.on('data', d => { err += d; if (err.length > 40000) err = err.slice(-40000); });
        p.on('error', e => reject(new Error(`Couldn't start ffmpeg (${e.message}). Set FFMPEG_PATH to an ffmpeg program if the bundled one is missing.`)));
        p.on('close', code => {
            if (code === 0) return resolve(err);
            const tail = err.trim().split('\n').slice(-4).join('\n');
            reject(new Error(`ffmpeg couldn't read that file.\n${tail}`));
        });
    });
}

/**
 * Decodes a video (or a single image) into RGBA frames.
 * opts: { fps, start, end, scale (0-1], maxFrames, pixelArt }
 * Returns { frames: [{width, height, data}], sourceWidth, sourceHeight }.
 */
export async function readFrames(input, opts = {}) {
    const isImage = IMAGE_EXTS.has(extname(input).toLowerCase()) && extname(input).toLowerCase() !== '.gif';
    const dir = await mkdtemp(join(tmpdir(), 'gp-animate-'));
    try {
        const vf = [];
        if (!isImage && opts.fps) vf.push(`fps=${Number(opts.fps)}`);
        const scale = Number(opts.scale) || 1;
        if (scale !== 1) {
            const flags = opts.pixelArt ? 'neighbor' : 'lanczos';
            vf.push(`scale=max(1\\,trunc(iw*${scale})):max(1\\,trunc(ih*${scale})):flags=${flags}`);
        }
        const build = (decoder) => {
            const a = ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error'];
            if (!isImage && opts.start) a.push('-ss', String(opts.start));
            if (decoder) a.push('-c:v', decoder);
            a.push('-i', input);
            if (!isImage && opts.end != null) {
                const dur = Number(opts.end) - Number(opts.start || 0);
                if (!(dur > 0)) throw new Error('The end time must be after the start time.');
                a.push('-t', String(dur));
            }
            if (vf.length) a.push('-vf', vf.join(','));
            a.push('-frames:v', String(isImage ? 1 : (opts.maxFrames || 300)), '-pix_fmt', 'rgba', join(dir, 'f_%05d.png'));
            return a;
        };
        // WebM can carry an alpha channel, which only the libvpx decoder keeps.
        if (extname(input).toLowerCase() === '.webm') {
            try { await runFfmpeg(build('libvpx-vp9')); } catch { await runFfmpeg(build(null)); }
        } else {
            await runFfmpeg(build(null));
        }
        const names = (await readdir(dir)).filter(n => n.endsWith('.png')).sort();
        if (!names.length) throw new Error('No frames came out of that file. Check the start and end times.');
        const frames = [];
        for (const n of names) frames.push(PNG.sync.read(await readFile(join(dir, n))));
        return { frames: frames.map(f => ({ width: f.width, height: f.height, data: f.data })) };
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

/** Reads one image of any common format as RGBA. */
export async function readImage(file) {
    if (extname(file).toLowerCase() === '.png') {
        const p = PNG.sync.read(await readFile(file));
        return { width: p.width, height: p.height, data: p.data };
    }
    const { frames } = await readFrames(file, {});
    return frames[0];
}

export function encodePng(img) {
    const png = new PNG({ width: img.width, height: img.height });
    png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    return PNG.sync.write(png, { colorType: 6 });
}

export async function writePng(file, img) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, encodePng(img));
}
