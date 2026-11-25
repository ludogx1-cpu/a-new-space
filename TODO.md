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
- [ ] **You:** Polar: verify your identity (photo ID) so payouts can start, and wait for Polar's account review (up to 14 days).
- [x] **You:** merged ludogx1-cpu/a-new-space#4 (Pro source and desktop app; animate.goldenpaw.dog redirects to the new address).
- [ ] **You:** merge ludogx1-cpu/a-new-space#5 so the bare animate.goldenpaw.dog home page redirects too.
- [x] **You:** Polar (Lemon Squeezy closed to new stores): organisation, product "Golden Paw Animation Pro" £11.99, licence-key benefit (GPAW, 3 devices), checkout link.
- [x] **Claude:** switched the website, desktop app and AI plugin to Polar licence keys; Buy button live.
- [ ] **You:** download the Windows installer (GitHub → Actions → *Build desktop app* → Artifacts) and add it to the Pro product in Polar as a **File Downloads** benefit.
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
- [x] **Claude:** Dog Care page at goldenpaw.dog/dog-care/ with the Dog Care Planner and Starter Kit featured (ludogx1-cpu/gp-vault#12).
- [ ] **You:** merge ludogx1-cpu/gp-vault#12.
- [ ] **You (optional):** join Amazon Associates (or another affiliate scheme) and send Claude your links if you want recommended products (harnesses, beds, toys) on the Dog Care page.

## 6. From the site review (Nov 2026)
- [x] **Claude:** About and Studios pages now lead with the dog; GPAWS and optional DOGE explained once; older articles get a dated note; newsletter links to Studios services; Starter Kit business licence made clear (ludogx1-cpu/gp-vault#11).
- [ ] **You:** merge ludogx1-cpu/gp-vault#11, then re-run *Publish newsletter article* (`news-2026-11`) so the live article gets the new link.
- [ ] **You:** confirm the Starter Kit licence wording.
- [ ] **You:** for each shop product, send its file type, page count, editing software (Canva, Word, PDF…) and 1–2 preview images. **Claude** adds them to the shop cards.
- [ ] **Claude:** weekly Book Of Dog prompts with Goldie ("Show us your dog's sleepiest pose").
- [ ] **Claude:** silent 3–5 second Shiba preview clip near the Adopt button (made with the Animation tool).
- [x] **Claude:** sample website audit for a made-up groomer at /studios/services/sample-audit/ (ludogx1-cpu/gp-vault#12).
- [x] **Claude:** Dog Walk Bingo (£2) printable made; listed in the shop as Coming soon.
- [ ] **You:** create a Stripe Payment Link for Dog Walk Bingo (£2), with the PDF as the download, and paste the link into `web/studios/shop.js` (or send it to Claude).
- [ ] **You pick, Claude builds:** more downloads. Suggested first: Dog Walk Bingo (£2), Sitter Pack (£4), personalised Golden Paw trading card (£6), Dog Show at Home party kit. Others: puppy first-year milestone cards, dog birthday kit, lost-dog poster maker, memorial print, phone wallpapers, Adventure Passport, Biscuit Robbery game, colouring page, trick cards, lead sleeves, lead and treat shelf plans, Letters from the Dog cards, streamer graphics.

## 7. AI plugin (Claude / MCP)
- [x] **Claude:** built and tested the plugin (`mcp/`): video → sprite sheet / JSON / GIF / frames, slice sheets, free green-screen removal, Pro AI background removal, Pro licence activation. Installs in Claude Code from this repo. Install page: /studios/animation/ai-plugin.html.
- [ ] **You:** merge the AI plugin pull request. Claude then copies the new install page to goldenpaw.dog.
- [ ] **You:** create a free npmjs.com account, make an access token (Access Tokens → Generate New Token → Granular, read and write), and add it to this repo as the secret `NPM_TOKEN` (Settings → Secrets and variables → Actions). Then Actions → *AI plugin (MCP)* → Run workflow, tick **publish**. This makes the Claude Desktop instructions (`npx golden-paw-animate-mcp`) work.
- [x] **Claude:** the AI plugin uses the same Polar licence check as the website.
- [ ] **You (later):** submit to Anthropic's plugin/connector directory and other MCP directories once it has a few users. Claude can prepare the listing text.
- [ ] **You:** decide the licence. The plugin currently says "free to use, all rights reserved" (`mcp/LICENSE`); say if you'd prefer open source (e.g. MIT).

## Later improvements (Claude)
1. Very large sheets in the editor: warn above ~200 big frames (memory).
2. Test on iPhone/Safari specifically.
3. Firefox version of the extension.
4. ~~More guides~~ Done: AI video to game sprite, transparent GIF, Godot 4 import.
