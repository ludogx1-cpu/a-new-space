// Golden Paw Animation Pro licence, checked with Lemon Squeezy's licence API
// (the same keys and rules as the website and desktop app).
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { homeDir } from './home.js';

// Fill PRODUCT_ID in once the Lemon Squeezy product exists, so keys for other
// products can't unlock Pro. Empty = accept any valid key (while testing).
export const PRO = {
    price: '£11.99',
    buyUrl: 'https://goldenpaw.dog/studios/animation/pro.html',
    productId: ''
};

const API = 'https://api.lemonsqueezy.com/v1/licenses/';
const RECHECK_DAYS = 7;
const OFFLINE_GRACE_DAYS = 30;

const file = () => join(homeDir(), 'pro.json');
function read() { try { return JSON.parse(readFileSync(file(), 'utf8')); } catch { return null; } }
function write(v) { if (v) writeFileSync(file(), JSON.stringify(v, null, 2)); else rmSync(file(), { force: true }); }

async function post(endpoint, fields) {
    const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams(fields)
    });
    let data = {};
    try { data = await res.json(); } catch { /* not JSON */ }
    return { ok: res.ok, data };
}

const rightProduct = meta => !PRO.productId || (meta && String(meta.product_id) === String(PRO.productId));

export function isPro() {
    const s = read();
    if (!s || !s.key || !s.instanceId) return false;
    return (Date.now() - (s.checkedAt || 0)) / 864e5 <= OFFLINE_GRACE_DAYS;
}

export function status() {
    const s = read();
    if (!isPro()) return { pro: false };
    return { pro: true, email: s.email || null, lastChecked: new Date(s.checkedAt).toISOString() };
}

export async function activate(rawKey) {
    const key = String(rawKey || '').trim();
    if (!/^[A-Za-z0-9-]{16,}$/.test(key)) return { ok: false, message: "That doesn't look like a licence key. It's in your purchase email from Lemon Squeezy." };
    let ok, data;
    try { ({ ok, data } = await post('activate', { license_key: key, instance_name: `Golden Paw Animate AI plugin (${hostname()})` })); }
    catch { return { ok: false, message: "Couldn't reach the licence server. Check your internet connection and try again." }; }
    if (!ok || !data.activated) {
        const msg = (data && data.error) || 'The licence key could not be activated.';
        if (/limit/i.test(msg)) return { ok: false, message: 'This key is already active on the maximum number of devices. Deactivate it on another device first, or contact support.' };
        if (/not found|invalid/i.test(msg)) return { ok: false, message: "We couldn't find that licence key. Copy it exactly from your purchase email." };
        return { ok: false, message: msg };
    }
    if (!rightProduct(data.meta)) return { ok: false, message: 'That key is for a different product.' };
    write({ key, instanceId: data.instance && data.instance.id, checkedAt: Date.now(), email: data.meta && data.meta.customer_email });
    return { ok: true, message: 'Pro is unlocked on this computer. Thank you!' };
}

export async function deactivate() {
    const s = read();
    if (s && s.key && s.instanceId) { try { await post('deactivate', { license_key: s.key, instance_id: s.instanceId }); } catch { /* offline */ } }
    write(null);
}

/** Re-validates weekly. A refunded or disabled key turns Pro off; being offline doesn't. */
export async function recheck() {
    const s = read();
    if (!s || !s.key) return;
    if ((Date.now() - (s.checkedAt || 0)) / 864e5 < RECHECK_DAYS) return;
    try {
        const { data } = await post('validate', { license_key: s.key, instance_id: s.instanceId || '' });
        if (data && data.valid && rightProduct(data.meta)) { s.checkedAt = Date.now(); write(s); }
        else if (data && data.valid === false) write(null);
    } catch { /* offline: keep Pro until the grace period ends */ }
}

/** Throws a friendly error unless Pro is active. Uses GOLDEN_PAW_PRO_KEY once if set. */
export async function requirePro(feature) {
    await recheck();
    if (!isPro() && process.env.GOLDEN_PAW_PRO_KEY) await activate(process.env.GOLDEN_PAW_PRO_KEY);
    if (isPro()) return;
    throw new Error(`${feature} is part of Golden Paw Animation Pro (${PRO.price} one-off, no subscription): ${PRO.buyUrl}\n` +
        'Already bought it? Use the activate_pro tool with the licence key from your purchase email.\n' +
        'Free alternative: if the video has a plain or green background, use chroma_key instead.');
}
