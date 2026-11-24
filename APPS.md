# App & extension: build and publish

There is one codebase (`public/`) and three ways to ship it:

| | What it is | Cost | Effort |
|---|---|---|---|
| **Installable web app (PWA)** | Install from the website on Android, iPhone, Windows, Mac, ChromeOS. Works offline. | Free | ✅ Done, live as soon as the site is deployed |
| **Chrome / Edge extension** | 🐾 toolbar button that opens the tool, fully offline, no ads | Chrome: $5 one-off · Edge: free | ~30 min to submit |
| **Store apps** (Play Store, Microsoft Store, App Store) | The PWA wrapped as a store app | Play: $25 one-off · Microsoft: free · Apple: $99/year | 1–2 hours each |

---

## 1. Installable web app (PWA): nothing to do

Deploying the site is enough. `public/site.webmanifest` + `public/sw.js` make it installable and offline-capable. Visitors see an install prompt, or follow `/get-the-app.html`.

- **Offline:** the converter, editor, how-to page and libraries are cached on first visit.
- **Updates:** new files reach users on their next visit automatically. Bump `VERSION` in `sw.js` only if you rename or remove files.
- **"Open with":** on desktop Chrome/Edge, the installed app can open `.png`, `.webp` and `.json` files straight into the Sprite Editor.

## 2. Browser extension (Chrome & Edge)

Build it from the website files (Python 3 only, no other installs):

```bash
python3 scripts/build-extension.py
```

This creates `dist/extension/` (folder) and `dist/golden-paw-animate-extension.zip`. A prebuilt zip is committed in the repo too.

**Try it yourself first:**
1. Unzip `dist/golden-paw-animate-extension.zip`.
2. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and pick the unzipped folder.
4. Click the 🐾 icon in the toolbar.

**Publish:**
- **Chrome Web Store:** https://chrome.google.com/webstore/devconsole. Pay the $5 one-off fee, upload the zip, add screenshots (1280×800), use `https://animate.goldenpaw.dog/privacy.html` as the privacy policy, and declare **"does not collect user data"**. The extension requests no permissions, so review is usually quick.
- **Edge Add-ons:** https://partner.microsoft.com/dashboard/microsoftedge. Free, same zip.

Before each release, raise the number in the `VERSION` file and rebuild. The stores require a higher version every time.

The extension version has **no ads and no analytics**: extension pages can't load remote scripts, and ads in extensions break store policy. It links to the website for guides, so it still sends traffic there.

## 3. Store apps via PWABuilder (free tool from Microsoft)

Go to https://www.pwabuilder.com, enter `https://animate.goldenpaw.dog`, and it generates store packages from the live PWA.

### Google Play (Android)
1. In PWABuilder choose **Android → Generate**. Keep the signing key it gives you **safe**; you need it for every update.
2. The download includes `assetlinks.json`. Put it at `public/.well-known/assetlinks.json` and redeploy. This removes the browser address bar from the app.
3. Create a Play Console account ($25 one-off) at https://play.google.com/console, then upload the `.aab`.
4. Content rating: the tool itself is suitable for everyone. It is separate from the 18+ Golden Paw game, so keep the store listing about the tool.

### Microsoft Store (Windows)
PWABuilder → **Windows** package → upload at https://partner.microsoft.com (individual accounts are free).

### Apple App Store (iPhone/iPad)
PWABuilder → **iOS** produces an Xcode project. You need a Mac, Xcode and the Apple Developer Program ($99/year). Apple sometimes rejects apps that are "just a website" (guideline 4.2), so add-to-home-screen from Safari (already supported) is the practical iOS route for now.

## 4. Pro desktop app (Windows)

The `desktop/` folder wraps the same tool in Electron. It runs from a private `app://` address with cross-origin isolation switched on, so the AI uses several processor cores. In testing that made it about 2.4× faster than the browser on a 4-core machine. It shows no ads; Pro is still unlocked with the licence key.

**Build the installer (no console needed):**
1. GitHub → **Actions** → **Build desktop app** → **Run workflow**.
2. When it finishes (about 10 minutes), open the run and download **Golden-Paw-Animation-Windows** under *Artifacts*. Inside is `Golden-Paw-Animation-Setup-1.0.0.exe`.
3. In Lemon Squeezy, open the Pro product → **Files** → upload the `.exe`. Buyers then get a download link in their purchase email, next to their licence key.

To release an update, raise `"version"` in `desktop/package.json` and run the workflow again.

**Windows "unknown publisher" warning:** the installer isn't code-signed yet, so Windows SmartScreen shows a warning on first run (users click *More info → Run anyway*). A code-signing certificate (about £100–300/year, or Azure Trusted Signing) removes it. That's worth it once sales justify it.
