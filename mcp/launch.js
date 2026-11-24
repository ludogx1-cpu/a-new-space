#!/usr/bin/env node
// Entry point for the Claude Code plugin. Installs the plugin's dependencies the
// first time it starts (Claude Code copies the plugin folder without them), then
// runs the MCP server. All messages go to stderr: stdout belongs to MCP.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(root, 'node_modules', '@modelcontextprotocol', 'sdk'))) {
    process.stderr.write('[golden-paw-animate] First start: installing (about 30 MB, one time only)…\n');
    const win = process.platform === 'win32';
    const r = spawnSync(win ? 'npm.cmd' : 'npm', ['ci', '--omit=dev', '--no-audit', '--no-fund', '--loglevel=error'],
        { cwd: root, stdio: ['ignore', 2, 2], shell: win, windowsHide: true });
    if (r.status !== 0) {
        process.stderr.write('[golden-paw-animate] Install failed. Make sure Node.js 20+ and npm are installed, then restart.\n');
        process.exit(1);
    }
}
await import('./src/server.js');
