// Serves a rich preview to link-preview crawlers (WhatsApp, X, Telegram, etc.)
// for checkout links (pay.tranxact.co/<path>, and old app.tranxact.co/pay/<slug>), while every real visitor gets the exact same
// app they'd get without this file existing at all.
//
// Deliberate design choice: rather than relying on any "continue normally"
// behavior, real (non-crawler) requests explicitly fetch and return the
// actual index.html — the same file vercel.json's rewrite already serves for
// every path today. This makes the two branches unambiguous: crawlers get a
// built preview, everyone else gets a byte-identical proxy of the real page.

// Runs on every page path that isn't a file or the /api routes. On pay.tranxact.co every path is a
// checkout (pay.tranxact.co/ada/logo-design). On app.tranxact.co, old /pay/<slug> links are sent
// to pay.tranxact.co. Anything else gets the normal app, exactly as before.
export const config = {
  matcher: '/((?!api/|assets/)[^.]+)',
};

const CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|LinkedInBot|TelegramBot|Discordbot|SkypeUriPreview|redditbot|Applebot|vkShare|W3C_Validator/i;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const host = (request.headers.get('host') || url.hostname).toLowerCase();
  const path = url.pathname.replace(/^\/+|\/+$/g, '');
  const serveApp = async () => {
    const indexRes = await fetch(new URL('/index.html', url));
    return new Response(indexRes.body, { status: indexRes.status, headers: indexRes.headers });
  };

  let linkPath = null;
  if (host.startsWith('pay.')) {
    linkPath = path.replace(/^pay\//, '');
  } else if (path.startsWith('pay/')) {
    if (host === 'app.tranxact.co') {
      return Response.redirect(`https://pay.tranxact.co/${path.slice(4)}${url.search}`, 308);
    }
    linkPath = path.slice(4);
  }

  // Real visitors (and any non-checkout page) get the real app shell, no interception.
  if (!linkPath || !CRAWLER_UA.test(userAgent)) return serveApp();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const rpc = (name, args) => fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }).then((r) => r.json());

  let slug = linkPath;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const resolved = await rpc('resolve_payment_path', { p_path: linkPath });
      if (typeof resolved === 'string' && resolved) slug = resolved;
    } catch { /* fall back to treating it as a slug */ }
  }

  let link = null;
  if (supabaseUrl && supabaseAnonKey && slug) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_payment_link`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_slug: slug }),
      });
      const data = await res.json();
      link = Array.isArray(data) && data[0] ? data[0] : null;
    } catch {
      link = null;
    }
  }

  const ogUrl = new URL('/api/og', url);
  let title = 'Tranxact Pay';
  let description = 'Pay securely with Tranxact.';

  if (link) {
    if (link.is_tip) {
      title = `Tip @${link.creator_username} on Tranxact`;
      description = 'Thank you, every tip means a lot.';
      ogUrl.searchParams.set('type', 'tip');
      ogUrl.searchParams.set('username', link.creator_username);
    } else {
      title = `Pay @${link.creator_username} — ${link.title}`;
      description = link.link_type === 'fixed'
        ? `\u20a6${Number(link.amount).toLocaleString('en-NG')} \u2014 ${link.title}`
        : link.title;
      ogUrl.searchParams.set('type', 'payment');
      ogUrl.searchParams.set('username', link.creator_username);
      if (link.link_type === 'fixed') ogUrl.searchParams.set('amount', String(link.amount));
      ogUrl.searchParams.set('description', link.title || '');
    }
  } else {
    ogUrl.searchParams.set('type', 'payment');
    ogUrl.searchParams.set('username', 'Tranxact');
  }

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${ogUrl.toString()}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(url.toString())}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${ogUrl.toString()}" />
</head><body></body></html>`;

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
