# Golden Paw Animation Creation Tool: launch to-do

Tick items off as you go. **You** = needs your accounts or your decision. **Claude** = I can do it in a session.

## 1. Unblock and approve
- [x] **You:** turn off the *cortex* plugin in claude.ai plugin settings, so Claude can test in a real browser.
- [x] **Claude:** full browser test (all passing; re-run with `node tests/e2e.js`): every page on desktop and phone, process a video, green-screen removal, trim, GIF, ZIP, Rebuild + JSON, Open in Sprite Editor, editor edits/undo/export, keyboard selection, offline mode, and the extension loaded in Chromium.
- [x] **Claude:** opened the two pull requests:
  - ludogx1-cpu/a-new-space#2: the tool, **merged**
  - ludogx1-cpu/gp-vault#7: Studios card, open until the tool is live

## 2. Go live (about 10 minutes, all in a web browser; steps in LAUNCH.md §1–2)
- [x] **Claude:** GitHub deploy workflow (checks, creates the Firebase site, deploys; previews on PRs).
- [ ] **You:** Google Cloud console → service account → Keys → create a JSON key.
- [ ] **You:** GitHub → a-new-space → Settings → Secrets → Actions → `FIREBASE_SERVICE_ACCOUNT` = the key's contents.
- [ ] **You:** GitHub → Actions → *Deploy Animation Tool* → **Run workflow**. Check https://gp-animate.web.app.
- [ ] **You:** Firebase console → Hosting → gp-animate → **Add custom domain** `animate.goldenpaw.dog`, then add the DNS records (DNS only if on Cloudflare).
- [ ] **You or Claude:** once https://animate.goldenpaw.dog loads, merge ludogx1-cpu/gp-vault#7 (the Studios card). goldenpaw.dog then redeploys by itself.

## 3. Ads, consent and analytics
- [ ] **You:** AdSense → **Privacy & messaging → European regulations**: make sure a consent message is published for goldenpaw.dog. **Required before ads run for UK/EU visitors.** The tool has no cookie banner of its own; this message is its consent banner.
- [ ] **You:** AdSense → **Sites**: confirm goldenpaw.dog is listed and ready.
- [ ] **You:** pick one: switch on **Auto ads**, or create 3 display ad units and send Claude the slot IDs (they go in `public/assets/site.js`).
- [ ] **You:** decide whether to track the tool in the Golden Paw Analytics property (`G-H0R68LWSK6`) or a new one, then add a web stream for `animate.goldenpaw.dog`. **Claude** puts the ID in `site.js`.
- [ ] **You:** Search Console → submit `https://animate.goldenpaw.dog/sitemap.xml`.

## 4. App stores and extension
- [x] **Claude:** store screenshots at 1280×800 are in `store-assets/` (featuring the Golden Paw Shiba).
- [ ] **You:** Chrome Web Store: you already have a developer account. Upload `dist/golden-paw-animate-extension.zip` as a new item, privacy policy `https://animate.goldenpaw.dog/privacy.html`, data use: *does not collect user data*.
- [ ] **You:** Edge Add-ons (free): same zip.
- [ ] **You** (optional): Google Play via PWABuilder ($25 one-off). Steps in `APPS.md`.

## 5. Show off the Shiba
- [ ] **You:** export each finished dog animation (sprite sheet + JSON, PNG) from the tool.
- [ ] **You or Claude:** add them to `public/showcase/` and list them in `public/showcase/showcase.json`, then redeploy.
- [ ] **You:** record 2–3 short "video in → Shiba sprite out" clips for TikTok, Instagram and X.
- [ ] **Claude:** add a link to the tool inside the Golden Paw app (Flutter), and optionally a paid "custom sprite animation" card on the Studios services page (you set the price).
- [ ] **You:** post in r/gamedev, r/IndieDev, r/aivideo and r/godot, list it on itch.io as a free tool, and share it on the Golden Paw socials.

---

## Review: what was improved, and what's left

### Fixed in this review
- **Rebuild bug:** Rebuild now writes a new JSON that matches the rebuilt sheet (size, columns, trim offsets). It also stopped packing the preview-only ping-pong frames into the sheet.
- **Fonts:** now self-hosted, so no requests go to Google Fonts (better for privacy rules), they work offline and in the extension, and pages load a little faster.
- **Updates reach people straight away:** scripts and pages now recheck with the server on every load, instead of being cached for a day.
- **Keyboard access in the editor:** frames can be focused with Tab and selected with Enter or Space.
- **One-command check:** `python3 scripts/check.py` checks links, scripts, the offline cache list and the library hashes, and builds the extension. Run it before every deploy.

### Still to improve (most important first)
1. **Done: real-browser tests.** `tests/e2e.js` covers the full flow. Found and fixed in testing: the first captured frame was always blank, and the Phaser guide scrolled sideways on phones.
2. **Consent:** the tool relies on Google's AdSense consent message for UK/EU visitors (section 3). If you'd rather match the main site's Cloudflare Zaraz banner, Claude can port Golden Paw's `consent.js` gate.
3. **Very large sheets in the editor:** frames are held in memory as full-size images. A 200-frame 1024px sheet uses about 800 MB. Add a warning, or work from the sheet directly.
4. **iPhone / Safari:** video decoding and WebP export behave differently on iOS. Test there specifically.
5. **Store listing assets:** screenshots, a short promo tile (440×280) and a description for the Chrome Web Store.
6. **Firefox extension:** needs a small manifest variant.
7. **More guides:** each new guide is another way in from Google. Ideas: "AI video to game sprite", "make a GIF with a transparent background", "Godot sprite sheet import".
