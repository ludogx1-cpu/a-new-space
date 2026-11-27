#!/usr/bin/env node
// Golden Paw Animation Creation Tool as an MCP server (stdio).
// https://goldenpaw.dog/studios/animation/ai-plugin.html
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { convertVideo, makeGif, sliceSpritesheet, removeBackgroundTool, pngBase64 } from './tools.js';
import * as pro from './pro.js';

// Tool annotations (MCP hints for the AI app): every tool writes new files on this computer
// (by default in a new "<name>-sprites" style folder) and never deletes or edits the originals. openWorldHint is true where the tool can go
// online: the one-time AI model download (Pro) and the Polar licence check.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const server = new McpServer({ name: 'golden-paw-animate', version: pkg.version });

const ok = (text, img) => ({ content: img ? [{ type: 'text', text }, { type: 'image', data: pngBase64(img), mimeType: 'image/png' }] : [{ type: 'text', text }] });
const fail = e => ({ isError: true, content: [{ type: 'text', text: (e && e.message) || String(e) }] });
const wrap = fn => async args => { try { return await fn(args); } catch (e) { return fail(e); } };

const chromaKey = z.object({
    color: z.string().optional().describe('Backdrop colour as #rrggbb, or "auto" to detect it from the frame edges. Default auto.'),
    tolerance: z.number().min(0).max(442).optional().describe('How close to the colour counts as background (0-442). Default 90. Raise if backdrop is left; lower if the subject gets holes.'),
    feather: z.number().min(0).max(100).optional().describe('Soft edge width. Default 15 (0 for pixel art).'),
    match: z.enum(['rgb', 'colour_only']).optional().describe('"colour_only" ignores brightness: use it for backdrops with shadows or hot spots.'),
    spill_suppression: z.number().min(0).max(100).optional().describe('Removes the green/blue fringe on edges. Default 60.')
}).describe('Free green-screen / solid-colour background removal.');

const timing = {
    fps: z.number().min(1).max(60).optional().describe('Frames per second to capture. Default 12; 8-12 suits most game sprites.'),
    start: z.number().min(0).optional().describe('Start time in seconds.'),
    end: z.number().min(0).optional().describe('End time in seconds. Pick one full cycle of the motion for a clean loop.'),
    scale: z.number().gt(0).max(1).optional().describe('Output size as a fraction of the video, e.g. 0.25. Default 1.'),
    max_frames: z.number().int().min(1).max(2000).optional().describe('Safety cap on frames. Default 300.')
};

server.registerTool('convert_video', {
    title: 'Video to sprite sheet',
    description: 'Turn a video (or animated GIF) into a game-ready sprite sheet PNG plus a TexturePacker JSON Hash atlas (works with Phaser, PixiJS, Godot, Unity importers and more), and optionally an animated GIF and individual frame PNGs. Can remove a green-screen/solid background for free, or any background with AI (Pro). Files are processed on this computer and written next to the input unless output_dir is given.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
        input: z.string().describe('Path to the video file (mp4, mov, webm, gif, …).'),
        output_dir: z.string().optional().describe('Folder for the results. Default: "<video name>-sprites" next to the video.'),
        ...timing,
        outputs: z.array(z.enum(['spritesheet', 'json', 'gif', 'frames'])).optional().describe('What to write. Default ["spritesheet","json"].'),
        columns: z.number().int().min(0).max(256).optional().describe('Sheet columns. 0 = roughly square (default); 1 = vertical strip; use the frame count for one horizontal row.'),
        trim: z.boolean().optional().describe('Crop every frame to one shared box around the visible pixels (offsets go in the JSON). Default true.'),
        chroma_key: chromaKey.optional(),
        remove_background_ai: z.boolean().optional().describe('PRO: cut the subject out of any background with AI, no green screen needed. Slower: several seconds per frame.'),
        ai_edges: z.enum(['soft', 'normal', 'crisp']).optional().describe('AI edge style: soft for fur/hair, crisp for cartoons and pixel art.'),
        pixel_art: z.boolean().optional().describe('Keep hard pixel edges when scaling (nearest-neighbour) and no feathering.'),
        loop: z.enum(['forward', 'pingpong']).optional().describe('"pingpong" plays forwards then backwards (baked into the frames).')
    }
}, wrap(async a => {
    const r = await convertVideo(a);
    const s = r.sheetInfo;
    const lines = [
        `Done: ${r.frameCount} frames at ${r.fps} fps, each ${r.frameSize.w}×${r.frameSize.h}px.`,
        s ? `Sprite sheet ${s.width}×${s.height}px, ${s.cols} columns × ${s.rows} rows.` : null,
        ...r.notes,
        'Files:', ...r.written.map(p => `- ${p}`),
        'Preview of the result (checkerboard = transparent):'
    ].filter(Boolean);
    return ok(lines.join('\n'), r.preview);
}));

server.registerTool('make_gif', {
    title: 'Make an animated GIF',
    description: 'Make an animated GIF with a transparent background, either from a video or from an existing sprite sheet (give atlas, or columns and rows). GIF transparency is all-or-nothing, so soft edges are snapped at 50%.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
        input: z.string().describe('Path to a video, or to a sprite sheet image.'),
        atlas: z.string().optional().describe('For a sprite sheet: path to its JSON atlas (TexturePacker hash or array).'),
        columns: z.number().int().min(1).optional().describe('For a sprite sheet without an atlas: number of columns.'),
        rows: z.number().int().min(1).optional().describe('For a sprite sheet without an atlas: number of rows.'),
        frame_count: z.number().int().min(1).optional().describe('For a sprite sheet whose last row isn\'t full: how many frames to use.'),
        output_dir: z.string().optional(),
        ...timing,
        trim: z.boolean().optional(),
        chroma_key: chromaKey.optional(),
        remove_background_ai: z.boolean().optional().describe('PRO: AI background removal (video input only).'),
        ai_edges: z.enum(['soft', 'normal', 'crisp']).optional(),
        loop: z.enum(['forward', 'pingpong']).optional()
    }
}, wrap(async a => {
    const r = await makeGif(a);
    return ok([`GIF made: ${r.frameCount} frames at ${r.fps} fps, ${r.frameSize.w}×${r.frameSize.h}px.`, ...r.notes, ...r.written.map(p => `- ${p}`), 'First frame:'].join('\n'), r.preview);
}));

server.registerTool('slice_spritesheet', {
    title: 'Cut a sprite sheet into frames',
    description: 'Cut an existing sprite sheet into individual PNG frames, using its JSON atlas or a grid of columns × rows. Empty cells are skipped.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
        input: z.string().describe('Path to the sprite sheet image.'),
        atlas: z.string().optional().describe('Path to the JSON atlas, if there is one.'),
        columns: z.number().int().min(1).optional(),
        rows: z.number().int().min(1).optional(),
        frame_count: z.number().int().min(1).optional(),
        skip_empty: z.boolean().optional().describe('Skip fully transparent cells. Default true.'),
        output_dir: z.string().optional().describe('Default: "<sheet name>-frames" next to the sheet.')
    }
}, wrap(async a => {
    const r = await sliceSpritesheet(a);
    return ok(`Saved ${r.count} frames (${r.frameSize.w}×${r.frameSize.h}px) to ${r.outDir}\nFirst frame:`, r.preview);
}));

server.registerTool('remove_background', {
    title: 'AI background removal (Pro)',
    description: 'PRO: cut the subject out of one or more images with AI, no green screen needed, saving "<name>-cutout.png" with a transparent background. Runs on this computer; the first use downloads the AI engine and model (about 70 MB, once).',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    inputSchema: {
        inputs: z.array(z.string()).min(1).describe('Paths to images (png, jpg, webp).'),
        edges: z.enum(['soft', 'normal', 'crisp']).optional().describe('soft for fur/hair, crisp for cartoons and pixel art. Default normal.'),
        output_dir: z.string().optional()
    }
}, wrap(async a => {
    const r = await removeBackgroundTool(a);
    return ok(`Cut out ${r.files.length} image(s):\n${r.files.map(p => `- ${p}`).join('\n')}`, r.preview);
}));

server.registerTool('activate_pro', {
    title: 'Activate Pro',
    description: `Unlock Golden Paw Animation Pro on this computer with the licence key from the purchase email (Pro is ${pro.PRO.price} one-off: AI background removal on the website, desktop app and this plugin). Call with no key to check the current status, or deactivate: true to free this computer's activation.`,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: {
        licence_key: z.string().optional(),
        deactivate: z.boolean().optional()
    }
}, wrap(async a => {
    if (a.deactivate) { await pro.deactivate(); return ok('Pro has been deactivated on this computer, freeing one of your activations.'); }
    if (a.licence_key) { const r = await pro.activate(a.licence_key); return r.ok ? ok(r.message) : fail(new Error(r.message)); }
    const s = pro.status();
    return ok(s.pro ? `Pro is active${s.email ? ` (${s.email})` : ''}.` : `Pro isn't active on this computer. Get it at ${pro.PRO.buyUrl}, then call activate_pro with your licence key.`);
}));

await server.connect(new StdioServerTransport());
