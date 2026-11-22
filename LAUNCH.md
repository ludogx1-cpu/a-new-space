# Launch checklist: Video to Spritesheet

The site is a static site in `public/`, with no server and no build step. Your visitors' videos never leave their browsers, so hosting costs almost nothing. Revenue comes from Google AdSense, plus an optional tip-jar link.

Work through these in order. Steps 1 to 4 take about an hour. AdSense review (step 6) usually takes a few days to a few weeks.

---

## 1. Create the Google account

Make a fresh Google account for the business (for example `assetcreator.app@gmail.com`). Use it for Firebase, Search Console, Analytics and AdSense, so everything is in one place and can be handed over later.

> AdSense requires you to be 18+, and it pays out to a bank account in your legal name. Use your real details in the payments profile.

## 2. Buy a domain (required for AdSense)

AdSense will **not** approve a free `*.web.app` / `*.firebaseapp.com` address. You need your own domain, about £8–£15/year (Cloudflare Registrar, Namecheap, Porkbun, Squarespace Domains...). Pick something descriptive, for example `spritesheetmaker.app` or `videotosprite.com`.

Then point the whole site at it:

```bash
./scripts/configure.sh https://yourdomain.com
```

This rewrites canonical URLs, the sitemap, robots.txt and Open Graph tags.

Also open `public/assets/site.js` and set `contactEmail` to a dedicated address. Most registrars offer free email forwarding.

## 3. Deploy to Firebase Hosting (free)

```bash
npm install -g firebase-tools
firebase login                  # sign in with the new Google account
firebase projects:create your-project-id
```

Put that project ID into `.firebaserc`, then:

```bash
firebase deploy --only hosting
```

In the Firebase console go to **Hosting → Add custom domain**, enter your domain, and add the DNS records it shows you at your registrar. HTTPS is issued automatically within about an hour.

> Alternative: GitHub Pages or Cloudflare Pages work too. Just publish the `public/` folder.

## 4. Google Search Console + Analytics

1. **Search Console** (search.google.com/search-console): add your domain, verify via DNS, then submit `https://yourdomain.com/sitemap.xml`.
2. **Google Analytics 4** (analytics.google.com): create a property and a Web data stream, and copy the `G-XXXXXXX` ID into `ga4` in `public/assets/site.js`. Downloads are tracked as `file_download` events, so you can see how many people actually use the tool.
3. Redeploy: `firebase deploy --only hosting`.

## 5. Get some real traffic first

AdSense reviewers reject empty or brand-new sites. Before applying, let it run for a week or two and share it where your users are:

- r/gamedev, r/IndieDev, r/aivideo, r/godot, r/phaser (post a before/after GIF, not just a link)
- itch.io: list it as a free tool
- Product Hunt, Hacker News "Show HN"
- AI-video communities (Runway, Kling, Pika, Sora users all need this exact workflow)
- Short YouTube or TikTok demos: "AI video → game sprite in 30 seconds"

Writing one or two more guides in `public/guides/` (and adding them to `sitemap.xml`) helps both SEO and approval.

## 6. Apply for AdSense

1. Go to adsense.google.com, sign in with the business account, and add your site.
2. Copy your publisher ID (`ca-pub-…`) and run:
   ```bash
   ./scripts/configure.sh https://yourdomain.com ca-pub-1234567890123456
   ```
   This fills in the verification meta tag on every page, `ads.txt`, and `site.js`.
3. Redeploy, then click **Verify** / **Request review** in AdSense.
4. **Turn on the consent message:** AdSense → **Privacy & messaging** → **European regulations** → create and publish a message. This is required for visitors from the EU/UK. The site already sets Google Consent Mode v2 defaults, and this message updates them.
5. Once approved, go to **Ads → By ad unit → Display ads** and create three responsive units. Paste their slot IDs into `adSlots` in `site.js` (`top`, `results`, `content`) and redeploy. Or leave the slots empty and switch on **Auto ads** instead.

Ad slots stay hidden until real IDs are filled in, so the site looks clean during review.

**Policy reminders:** never click your own ads, never ask people to click them, and don't move ads right next to the Process/Download buttons. Accidental clicks get accounts banned.

## 7. Optional extra income

- **Tip jar:** create a Ko-fi or Buy Me a Coffee page (or a Stripe Payment Link) and put the URL into `supportUrl` in `site.js`. A "☕ Support" button appears in the nav.
- **Pro version later:** batch processing, saved presets, auto background removal with an ML model, or Unity/Godot export presets. Sell licence keys through Lemon Squeezy or Gumroad.
- **Sponsorships:** once traffic grows, game-asset marketplaces and AI-video tools will pay for a "featured" slot.

---

### Realistic expectations

AdSense on a niche tool typically earns **£2–£10 per 1,000 page views** (more from US/UK desktop traffic). At 300 visits/day, that's roughly £20–£90 a month. Traffic is the whole game: the guides, community posts and short videos matter more than ad placement.

### Where things live

| What | File |
|---|---|
| Ad IDs, GA4, tip jar, contact email | `public/assets/site.js` |
| Video → sprite sheet converter | `public/index.html` |
| Sprite sheet editor & player | `public/editor.html` |
| Guides (SEO content) | `public/guides/*.html` |
| Privacy / Terms (required by AdSense) | `public/privacy.html`, `public/terms.html` |
| Domain + publisher ID find-and-replace | `scripts/configure.sh` |
| Hosting config | `firebase.json`, `.firebaserc` |
