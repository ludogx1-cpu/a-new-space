# Launch checklist: Golden Paw Animation Creation Tool

The tool is a static site in `public/`, with no server and no build step. It lives at **`animate.goldenpaw.dog`**, a section of goldenpaw.dog that runs separately from the Golden Paw app, so nothing in the app's code has to change. Visitors' videos never leave their browsers, so hosting costs almost nothing.

The domain is already filled in. To use a different one, run:

```bash
./scripts/configure.sh https://other.goldenpaw.dog
```

---

## 1. Deploy to Firebase Hosting (free)

The tool deploys as a **second site inside your existing Golden Paw Firebase project** (`golden-paw-database`), so it's under the same Google account as the app. `firebase.json` and `.firebaserc` are already set up for this.

```bash
npm install -g firebase-tools
firebase login                                   # the Golden Paw Google account
firebase hosting:sites:create gp-animate --project golden-paw-database
```

Then:

```bash
firebase deploy --only hosting
```

## 2. Point `animate.goldenpaw.dog` at it

1. In the Firebase console go to **Hosting → Add custom domain** and enter `animate.goldenpaw.dog`.
2. Firebase shows you DNS records (usually a TXT record and an A record). Add them wherever goldenpaw.dog's DNS is managed. This only creates the subdomain; the main site and app are untouched.
3. HTTPS is issued automatically within about an hour.

**Link it from the app/site:** add a menu item or button on goldenpaw.dog, for example *"🐾 Animation Creation Tool"*, pointing to `https://animate.goldenpaw.dog/`. The tool already links back to goldenpaw.dog from its menu, footer, About page and showcase.

> Prefer `goldenpaw.dog/animate/` instead of a subdomain? Copy everything in `public/` into an `animate/` folder in the app's public/static directory. All links in the tool are root-relative (`/editor.html`, `/assets/...`), so you'd need to prefix them with `/animate`. Ask me and I'll do that conversion.

## 3. Add your Shiba animations to the showcase

When the dog animations are finished:

1. Export each one from the converter as a **sprite sheet + atlas JSON** (PNG is safest).
2. Put the files in `public/showcase/`, for example `shiba-run.png` and `shiba-run.json`.
3. List them in `public/showcase/showcase.json`:

   ```json
   [
     { "title": "Shiba run cycle", "caption": "From a 2-second clip", "image": "/showcase/shiba-run.png", "atlas": "/showcase/shiba-run.json" },
     { "title": "Happy tail wag",  "caption": "Green screen removed", "image": "/showcase/shiba-wag.png", "atlas": "/showcase/shiba-wag.json" }
   ]
   ```

4. Run `firebase deploy --only hosting` again.

The "Made with this tool: the Golden Paw Shiba" section then appears at the top of the converter, playing each animation. Each one has an *Open in Sprite Editor* link, so visitors can inspect the real output. While the list is empty, the section stays hidden.

Short screen recordings of these (video in → Shiba sprite out) are also your best marketing for both the tool and the game.

## 4. Search Console + Analytics

1. **Search Console:** if goldenpaw.dog is already verified as a *Domain* property, the subdomain is covered. Submit `https://animate.goldenpaw.dog/sitemap.xml`.
2. **Google Analytics 4:** add a Web data stream for `animate.goldenpaw.dog` (in the Golden Paw property, or a new one) and paste the `G-…` ID into `ga4` in `public/assets/site.js`. Exports are tracked as `file_download` and `editor_export` events.
3. In `site.js`, also set `contactEmail` to a real address (for example `hello@goldenpaw.dog`). It currently shows a placeholder.

## 5. Advertising

Golden Paw already has an approved AdSense account (`pub-2047805482197197`), and `https://goldenpaw.dog/ads.txt` already lists it. That covers `animate.goldenpaw.dog` too. The publisher ID is filled in, so ads appear once you either switch on **Auto ads** for goldenpaw.dog in AdSense, or create three display ad units and paste their slot IDs into `adSlots` in `public/assets/site.js`. The ad spaces stay hidden until then.

### Policy notes

- **Consent (EU/UK):** make sure **Privacy & messaging → European regulations** is switched on in AdSense. The tool already sends Google Consent Mode v2 defaults.
- **Add the site:** in AdSense under **Sites**, check that goldenpaw.dog is listed. Subdomains are covered by the root domain.
- **No incentivised clicks:** AdSense bans rewarding people for viewing or clicking ads. Keep AdSense ads away from anything that pays out Dogecoin or game rewards. The tool itself has no rewards, so it's a clean place for ads.
- **Alternatives or extras:** add a tip jar (Ko-fi or Stripe Payment Link) in `supportUrl` in `site.js`.

Never click your own ads, and keep ads away from the Process/Download buttons.

---

### Where things live

| What | File |
|---|---|
| Ad IDs, GA4, tip jar, contact email | `public/assets/site.js` |
| Video → sprite sheet converter | `public/index.html` |
| Sprite sheet editor & player | `public/editor.html` |
| Shiba showcase list | `public/showcase/showcase.json` |
| Brand colours (Golden Paw gold) | `public/assets/site.css` and the `:root` block in `index.html` |
| Guides (SEO content) | `public/guides/*.html` |
| Privacy / Terms | `public/privacy.html`, `public/terms.html` |
| Domain + publisher ID find-and-replace | `scripts/configure.sh` |
| Hosting config | `firebase.json`, `.firebaserc` |
| How-to page / Get-the-app page | `public/how-to-use.html`, `public/get-the-app.html` |
| Offline app (PWA) | `public/site.webmanifest`, `public/sw.js` |
| Browser extension | `extension-src/`, built by `scripts/build-extension.py` → `dist/` |
| Icons (redraw all sizes) | `scripts/make-icons.py` |

Publishing the app and extension to stores: see **[APPS.md](APPS.md)**.
