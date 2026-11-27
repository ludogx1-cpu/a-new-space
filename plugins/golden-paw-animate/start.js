#!/usr/bin/env node
// Starts the Golden Paw Animate MCP server: the npm package golden-paw-animate-mcp,
// pinned to the exact version below. npx downloads it once (about 30 MB with ffmpeg)
// and then runs it from its cache. The server's source code is public:
// https://github.com/ludogx1-cpu/a-new-space/tree/main/mcp
// This file only starts it; Claude talks to the server over stdin/stdout.
import { spawn } from 'node:child_process';

const PACKAGE = process.env.GOLDEN_PAW_PLUGIN_PACKAGE || 'golden-paw-animate-mcp@1.0.1';
const win = process.platform === 'win32';

const child = spawn(win ? 'npx.cmd' : 'npx', ['--yes', PACKAGE], {
    stdio: 'inherit',
    shell: win,          // npx is a .cmd script on Windows
    windowsHide: true
});
child.on('error', () => {
    process.stderr.write('[golden-paw-animate] Could not start. Install Node.js 20 or newer from https://nodejs.org/ and restart.\n');
    process.exit(1);
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s));
