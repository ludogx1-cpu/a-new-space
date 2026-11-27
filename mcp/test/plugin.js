// Checks the Claude plugin folder (plugins/golden-paw-animate): versions agree, and
// start.js launches the server the way Claude does. With GOLDEN_PAW_PLUGIN_PACKAGE
// unset it uses the package pinned in start.js from npm (only once it is published),
// so CI points it at this folder instead.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = new URL('../../plugins/golden-paw-animate/', import.meta.url);
let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!cond) failed++; };

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const plugin = JSON.parse(readFileSync(new URL('.claude-plugin/plugin.json', root), 'utf8')).version;
const market = JSON.parse(readFileSync(new URL('../../.claude-plugin/marketplace.json', import.meta.url), 'utf8')).plugins[0].version;
const pinned = (readFileSync(new URL('start.js', root), 'utf8').match(/golden-paw-animate-mcp@([\d.]+)/) || [])[1];
check('versions match', pkg === plugin && plugin === market && market === pinned, `package ${pkg}, plugin ${plugin}, marketplace ${market}, start.js ${pinned}`);

const env = { ...process.env, GOLDEN_PAW_HOME: fileURLToPath(new URL('../.plugin-test-home/', import.meta.url)) };
if (process.argv.includes('--local')) env.GOLDEN_PAW_PLUGIN_PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('start.js', root))], env, stderr: 'inherit',
    // Run from a neutral folder, as Claude does: inside mcp/ itself npx would pick up this
    // unpublished package (same name and version) instead of downloading it.
    cwd: tmpdir() });
const client = new Client({ name: 'plugin-test', version: '1' });
await client.connect(transport);
const { tools } = await client.listTools();
check('plugin starts and lists the 5 tools', tools.length === 5, tools.map(t => t.name).join(', '));
check('server version', client.getServerVersion().version === pkg, client.getServerVersion().version);
await client.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nPlugin checks passed');
process.exit(failed ? 1 : 0);
