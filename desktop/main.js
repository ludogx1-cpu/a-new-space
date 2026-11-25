// Golden Paw Animation: desktop edition (Pro).
// Serves the same tool files as the website from a private app:// address with
// cross-origin isolation switched on, so the AI can use several processor cores.
const { app, BrowserWindow, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

const SITE = app.isPackaged ? path.join(process.resourcesPath, 'site') : path.join(__dirname, '..', 'public');
const START = 'app://tool/index.html';
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
    '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};
const ISOLATION = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin'
};

async function serve(request) {
    const url = new URL(request.url);
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(SITE, p));
    if (!file.startsWith(SITE + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
        const data = await fs.promises.readFile(file);
        return new Response(data, { headers: { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', ...ISOLATION } });
    } catch (e) {
        const notFound = await fs.promises.readFile(path.join(SITE, '404.html')).catch(() => 'Not found');
        return new Response(notFound, { status: 404, headers: { 'Content-Type': TYPES['.html'], ...ISOLATION } });
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280, height: 900, minWidth: 420, minHeight: 500,
        title: 'Golden Paw Animation',
        backgroundColor: '#0b0f19',
        icon: path.join(__dirname, 'build', 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
    });
    // Links to websites (Golden Paw, Polar checkout, guides online) open in the normal browser.
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('app://')) return { action: 'allow' };
        if (/^https?:\/\//.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
        if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
    });
    win.loadURL(START);
    return win;
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const [w] = BrowserWindow.getAllWindows();
        if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
    });
    app.whenReady().then(() => {
        protocol.handle('app', serve);
        createWindow();
        app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
    });
    app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
