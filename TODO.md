# Golden Paw: to-do

**You** = needs your accounts or your decision. **Claude** = I can do it in a session.
Live now: **https://goldenpaw.dog/studios/animation/** (the Animation Creation Tool, inside Golden Paw Studios).

## ✅ Done
- Tool built, browser-tested and live at goldenpaw.dog/studios/animation (converter, sprite editor, guides, how-to, offline app, Chrome/Edge extension).
- Golden Paw Studios card, menu and services page link to the tool.
- goldenpaw.dog homepage: readable text for Google/AdSense, Shiba standing by the kennel, visible golden paw.
- GitHub deploys set up (no console needed); previews on every pull request.
- Pro built and tested: AI background removal (no green screen), batch processing, saved presets, no ads, Windows desktop app (installer builds on GitHub).

## 1. Finish launching Pro (£11.99 one-off)
- [ ] **You:** merge ludogx1-cpu/a-new-space#4 (Pro, AI, batch, presets, desktop app; also redirects animate.goldenpaw.dog to the new address). **Claude** then copies the update into goldenpaw.dog.
- [ ] **You:** Lemon Squeezy: create the store and a product "Golden Paw Animation Pro": single payment **£11.99**, **Generate licence keys** on, activation limit **3**.
- [ ] **You:** send Claude the product's **Buy link** and **Product ID**. **Claude** switches on the buy button.
- [ ] **You:** download the Windows installer (GitHub → Actions → *Build desktop app* → Artifacts) and upload it as a file on the Lemon Squeezy product.
- [ ] **You (later):** code-signing certificate to remove Windows' "unknown publisher" warning, once sales justify it.

## 2. Ads and Google
- [ ] **You:** in about a week (after Google re-reads the new homepage), AdSense → goldenpaw.dog → tick "I have fixed the issues" → **Request review**.
- [ ] **You:** Search Console → URL Inspection → `https://goldenpaw.dog/` → **Request indexing** (speeds that up).
- [ ] **You:** AdSense → **Privacy & messaging → European regulations**: publish a consent message (required for UK/EU visitors once ads run).
- [ ] **You:** once approved, switch on **Auto ads**, or create 3 display ad units and send Claude the slot IDs.
- [ ] **You:** decide on Analytics for the tool (use the Golden Paw property `G-H0R68LWSK6`?). **Claude** adds it.

## 3. Stores
- [ ] **You:** Chrome Web Store: upload `dist/golden-paw-animate-extension.zip` (screenshots in `store-assets/`), privacy policy `https://goldenpaw.dog/studios/animation/privacy.html`, "does not collect user data".
- [ ] **You:** Edge Add-ons (free): same zip.
- [ ] **You (optional):** Google Play via PWABuilder ($25 one-off). Steps in `APPS.md`.

## 4. Show off the Shiba
- [ ] **You:** export each finished dog animation (sprite sheet + JSON, PNG) from the tool.
- [ ] **You or Claude:** add them to the showcase (`public/showcase/`), then publish.
- [ ] **You:** 2–3 short "video in → Shiba sprite out" clips for TikTok, Instagram and X.
- [ ] **Claude:** link to the tool from inside the Golden Paw app; optional paid "custom sprite animation" card on the Studios services page (you set the price).
- [ ] **You:** post in r/gamedev, r/IndieDev, r/aivideo and r/godot; list on itch.io; share on Golden Paw socials.

## 5. Golden Paw: next ideas
- [ ] **Add a new Dog Care page** to goldenpaw.dog, with helpful dog-care guides and tips.
- [ ] **Advertise some products to sell** on it: pick dog-care products to feature, link them through the Golden Paw Shop or as affiliate links, and add them to the page.

## Later improvements (Claude)
1. Very large sheets in the editor: warn above ~200 big frames (memory).
2. Test on iPhone/Safari specifically.
3. Firefox version of the extension.
4. More guides for Google traffic: "AI video to game sprite", "GIF with a transparent background", "Godot sprite sheet import".
