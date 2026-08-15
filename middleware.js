// Serves a rich preview to link-preview crawlers (WhatsApp, X, Telegram, etc.)
// for /pay/:slug checkout links, while every real visitor gets the exact same
// app they'd get without this file existing at all.
//
// Deliberate design choice: rather than relying on any "continue normally"
// behavior, real (non-crawler) requests explicitly fetch and return the
// actual index.html — the same file vercel.json's rewrite already serves for
// every path today. This makes the two branches unambiguous: crawlers get a
// built preview, everyone else gets a byte-identical proxy of the real page.

export const config = {
  matcher: '/pay/:slug',
};

const CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|LinkedInBot|TelegramBot|Discordbot|SkypeUriPreview|redditbot|Applebot|vkShare|W3C_Validator/i;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  if (!CRAWLER_UA.test(userAgent)) {
    // Real visitor — explicitly serve the real app shell, no interception.
    const indexRes = await fetch(new URL('/index.html', url));
    return new Response(indexRes.body, { status: indexRes.status, headers: indexRes.headers });
  }

  const slug = url.pathname.replace('/pay/', '').replace(/\/$/, '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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
