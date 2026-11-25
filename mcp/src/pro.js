// Golden Paw Animation Pro licence, checked with Polar's public licence-key API
// (the same keys and rules as the website and desktop app).
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { homeDir } from './home.js';

// The same values as public/assets/site.js → SITE_CONFIG.pro. None are secret.
export const PRO = {
    price: '£11.99',
    buyUrl: 'https://goldenpaw.dog/studios/animation/pro.html',
    organizationId: '98ca8cbb-97ba-4f7a-b67c-350a5724f9dd',
    benefitId: 'c3873ccc-59ab-4dea-94bd-ddf6e3c05843'
};

const API = process.env.GOLDEN_PAW_LICENCE_API || 'https://api.polar.sh/v1/customer-portal/license-keys/';
const RECHECK_DAYS = 7;
const OFFLINE_GRACE_DAYS = 30;

const file = () => join(homeDir(), 'pro.json');
function read() { try { return JSON.parse(readFileSync(file(), 'utf8')); } catch { return null; } }
function write(v) { if (v) writeFileSync(file(), JSON.stringify(v, null, 2)); else rmSync(file(), { force: true }); }

async function post(endpoint, fields) {
    const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ organization_id: PRO.organizationId, ...fields })
    });
    let data = {};
    try { data = await res.json(); } catch { /* 204 or not JSON */ }
    return { ok: res.ok, status: res.status, data };
}

const rightProduct = lk => !PRO.benefitId || !lk || !lk.benefit_id || String(lk.benefit_id) === String(PRO.benefitId);

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
    if (!/^[A-Za-z0-9-]{8,}$/.test(key)) return { ok: false, message: "That doesn't look like a licence key. It starts with GPAW and is on your Polar order confirmation." };
    try {
        const r = await post('activate', { key, label: `Golden Paw Animate AI plugin (${hostname()})`.slice(0, 100) });
        if (!r.ok) {
            const msg = String((r.data && (r.data.detail || r.data.error)) || '');
            if (r.status === 404) return { ok: false, message: "We couldn't find that licence key. Copy it exactly from your order confirmation." };
            if (/limit/i.test(msg)) return { ok: false, message: 'This key is already active on the maximum number of devices (3). Deactivate it on another device first, or contact support.' };
            if (r.status === 403) return { ok: false, message: "That licence key is no longer active. If you think that's wrong, contact us." };
            return { ok: false, message: 'The licence key could not be activated' + (msg ? `: ${msg}` : '.') };
        }
        const activationId = r.data.id;
        const v = await post('validate', { key, activation_id: activationId, benefit_id: PRO.benefitId || undefined });
        if (!v.ok || !rightProduct(v.data)) {
            try { await post('deactivate', { key, activation_id: activationId }); } catch { /* best effort */ }
            return { ok: false, message: v.status === 404 ? 'That key is for a different product.' : 'The licence key could not be checked. Please try again.' };
        }
        write({ key, instanceId: activationId, checkedAt: Date.now(), email: (v.data.customer && v.data.customer.email) || null });
        return { ok: true, message: 'Pro is unlocked on this computer. Thank you!' };
    } catch {
        return { ok: false, message: "Couldn't reach the licence server. Check your internet connection and try again." };
    }
}

export async function deactivate() {
    const s = read();
    if (s && s.key && s.instanceId) { try { await post('deactivate', { key: s.key, activation_id: s.instanceId }); } catch { /* offline */ } }
    write(null);
}

/** Re-validates weekly. A refunded or disabled key turns Pro off; being offline doesn't. */
export async function recheck() {
    const s = read();
    if (!s || !s.key) return;
    if ((Date.now() - (s.checkedAt || 0)) / 864e5 < RECHECK_DAYS) return;
    try {
        const r = await post('validate', { key: s.key, activation_id: s.instanceId || undefined, benefit_id: PRO.benefitId || undefined });
        if (r.ok && r.data && r.data.status === 'granted' && rightProduct(r.data)) { s.checkedAt = Date.now(); write(s); }
        else if (r.status === 404 || (r.ok && r.data && r.data.status && r.data.status !== 'granted')) write(null);
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
