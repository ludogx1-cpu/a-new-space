// AI background removal (Pro): IS-Net (Apache-2.0), the same model the website uses.
// The runtime (onnxruntime-web, ~25 MB download) and the model (~46 MB) are fetched
// the first time AI is used, so the free features stay a small install.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, renameSync, rmSync, createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homeDir } from './home.js';
import { resize } from './imageops.js';

const RUNTIME = 'onnxruntime-web@1.27.0';
const MODEL_URL = 'https://goldenpaw.dog/studios/animation/models/isnet-general-use-q8.onnx';
const MODEL_SHA256 = 'f1b1c6f7656e532627697afc989d953be1e7ef8f55a718f3611e8c9fd50cdef7';
const SIZE = 1024;
// Confidence window per edge style (same as the website): below lo is clear, above hi is solid.
const EDGES = { soft: [0.03, 0.97], normal: [0.15, 0.85], crisp: [0.35, 0.65] };

let session = null, ort = null;
const log = m => process.stderr.write(`[golden-paw-animate] ${m}\n`); // stdout belongs to MCP

function runNpm(args, cwd) {
    return new Promise((resolve, reject) => {
        const win = process.platform === 'win32';
        const p = spawn(win ? 'npm.cmd' : 'npm', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: win, windowsHide: true });
        let err = '';
        p.stdout.on('data', () => {});
        p.stderr.on('data', d => { err += d; });
        p.on('error', e => reject(new Error(`Couldn't run npm to install the AI engine (${e.message}).`)));
        p.on('close', c => c === 0 ? resolve() : reject(new Error(`Installing the AI engine failed:\n${err.trim().split('\n').slice(-4).join('\n')}`)));
    });
}

async function loadRuntime() {
    if (ort) return ort;
    try { ort = await import('onnxruntime-web'); return ort; } catch { /* not installed alongside: use our own copy */ }
    const dir = join(homeDir(), 'ai-runtime');
    const req = () => createRequire(join(dir, 'package.json'));
    let entry;
    try { entry = req().resolve('onnxruntime-web'); }
    catch {
        log('First AI use: installing the AI engine (about 25 MB, one time only)…');
        mkdirSync(dir, { recursive: true });
        await runNpm(['install', '--prefix', dir, '--no-audit', '--no-fund', '--no-save', '--loglevel=error', RUNTIME], dir);
        entry = req().resolve('onnxruntime-web');
    }
    ort = await import(pathToFileURL(entry).href);
    if (ort.default && !ort.InferenceSession) ort = ort.default;
    return ort;
}

async function sha256(file) {
    return createHash('sha256').update(await readFile(file)).digest('hex');
}

async function modelPath() {
    if (process.env.GOLDEN_PAW_MODEL) return process.env.GOLDEN_PAW_MODEL;
    const dir = join(homeDir(), 'models');
    const file = join(dir, 'isnet-general-use-q8.onnx');
    if (existsSync(file)) return file;
    mkdirSync(dir, { recursive: true });
    log('First AI use: downloading the background-removal model (46 MB, one time only)…');
    const res = await fetch(MODEL_URL);
    if (!res.ok || !res.body) throw new Error(`Couldn't download the AI model (HTTP ${res.status}). Check your internet connection.`);
    const tmp = file + '.part';
    await new Promise((resolve, reject) => {
        const out = createWriteStream(tmp);
        const reader = res.body.getReader();
        const pump = () => reader.read().then(({ done, value }) => {
            if (done) { out.end(resolve); return; }
            out.write(Buffer.from(value)) ? pump() : out.once('drain', pump);
        }, reject);
        out.on('error', reject);
        pump();
    });
    if (await sha256(tmp) !== MODEL_SHA256) { rmSync(tmp, { force: true }); throw new Error('The downloaded AI model was damaged. Please try again.'); }
    renameSync(tmp, file);
    return file;
}

async function getSession() {
    if (session) return session;
    const rt = await loadRuntime();
    rt.env.wasm.numThreads = Math.max(1, Math.min(8, cpus().length));
    session = await rt.InferenceSession.create(await modelPath(), { executionProviders: ['wasm'] });
    return session;
}

/**
 * Cleans the AI mask: keeps the subject and any large parts (at least 2% of the
 * biggest), drops small loose specks the model sometimes leaves in busy backgrounds,
 * and keeps soft edges only within EDGE_PX of what's kept. a: alpha bytes with the
 * given stride (1 for a plain mask, 4 for RGBA), w × h pixels. Edits a in place.
 */
export function dropSpecks(a, w, h, stride) {
    const P = w * h, CORE = 64, EDGE_PX = Math.max(4, Math.round(Math.max(w, h) / 80));
    const label = new Int32Array(P), queue = new Int32Array(P), sizes = [0];
    const al = i => a[i * stride];
    // 1. Solid parts ("cores"): 8-connected pixels at least 25% opaque.
    for (let s = 0; s < P; s++) {
        if (label[s] || al(s) < CORE) continue;
        const id = sizes.length; let n = 0, head = 0, tail = 0;
        label[s] = id; queue[tail++] = s;
        while (head < tail) {
            const i = queue[head++], x = i % w, y = (i - x) / w; n++;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const j = ny * w + nx;
                if (!label[j] && al(j) >= CORE) { label[j] = id; queue[tail++] = j; }
            }
        }
        sizes.push(n);
    }
    if (sizes.length < 2) return; // nothing solid: leave the mask as it is
    const keep = Math.max(1, Math.max(...sizes) * 0.02);
    // 2. Spread from the kept parts through softer pixels, up to EDGE_PX away.
    const dist = new Int32Array(P).fill(-1);
    let head = 0, tail = 0;
    for (let i = 0; i < P; i++) if (label[i] && sizes[label[i]] >= keep) { dist[i] = 0; queue[tail++] = i; }
    while (head < tail) {
        const i = queue[head++], x = i % w, y = (i - x) / w;
        if (dist[i] >= EDGE_PX) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (dist[j] < 0 && al(j) > 0 && !label[j]) { dist[j] = dist[i] + 1; queue[tail++] = j; }
        }
    }
    // 3. Everything not reached becomes transparent.
    for (let i = 0; i < P; i++) if (dist[i] < 0) a[i * stride] = 0;
}

/** Cuts the subject out of frame (RGBA, edited in place). edge: soft | normal | crisp. */
export async function removeBackground(frame, edge = 'normal') {
    const s = await getSession();
    const small = resize(frame, SIZE, SIZE);
    const P = SIZE * SIZE, px = small.data;
    const input = new Float32Array(3 * P);
    for (let i = 0; i < P; i++) {
        input[i] = px[i * 4] / 255 - 0.5;
        input[P + i] = px[i * 4 + 1] / 255 - 0.5;
        input[2 * P + i] = px[i * 4 + 2] / 255 - 0.5;
    }
    const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
    const o = out[s.outputNames[0]].data;
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < P; i++) { const v = o[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const stretch = mn < -0.01 || mx > 1.01, span = mx - mn || 1;
    const [lo, hi] = EDGES[edge] || EDGES.normal;
    // Build the mask as an image so the same resize can scale it back to the frame size.
    const mask = { width: SIZE, height: SIZE, data: new Uint8Array(P * 4) };
    for (let i = 0; i < P; i++) {
        const p = stretch ? (o[i] - mn) / span : o[i];
        mask.data[i * 4 + 3] = Math.max(0, Math.min(255, ((p - lo) / (hi - lo)) * 255));
    }
    dropSpecks(mask.data.subarray(3), SIZE, SIZE, 4);
    const m = resize(mask, frame.width, frame.height).data;
    const d = frame.data;
    for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] * m[i] / 255);
}
