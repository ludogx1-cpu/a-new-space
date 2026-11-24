// Pixel work: chroma key, trimming, sprite-sheet packing and the atlas JSON.
// Ported from the website (public/assets/converter.js) so results match.

export function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) throw new Error(`"${hex}" isn't a colour like #00ff00.`);
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = ({ r, g, b }) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

/** Guesses the backdrop colour from the border of the first frame. */
export function guessKeyColour(frame) {
    const { width: w, height: h, data } = frame;
    const counts = new Map();
    const add = (x, y) => {
        const i = (y * w + x) * 4;
        const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        const c = counts.get(k) || { n: 0, r: 0, g: 0, b: 0 };
        c.n++; c.r += data[i]; c.g += data[i + 1]; c.b += data[i + 2];
        counts.set(k, c);
    };
    for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
    for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }
    let best = null;
    for (const c of counts.values()) if (!best || c.n > best.n) best = c;
    return toHex({ r: Math.round(best.r / best.n), g: Math.round(best.g / best.n), b: Math.round(best.b / best.n) });
}

function toChromaticity(r, g, b) {
    const sum = r + g + b;
    if (sum < 12) return null;
    return { r: (r / sum) * 255, g: (g / sum) * 255 };
}

/** key: { r, g, b, tolerance, feather, mode: 'rgb'|'chroma', despill: 0-1 }. Edits frame.data in place. */
export function chromaKey(frame, key) {
    const data = frame.data;
    const chromaMode = key.mode === 'chroma';
    const tol = key.tolerance;
    const tolInner = Math.max(0, tol - key.feather);
    const tolInner2 = tolInner * tolInner, tol2 = tol * tol, featherRange = tol - tolInner;
    const keyChroma = chromaMode ? toChromaticity(key.r, key.g, key.b) : null;
    const strength = key.despill;
    const maxChannel = Math.max(key.r, key.g, key.b);
    let spillIdx = -1;
    if (strength > 0) {
        if (maxChannel === key.g && key.g > (key.r + key.b) / 2) spillIdx = 1;
        else if (maxChannel === key.b && key.b > (key.r + key.g) / 2) spillIdx = 2;
        else if (maxChannel === key.r && key.r > (key.g + key.b) / 2) spillIdx = 0;
    }
    for (let j = 0; j < data.length; j += 4) {
        const r = data[j], g = data[j + 1], b = data[j + 2];
        let d2;
        const c = chromaMode && keyChroma ? toChromaticity(r, g, b) : null;
        if (c) { const dr = c.r - keyChroma.r, dg = c.g - keyChroma.g; d2 = dr * dr + dg * dg; }
        else { const dr = r - key.r, dg = g - key.g, db = b - key.b; d2 = dr * dr + dg * dg + db * db; }
        if (d2 < tolInner2) { data[j + 3] = 0; continue; }
        if (d2 < tol2 && featherRange > 0) data[j + 3] = Math.round(((Math.sqrt(d2) - tolInner) / featherRange) * data[j + 3]);
        if (spillIdx >= 0 && data[j + 3] > 0) {
            const a = spillIdx === 0 ? g : r;
            const bb = spillIdx === 2 ? g : b;
            const limit = (a + bb) / 2;
            const v = data[j + spillIdx];
            if (v > limit) data[j + spillIdx] = Math.round(v - (v - limit) * strength);
        }
    }
}

/** One bounding box around the visible pixels of every frame, or null if there's nothing to trim. */
export function sharedTrimBox(frames) {
    const { width: w, height: h } = frames[0];
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (const f of frames) {
        const d = f.data;
        for (let y = 0; y < h; y++) {
            const row = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (d[row + x * 4 + 3] > 0) {
                    if (x < x0) x0 = x; if (x > x1) x1 = x;
                    if (y < y0) y0 = y; if (y > y1) y1 = y;
                }
            }
        }
    }
    if (x1 < 0) return null; // fully transparent
    const tw = x1 - x0 + 1, th = y1 - y0 + 1;
    if (tw >= w && th >= h) return null;
    return { x: x0, y: y0, w: tw, h: th, sourceW: w, sourceH: h };
}

export function crop(frame, box) {
    const out = new Uint8Array(box.w * box.h * 4);
    for (let y = 0; y < box.h; y++) {
        const src = ((box.y + y) * frame.width + box.x) * 4;
        out.set(frame.data.subarray(src, src + box.w * 4), y * box.w * 4);
    }
    return { width: box.w, height: box.h, data: out };
}

/** Packs equally sized frames into a grid. columns 0 = roughly square. */
export function packSheet(frames, columns = 0) {
    const n = frames.length;
    const cols = columns > 0 ? Math.min(columns, n) : Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const fw = frames[0].width, fh = frames[0].height;
    const W = fw * cols, H = fh * rows;
    const data = new Uint8Array(W * H * 4);
    frames.forEach((f, i) => {
        const ox = (i % cols) * fw, oy = Math.floor(i / cols) * fh;
        for (let y = 0; y < fh; y++) data.set(f.data.subarray(y * fw * 4, (y + 1) * fw * 4), ((oy + y) * W + ox) * 4);
    });
    return { image: { width: W, height: H, data }, cols, rows, fw, fh };
}

/** TexturePacker JSON Hash, plus the grid fields the website also writes. */
export function atlasJson({ cols, rows, fw, fh, count, fps, trim, imageName, direction = 'forward' }) {
    const frames = {};
    const pad = Math.max(3, String(count - 1).length);
    for (let i = 0; i < count; i++) {
        frames[`frame_${String(i).padStart(pad, '0')}.png`] = {
            frame: { x: (i % cols) * fw, y: Math.floor(i / cols) * fh, w: fw, h: fh },
            rotated: false,
            trimmed: !!trim,
            spriteSourceSize: { x: trim ? trim.x : 0, y: trim ? trim.y : 0, w: fw, h: fh },
            sourceSize: { w: trim ? trim.sourceW : fw, h: trim ? trim.sourceH : fh },
            duration: Math.round(1000 / fps)
        };
    }
    return {
        frames,
        meta: {
            app: 'Golden Paw Animation Creation Tool',
            image: imageName,
            format: 'RGBA8888',
            size: { w: cols * fw, h: rows * fh },
            scale: '1',
            fps,
            frameTags: [{ name: 'all', from: 0, to: Math.max(0, count - 1), direction }]
        },
        frameWidth: fw, frameHeight: fh, cols, rows, count, fps,
        trimmed: trim || null
    };
}

/** Cuts a sheet into frames, from an atlas (TexturePacker hash or array) or a grid. */
export function sliceSheet(sheet, { atlas, columns, rows }) {
    let rects;
    if (atlas) {
        const list = Array.isArray(atlas.frames)
            ? atlas.frames
            : Object.keys(atlas.frames).sort(new Intl.Collator(undefined, { numeric: true }).compare).map(k => atlas.frames[k]);
        rects = list.map(f => f.frame);
    } else {
        if (!(columns > 0 && rows > 0)) throw new Error('Give either an atlas JSON file or the number of columns and rows.');
        const fw = Math.floor(sheet.width / columns), fh = Math.floor(sheet.height / rows);
        rects = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) rects.push({ x: c * fw, y: r * fh, w: fw, h: fh });
    }
    return rects.map(rc => {
        if (rc.x + rc.w > sheet.width || rc.y + rc.h > sheet.height) throw new Error('The atlas describes frames outside the image. Is it the right JSON for this sheet?');
        return crop(sheet, rc);
    });
}

export function isBlank(frame) {
    const d = frame.data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return false;
    return true;
}

/** Bilinear resize, used for previews and for the AI model's fixed input size. */
export function resize(src, W, H) {
    const { width: w, height: h, data } = src;
    const out = new Uint8Array(W * H * 4);
    const sx = w / W, sy = h / H;
    for (let y = 0; y < H; y++) {
        const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
        const y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
        for (let x = 0; x < W; x++) {
            const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
            const x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
            const o = (y * W + x) * 4;
            for (let c = 0; c < 4; c++) {
                const a = data[(y0 * w + x0) * 4 + c], b = data[(y0 * w + x1) * 4 + c];
                const d = data[(y1 * w + x0) * 4 + c], e = data[(y1 * w + x1) * 4 + c];
                out[o + c] = (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
            }
        }
    }
    return { width: W, height: H, data: out };
}

/** A small preview that fits inside max×max, composited on a light checkerboard so transparency shows. */
export function previewOf(img, max = 768) {
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const p = s < 1 ? resize(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s))) : { ...img, data: new Uint8Array(img.data) };
    const d = p.data;
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        const i = (y * p.width + x) * 4, a = d[i + 3] / 255;
        const bg = ((x >> 3) + (y >> 3)) & 1 ? 204 : 255;
        d[i] = d[i] * a + bg * (1 - a); d[i + 1] = d[i + 1] * a + bg * (1 - a); d[i + 2] = d[i + 2] * a + bg * (1 - a); d[i + 3] = 255;
    }
    return p;
}
