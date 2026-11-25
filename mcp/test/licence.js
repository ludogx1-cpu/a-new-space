// Licence flow against a stand-in for Polar's licence-key API (no real purchase needed).
// Replies follow Polar's documented shapes: activate → 200 activation / 403 / 404,
// validate → 200 { status, benefit_id, customer } / 404, deactivate → 204.
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BENEFIT = 'c3873ccc-59ab-4dea-94bd-ddf6e3c05843';
const ORG = '98ca8cbb-97ba-4f7a-b67c-350a5724f9dd';
const keys = {
    'GPAW-GOOD-0000-0000': { benefit: BENEFIT, used: 0, limit: 3 },
    'GPAW-FULL-0000-0000': { benefit: BENEFIT, used: 3, limit: 3 },
    'OTHR-WRONG-PRODUCT0': { benefit: 'another-benefit', used: 0, limit: 3 }
};
const calls = [];
const server = createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
        const j = JSON.parse(body || '{}');
        const ep = req.url.split('/').pop();
        calls.push([ep, j]);
        const k = keys[j.key];
        const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(obj ? JSON.stringify(obj) : ''); };
        if (j.organization_id !== ORG) return send(422, { error: 'RequestValidationError' });
        if (!k) return send(404, { error: 'ResourceNotFound', detail: 'Not found' });
        if (ep === 'activate') {
            if (k.used >= k.limit) return send(403, { error: 'NotPermitted', detail: 'License key activation limit already reached' });
            k.used++;
            return send(200, { id: 'act-' + k.used, label: j.label, license_key: { key: j.key } });
        }
        if (ep === 'validate') {
            if (j.benefit_id && j.benefit_id !== k.benefit) return send(404, { error: 'ResourceNotFound' });
            return send(200, { status: 'granted', benefit_id: k.benefit, customer: { email: 'buyer@example.com' } });
        }
        if (ep === 'deactivate') { k.used--; return send(204); }
        send(404, {});
    });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
process.env.GOLDEN_PAW_LICENCE_API = `http://127.0.0.1:${server.address().port}/v1/customer-portal/license-keys/`;
process.env.GOLDEN_PAW_HOME = mkdtempSync(join(tmpdir(), 'gpa-lic-'));
const pro = await import('../src/pro.js');

let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!cond) failed++; };

let r = await pro.activate('GPAW-FULL-0000-0000');
check('key on 3 devices already → clear message', !r.ok && /maximum number of devices/.test(r.message), r.message);
r = await pro.activate('GPAW-NOPE-0000-0000');
check('unknown key → not found', !r.ok && /couldn't find/.test(r.message), r.message);
r = await pro.activate('OTHR-WRONG-PRODUCT0');
check('key from another product → refused and freed', !r.ok && /different product/.test(r.message) && keys['OTHR-WRONG-PRODUCT0'].used === 0, r.message);
check('Pro still off', !pro.isPro());
r = await pro.activate('GPAW-GOOD-0000-0000');
check('good key → unlocked', r.ok && pro.isPro(), r.message);
check('checked against the Pro benefit', calls.some(([ep, j]) => ep === 'validate' && j.benefit_id === BENEFIT));
check('email remembered', pro.status().email === 'buyer@example.com');
await pro.deactivate();
check('deactivate frees the device', !pro.isPro() && keys['GPAW-GOOD-0000-0000'].used === 0);

server.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nAll licence checks passed');
process.exit(failed ? 1 : 0);
