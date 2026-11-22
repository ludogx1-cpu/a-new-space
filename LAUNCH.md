# Launch checklist: Golden Paw Animation Creation Tool

The tool is a static site in `public/`, with no server and no build step. It lives at **`animate.goldenpaw.dog`**, a section of goldenpaw.dog that runs separately from the Golden Paw app, so nothing in the app's code has to change. Visitors' videos never leave their browsers, so hosting costs almost nothing.

The domain is already filled in. To use a different one, run:

```bash
./scripts/configure.sh https://other.goldenpaw.dog
```

---

## 1. Deploy to Firebase Hosting (free)

Use the Google account you run Golden Paw with (or a new one for the business).

```bash
npm install -g firebase-tools
firebase login
firebase projects:create goldenpaw-animate     # any free ID
```

Put that project ID into `.firebaserc`, then:

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

## 5. Advertising: read this before applying

Golden Paw is an 18+ game with Dogecoin rewards, and that matters for Google AdSense:

- AdSense approves a **whole domain**. Applying for `animate.goldenpaw.dog` means Google reviews **goldenpaw.dog** too. A sign-in shell with crypto rewards and little readable text is at real risk of rejection ("low-value content", or a policy review of the crypto rewards).
- `ads.txt` must be served from the **root domain**, at `https://goldenpaw.dog/ads.txt`, not the subdomain. That means adding the file (included here at `public/ads.txt`) to the Golden Paw app's public folder.
- If the game rewards players for actions inside pages that show ads, that can count as incentivised traffic, which AdSense prohibits. Keep ads off the game itself.

**Options:**

1. **No ads on the tool (simplest):** treat it as free marketing for Golden Paw. Every visitor sees the Shiba showcase and the links to the game. Leave the AdSense ID as the placeholder and the ad slots stay hidden automatically.
2. **Tip jar / sponsors:** put a Ko-fi or Stripe Payment Link in `supportUrl` in `site.js`.
3. **AdSense anyway:** apply for goldenpaw.dog, add `ads.txt` at the root, then run
   ```bash
   ./scripts/configure.sh https://animate.goldenpaw.dog ca-pub-YOUR16DIGITS
   ```
   After approval, turn on **Privacy & messaging → European regulations** (required for EU/UK visitors), create three display ad units, and paste their slot IDs into `adSlots` in `site.js`.
4. **Separate domain for ads:** run the tool on its own domain (as originally planned) with "by Golden Paw" branding, so AdSense review doesn't depend on the game.

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
