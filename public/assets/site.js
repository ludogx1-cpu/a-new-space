/*
 * Site-wide config + monetisation loader.
 *
 * EDIT THE CONFIG BLOCK BELOW (or run scripts/configure.sh, which fills the
 * domain and AdSense publisher ID for you). Everything stays switched off
 * until you paste real IDs in, so the site looks clean while AdSense reviews it.
 */
window.SITE_CONFIG = {
    // Google AdSense publisher ID, e.g. "ca-pub-1234567890123456".
    // Leave as the placeholder until AdSense gives you one.
    adsenseClient: 'ca-pub-XXXXXXXXXXXXXXXX',

    // Ad unit slot IDs from AdSense > Ads > By ad unit > Display ads.
    // Any slot left empty is hidden. If you prefer Google "Auto ads",
    // leave these empty and turn Auto ads on inside AdSense instead.
    adSlots: {
        top: '',      // under the "How to use" box
        results: '',  // under the Results panel
        content: ''   // inside the guides / FAQ content
    },

    // Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ9". Empty = off.
    ga4: '',

    // Optional tip jar (Ko-fi, Buy Me a Coffee, Stripe Payment Link...). Empty = hidden.
    supportUrl: '',

    // Shown on the Contact page. Use a dedicated address, not your personal one.
    contactEmail: 'hello@example.com'
};

(function () {
    var cfg = window.SITE_CONFIG;
    var hasAds = /^ca-pub-\d{16}$/.test(cfg.adsenseClient || '');

    // Theme: share the tool's saved preference across every page.
    try {
        var t = localStorage.getItem('acv7-theme');
        if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) { /* storage blocked: default theme */ }

    // ---- Google Consent Mode v2 -------------------------------------------
    // Denied by default in the EEA, UK and Switzerland until the visitor answers
    // the consent message. Turn on AdSense > Privacy & messaging > "European
    // regulations" message: it is a Google-certified CMP and updates these flags.
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LI','LT','LU','MT','NL','NO','PL','PT','RO','SK','SI','ES','SE','GB','CH'];
    gtag('consent', 'default', {
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        analytics_storage: 'denied', wait_for_update: 500, region: EEA
    });
    gtag('consent', 'default', {
        ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted',
        analytics_storage: 'granted'
    });

    function addScript(src, attrs) {
        var s = document.createElement('script');
        s.async = true; s.src = src;
        if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
        document.head.appendChild(s);
    }

    // ---- Google Analytics 4 -------------------------------------------------
    if (cfg.ga4) {
        addScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga4));
        gtag('js', new Date());
        gtag('config', cfg.ga4);
    }

    // ---- Google AdSense -----------------------------------------------------
    if (hasAds) {
        addScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
            encodeURIComponent(cfg.adsenseClient), { crossorigin: 'anonymous' });
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Ad slots: <div class="ad-slot" data-ad="top"></div>
        document.querySelectorAll('.ad-slot').forEach(function (box) {
            var slot = cfg.adSlots[box.getAttribute('data-ad')];
            if (!hasAds || !slot) { box.remove(); return; }
            var ins = document.createElement('ins');
            ins.className = 'adsbygoogle';
            ins.style.display = 'block';
            ins.setAttribute('data-ad-client', cfg.adsenseClient);
            ins.setAttribute('data-ad-slot', slot);
            ins.setAttribute('data-ad-format', 'auto');
            ins.setAttribute('data-full-width-responsive', 'true');
            box.appendChild(ins);
            try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* blocked */ }
        });

        // Tip-jar links
        document.querySelectorAll('[data-support]').forEach(function (el) {
            if (cfg.supportUrl) { el.href = cfg.supportUrl; el.hidden = false; }
            else el.remove();
        });

        // Contact email
        document.querySelectorAll('[data-contact]').forEach(function (el) {
            el.href = 'mailto:' + cfg.contactEmail;
            el.textContent = cfg.contactEmail;
        });

        // Footer year
        document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

        // Theme toggle on content pages (the tool page has its own).
        var tt = document.getElementById('siteThemeToggle');
        if (tt) {
            var sync = function () { tt.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; };
            sync();
            tt.addEventListener('click', function () {
                var dark = document.documentElement.getAttribute('data-theme') === 'dark';
                if (dark) document.documentElement.removeAttribute('data-theme');
                else document.documentElement.setAttribute('data-theme', 'dark');
                try { localStorage.setItem('acv7-theme', dark ? 'light' : 'dark'); } catch (e) {}
                sync();
            });
        }

        // Track successful exports as GA4 events (if analytics is on).
        if (cfg.ga4) {
            document.addEventListener('click', function (e) {
                var a = e.target.closest && e.target.closest('a.download-btn');
                if (a) gtag('event', 'file_download', { file_name: a.getAttribute('download') || '', kind: a.getAttribute('data-kind') || '' });
            });
        }
    });
})();
