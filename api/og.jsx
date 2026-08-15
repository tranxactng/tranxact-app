import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

// Renders the Tranxact logo mark (stacked bars) as inline flex divs —
// Satori (what @vercel/og uses) can't render arbitrary SVG icon fonts,
// so this recreates the shape with plain boxes, same as the real logo.
function LogoMark() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ width: 64, height: 13, background: '#111', borderRadius: 7 }} />
      <div style={{ width: 96, height: 13, background: '#111', borderRadius: 7, marginLeft: -14 }} />
      <div style={{ width: 136, height: 13, background: '#111', borderRadius: 7, marginLeft: -28 }} />
      <div style={{ width: 108, height: 13, background: '#111', borderRadius: 7, marginLeft: 10 }} />
    </div>
  );
}

function Badge({ symbol, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 46, height: 46, borderRadius: 23, background: '#111',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 22, fontWeight: 700,
        }}
      >
        {symbol}
      </div>
      <span style={{ fontSize: 25, fontWeight: 600, color: '#222' }}>{label}</span>
    </div>
  );
}

function Background() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex' }}>
      <div style={{ position: 'absolute', top: -260, right: -160, width: 780, height: 780, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.06)', display: 'flex' }} />
      <div style={{ position: 'absolute', top: -180, right: -260, width: 620, height: 620, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.05)', display: 'flex' }} />
    </div>
  );
}

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') === 'payment' ? 'payment' : 'tip';
  const username = (searchParams.get('username') || 'user').slice(0, 30);
  const amount = searchParams.get('amount');
  const description = (searchParams.get('description') || '').slice(0, 60);

  const formattedAmount = amount
    ? `\u20a6${Number(amount).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630, display: 'flex',
          background: 'linear-gradient(135deg, #ffffff 0%, #eeeeee 100%)',
          position: 'relative', fontFamily: 'sans-serif',
        }}
      >
        <Background />
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0 90px' }}>
          <div style={{ display: 'flex', flexShrink: 0, marginRight: 64 }}>
            <LogoMark />
          </div>
          <div style={{ width: 1, height: 340, background: 'rgba(0,0,0,0.15)', marginRight: 64, display: 'flex' }} />

          {type === 'tip' ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 74, fontWeight: 800, lineHeight: 1 }}>
                <span style={{ color: '#111' }}>Tip</span>
                <span style={{ color: '#767676', marginLeft: 22 }}>@{username}</span>
              </div>
              <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.15)', margin: '32px 0', display: 'flex' }} />
              <div style={{ display: 'flex', fontSize: 29, color: '#666' }}>Thank you, every tip means a lot</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 56 }}>
                <Badge symbol="\u20a6" label="Naira" />
                <div style={{ width: 1, height: 30, background: 'rgba(0,0,0,0.15)', display: 'flex' }} />
                <Badge symbol="\u20bf" label="Crypto" />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 90 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 26, color: '#767676' }}>Payment to</span>
                  <span style={{ fontSize: 52, fontWeight: 800, color: '#111', marginTop: 6 }}>{username}</span>
                </div>
                <div style={{ width: 1, height: 100, background: 'rgba(0,0,0,0.15)', display: 'flex' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 26, color: '#767676' }}>Amount</span>
                  <span style={{ fontSize: 52, fontWeight: 800, color: '#111', marginTop: 6 }}>
                    {formattedAmount || 'Flexible'}
                  </span>
                </div>
              </div>
              <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.15)', margin: '32px 0', display: 'flex' }} />
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: '#444' }}>
                {description || 'Payment request'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 46 }}>
                <Badge symbol="\u20a6" label="Naira" />
                <div style={{ width: 1, height: 30, background: 'rgba(0,0,0,0.15)', display: 'flex' }} />
                <Badge symbol="\u20bf" label="Crypto" />
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
