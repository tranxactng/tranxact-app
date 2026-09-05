import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Bell, ArrowDownToLine, ArrowUpFromLine, Link2, Smartphone, Wifi, Zap, Tv,
  Trophy, Home, LineChart, Bitcoin, CreditCard, User, ChevronLeft, ChevronRight, Copy, Share2,
  Check, X, QrCode, Plus, Lock, Mail, ArrowLeft, LogOut, ShieldCheck, Settings, Wallet, ArrowRight,
  UserCircle, Users, Landmark, Loader2, Sparkles, BarChart3, Image as ImageIcon, FileText, ShoppingBag, Calendar, Search
} from 'lucide-react';
import {
  supabase, signUp, signIn, requestPasswordReset, signOut,
  getProfile, getWallet, getCryptoAssets, getDepositAddress, getRecentTransactions, sendToUser, buyAirtime, getServiceVariations, buyData, verifyMeter, buyElectricity, buyTV,
  adminLookupUser, adminRecentSettlements, adminSettle, adminListPaymentNotices, adminGetOverviewStats,
  adminListPendingWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal, adminListSalesLeads, adminUpdateLeadStatus,
  adminGetCurrentRates, adminUpdateBaseRate, adminUpdateSpread, adminRevealPrivateKey, adminSweepEvm, adminCheckTronBalance, adminSweepTron, adminCheckBtcBalance, adminCheckSolBalance,
  getReferralEarnings, getReferralLeaderboard, withdrawReferralEarnings,
  changeUsername, updatePassword, setTransactionPin, verifyTransactionPin, updateSpendingLimit, updatePushPreference,
  updateFullName,
  subscribeToPush, unsubscribeFromPush,
  createPaymentLink, createStorefrontEvent, getMyPaymentLinks, getPublicPaymentLink, getMyTranxactPayments, notifyPaymentSent,
  updateStorefrontItem, setStorefrontItemStatus, deleteStorefrontItem, duplicateStorefrontItem, createCartCheckout, getMyStorefrontOrders, getMyStorefrontCustomers, trackStorefrontEvent, getStorefrontAnalytics, updateStorefrontOrderStatus, getStorefrontOrderByToken, setStorefrontPaused, setItemFulfillment, sendWelcomeEmail,
  isBusinessSlugAvailable, createBusiness, getMyBusiness, updateBusiness, getMyBusinessProducts, getBusinessStorefront, uploadBusinessAsset,
  requestWithdrawal, getMyWithdrawals, submitSalesLead, getDashboardAnalytics, notifyCopyEvent,
  listPaystackBanks, resolveBankAccount,
  getMyNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead
} from './lib/supabase.js';

// ---------- Demo data ----------
const ASSETS = [
  { symbol: 'USDT', name: 'Tether', network: 'TRC20', address: 'TXk9Qm2vD8yZp4Rj7Ln3fQ2xVh5tYc9Bwe', price: 1550.2, change: 0.02 },
  { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', address: '0x71C7656EC7ab88b098defB751B7401B4B2a1234', price: 1550.2, change: 0.01 },
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p8x9z2mk4', price: 150775000, change: 2.4 },
  { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', address: '0x71C7656EC7ab88b098defB751B7401B4B2a1234', price: 5394000, change: -1.2 },
  { symbol: 'BNB', name: 'BNB', network: 'BEP20', address: '0x71C7656EC7ab88b098defB751B7401B4B2a1234', price: 961000, change: 1.1 },
  { symbol: 'SOL', name: 'Solana', network: 'Solana', address: '7xKXtg2CW3ed1qUFysrDDpQ3merWaK4Q3zJvyPq3m', price: 332475, change: 5.1 },
  { symbol: 'TRX', name: 'TRON', network: 'TRC20', address: 'TXk9Qm2vD8yZp4Rj7Ln3fQ2xVh5tYc9Bwe', price: 434, change: 0.5 },
];

const BILLS = [
  { id: 'airtime', label: 'Airtime', icon: Smartphone, ready: true },
  { id: 'data', label: 'Data', icon: Wifi, ready: true },
  { id: 'electricity', label: 'Electricity', icon: Zap, ready: true },
  { id: 'tv', label: 'TV', icon: Tv, ready: true },
  { id: 'betting', label: 'Betting', icon: Trophy, ready: false },
];

// Maps a real transactions-table row to what TransactionRow expects to render
// Postgres returns timestamps like "2026-08-16 10:07:23.109573+00" — two
// separate problems for JS's Date parser: a space instead of "T", and a bare
// 2-digit timezone offset ("+00") with no minutes, which fails ISO 8601
// parsing even in Node/V8, not just Safari. Every place a raw created_at
// string gets parsed needs this, not just transaction rows.
function normalizeTimestamp(raw) {
  if (typeof raw !== 'string') return raw;
  return raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
}

function mapTransaction(row) {
  const byType = {
    crypto_deposit: { title: `${row.crypto_asset || 'Crypto'} received`, icon: ArrowDownToLine },
    send_user: row.direction === 'received'
      ? { title: `Received from ${row.counterparty ? '@' + row.counterparty : 'user'}`, icon: ArrowDownToLine }
      : { title: `Sent to ${row.counterparty ? '@' + row.counterparty : 'user'}`, icon: ArrowUpFromLine },
    send_bank: { title: 'Bank transfer', icon: ArrowUpFromLine },
    bill_payment: { title: row.description || 'Bill payment', icon: Smartphone },
    fund_bank: { title: 'Wallet funded', icon: ArrowDownToLine },
    referral: { title: 'Referral earning', icon: Users },
    tranxactpay: { title: row.description || 'Payment link', icon: Link2 },
  };
  const meta = byType[row.type] || { title: row.type, icon: Wallet };
  const pending = row.status === 'pending';
  const createdDate = new Date(normalizeTimestamp(row.created_at));
  const validDate = !isNaN(createdDate.getTime());
  // Two transactions on the same day both showing "17 Aug" are indistinguishable
  // in the list — show the actual time for anything from today, and fall back
  // to a date for older entries, so the list itself carries real ordering info.
  const isToday = validDate && createdDate.toDateString() === new Date().toDateString();
  const listTime = validDate
    ? (isToday
        ? createdDate.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })
        : `${createdDate.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}, ${createdDate.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`)
    : '';
  // Description is only shown to the user when it's genuinely user-facing content
  // (a TranxactPay note, a bill payment label, an admin's settlement note on a
  // deposit). For peer transfers it's always redundant system boilerplate, and
  // for anything flagged is_correction it may be an internal/admin-only note —
  // never surface either of those as if the user wrote them.
  const showDescription = !row.is_correction && !['send_user', 'send_bank', 'referral'].includes(row.type);
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: meta.title,
    sub: pending ? 'Pending settlement' : (row.counterparty ? `@${row.counterparty}` : row.description || ''),
    counterparty: row.counterparty,
    description: showDescription ? row.description : null,
    cryptoAsset: row.crypto_asset,
    amount: row.amount_ngn != null ? Number(row.amount_ngn) : 0,
    time: listTime,
    fullTime: validDate ? createdDate.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '',
    dateKey: validDate ? createdDate.toDateString() : '',
    icon: meta.icon,
  };
}

const NAV = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'earn', label: 'Earn', icon: Sparkles },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'cards', label: 'Cards', icon: CreditCard },
  { key: 'profile', label: 'Profile', icon: User },
];


// Mirrors fee_settings in the database, for preview purposes only — the actual
// fee applied always comes from the server, this is just so the admin sees an
// accurate preview before submitting.
const CRYPTO_FUNDING_FEE_PCT = 0.7;
const NAIRA_FUNDING_FEE_FLAT = 100;

const fmtNaira = (n) =>
  `₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Deterministic color per username so the same person always gets the same
// avatar color across the app, without storing anything extra.
const AVATAR_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6', '#F97316'];
function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name = '') {
  return (name || '?').slice(0, 2).toUpperCase();
}
function UserAvatar({ username, size = 36 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: avatarColor(username), fontSize: size * 0.38 }}
    >
      {initials(username)}
    </div>
  );
}

// ---------- Small shared UI ----------
// High error-correction QR (ecc=H, ~30% recoverable) with the Tranxact logo
// layered on top via CSS — not baked into the QR image itself. Keeps the logo
// small (~18% of the code's width) and centered, which is the safest spot:
// scanners rely most on the corner finder patterns, so covering the middle
// stays well inside what H-level correction can reconstruct.
function BrandedQR({ data, size = 200 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&ecc=H`;
  const logoSize = Math.round(size * 0.18);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <img src={qrUrl} alt="QR code" style={{ width: size, height: size, borderRadius: 12 }} />
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: logoSize, height: logoSize, background: '#fff', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 3,
          boxShadow: '0 0 0 4px #fff',
        }}
      >
        <img src="/icon-192.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }} />
      </div>
    </div>
  );
}

// Real crypto icons from a well-established, actively-maintained public icon
// set (spothq/cryptocurrency-icons, served via jsDelivr). Falls back to the
// old letter badge if a specific icon fails to load — never shows a broken image.
function CoinIcon({ symbol, size = 36 }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xs" style={{ width: size, height: size }}>
        {symbol.slice(0, 1)}
      </div>
    );
  }
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${symbol.toLowerCase()}.svg`}
      alt={symbol}
      onError={() => setFailed(true)}
      className="rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

// A success bottom sheet that slides up over whatever the user was looking
// at, so the summary behind it stays visible and the result feels like it
// happened *to* that screen rather than replacing it.
function SuccessSheet({ open, title = 'Success!', subtitle, amount, detail, onDone, secondaryLabel, onSecondary }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    // One frame before animating in, so the transition actually runs rather
    // than the sheet just appearing already-open.
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${shown ? 'opacity-60' : 'opacity-0'}`}
        onClick={onDone}
      />
      <div
        className={`relative w-full max-w-md bg-neutral-950 border-t border-neutral-800 rounded-t-3xl px-6 pt-8 pb-8 transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-5">
            <Check className="w-8 h-8 text-black" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold mb-1.5">{title}</h2>
          {subtitle && <p className="text-sm text-neutral-500 mb-5">{subtitle}</p>}

          {amount && (
            <div className="font-mono text-3xl font-bold mb-1">{amount}</div>
          )}
          {detail && <div className="text-sm text-neutral-500 mb-6">{detail}</div>}

          <div className="w-full space-y-3 mt-2">
            <button
              onClick={onDone}
              className="w-full bg-white text-black rounded-2xl py-3.5 text-sm font-semibold active:scale-[0.98] transition"
            >
              Done
            </button>
            {secondaryLabel && onSecondary && (
              <button
                onClick={onSecondary}
                className="w-full text-sm text-neutral-400 py-2 hover:text-white transition"
              >
                {secondaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// People search by the name they actually use, not the registered one.
// "gtb" should find Guaranty Trust, "first bank" should find FBN.
const BANK_ALIASES = {
  'guaranty trust': ['gtb', 'gt bank', 'gtbank'],
  'first bank': ['fbn'],
  'united bank for africa': ['uba'],
  'zenith': ['zenith'],
  'access': ['access'],
  'fidelity': ['fidelity'],
  'stanbic': ['stanbic ibtc', 'ibtc'],
  'ecobank': ['eco'],
  'sterling': ['sterling'],
  'union bank': ['union'],
  'wema': ['alat', 'wema'],
  'polaris': ['polaris'],
  'keystone': ['keystone'],
  'providus': ['providus'],
  'kuda': ['kuda'],
  'moniepoint': ['monie', 'moniepoint'],
  'opay': ['opay'],
  'palmpay': ['palmpay', 'palm pay'],
};

function bankMatches(bankName, query) {
  const n = bankName.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (n.includes(q)) return true;
  // Check whether the query is a known nickname for this bank.
  for (const [official, aliases] of Object.entries(BANK_ALIASES)) {
    if (n.includes(official) && aliases.some(a => a.includes(q) || q.includes(a))) return true;
  }
  return false;
}

// Nigeria has 200+ banks and microfinance institutions. Scrolling a native
// select to find one is painful, so this lets you type to filter and pick.
function BankPicker({ banks, banksError, bankCode, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = (banks || []).find(b => b.code === bankCode);

  const filtered = (banks || []).filter(b => bankMatches(b.name, query));

  if (banks === null) {
    return (
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5">
        <Landmark className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <span className="text-sm text-neutral-500">Loading banks…</span>
      </div>
    );
  }
  if (banks.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5">
        <Landmark className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <span className="text-sm text-red-400">{banksError || 'Could not load banks'}</span>
      </div>
    );
  }

  // Collapsed: show the chosen bank, tap to change.
  if (selected && !open) {
    return (
      <button
        onClick={() => { setOpen(true); setQuery(''); }}
        className="w-full flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5 text-left"
      >
        <Landmark className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <span className="text-sm text-white flex-1 truncate">{selected.name}</span>
        <span className="text-xs text-neutral-500 flex-shrink-0">Change</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3.5">
        <Search className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        <input
          autoFocus={open}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search your bank"
          className="bg-transparent outline-none text-white text-sm w-full placeholder-neutral-600"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-neutral-500 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 max-h-64 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-600">No bank matches "{query}".</div>
          ) : (
            filtered.map(b => (
              <button
                key={b.code}
                onClick={() => { onSelect(b.code); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-neutral-900 last:border-b-0 hover:bg-neutral-900 transition ${b.code === bankCode ? 'text-violet-400' : 'text-neutral-300'}`}
              >
                {b.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PrimaryButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full bg-white text-black font-semibold rounded-2xl py-3.5 flex items-center justify-center gap-2 transition active:scale-[0.98] hover:bg-neutral-200 disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full bg-neutral-900 border border-neutral-800 text-white font-medium rounded-2xl py-3.5 flex items-center justify-center gap-2 transition active:scale-[0.98] hover:bg-neutral-800 ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="text-sm text-neutral-400 mb-2 block">{label}</span>
      <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus-within:border-neutral-600 transition">
        {Icon && <Icon className="w-4 h-4 text-neutral-500 flex-shrink-0" />}
        <input
          {...props}
          className="bg-transparent outline-none text-white placeholder-neutral-600 text-sm w-full"
        />
      </div>
    </label>
  );
}

function BackHeader({ title, onBack, right = null }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition"
        aria-label="Back"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <h2 className="text-base font-semibold">{title}</h2>
      {right ? right : <div className="w-9 h-9" />}
    </div>
  );
}

function TabToggle({ options, value, onChange }) {
  return (
    <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-xl py-2.5 text-sm font-medium border transition flex items-center justify-center gap-1.5 ${value === opt.value ? 'bg-white text-black border-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
        >
          {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LogoMark({ size = 26 }) {
  const LOGO_B64 = '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lPKRzmGICQ9n17UPmIfBGDMEgAVTF0yd/qEPf+jr4+PjNS7pyVLo2vSt889/67p164iIbNu2bejYE7v0WCs6IxHrDBT/9l2XYqciy7v5kOzq48rdhbp7pu5I8ninuiKl6wUqHmfzDkukukrx7k/hR1yPn++7I8VOUPx6NnVd6uuGJK6TnevycfjzundA2bP3PXOaFBLXE12snCv/sPP1fWSXKjnvXeeo0PvL3ze1gFLvmXVwsqlTVlxrlrpz+TojIr88Z4mIpqenzwOAhoga6FfAKj0RCv3xLrroorcedthh5++1117gnGvb1jbGGOxiCkDmNxTsVd15ie+ejkhoFnLjJNX4GOPvIma+z6umw20h5VBkaq4u/6V2xIQbhEY1JFV64CXqUdX7U30osD84q1TvgbshIda61ZWhiO2oVMRiE46Yg56hGlPJvCu7RBVAnMVmEEuGk8ULOCDrVXwwuqMVj4GjHH8J8+XIeWeRc4PBAAHAXHLJJee/7nWvO4GI0B9L1WR4Cujcc89109PTg9e//vU3OeduWrhw4aF77bXX7k3TIBB0ewWQQYDRsfOUexF4g6ORxTtQ1fR7AvENeeFWTP0Cwv+wUCocR1wDCq7A6CbDou2vrz0KvCzFRvQlRI2qObFJu7AvuEo14h1V5p74g9ITGwfpGHbVyKJUQZuP2adPW6KuD4Mxxtx+++149tlnf+akk056L/kecMuXL6fNnKJKm9IUAGCPc845530vWrz4PS944Qv33HnnnevkVNqq9Otf/xruvffetddff8Plf/u3/+v06enpn3DNoCzGKz0lmMJxxx1nvZTe99RTP/TGQw556Wt32GHH8T322OOZxqDv2kbCVECEQtWepLTmufqZ4s8yLQEAHkfFoZHpgBLuyyoHP+GdlofOApSLBJVqr6HK6SIR8ps/v/w81ChEXl6icLLIzhw1G1gORhz1BH3mRHiWvudgqpIy8XIfE1L2bsg5wnXr1q13rp2+7757Lvn857/0D/fee+89avMS9P8DQlnJETWSnhQAAAAASUVORK5CYII=';
  return (
    <img
      src={`data:image/png;base64,${LOGO_B64}`}
      alt="Tranxact"
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  );
}

// ---------- Auth screens ----------
function AuthShell({ children, title, subtitle, brandLabel = 'Tranxact', tagline }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-sm">
        <div className={`flex items-center gap-2 justify-center ${tagline ? 'mb-1' : 'mb-10'}`}>
          <LogoMark size={24} />
          <span className="font-bold text-lg tracking-tight">{brandLabel}</span>
        </div>
        {tagline && <p className="text-xs text-violet-400 text-center mb-10">{tagline}</p>}
        <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-neutral-400 text-sm mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function SplashScreen() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <LogoMark size={64} />
      </div>
    </div>
  );
}

function WelcomeScreen({ onContinue }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      <div className={`flex flex-col items-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <LogoMark size={40} />
        <h1 className="text-2xl font-bold mt-6 mb-2">Welcome to Tranxact 👋</h1>
        <p className="text-neutral-400 text-sm mb-10 max-w-xs">Your seamless way to move money and crypto.</p>
        <PrimaryButton onClick={onContinue} className="max-w-xs">Get Started</PrimaryButton>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, goSignup, goForgot, isDashboard }) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onLogin();
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to your wallet." brandLabel={isDashboard ? 'Tranxact Pay' : 'Tranxact'} tagline={isDashboard ? 'Payment Dashboard' : undefined}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email" icon={Mail} type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Password</span>
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus-within:border-neutral-600 transition">
            <Lock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-transparent outline-none text-white placeholder-neutral-600 text-sm w-full"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-neutral-500 hover:text-white transition">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <div className="flex justify-end -mt-1">
          <button type="button" onClick={goForgot} className="text-sm text-violet-400 hover:text-violet-300 transition">
            Forgot password?
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <PrimaryButton type="submit" className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Log In <ArrowRight className="w-4 h-4" /></>}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-neutral-500 mt-6">
        Don't have an account?{' '}
        <button onClick={goSignup} className="text-white font-medium hover:underline">Sign up</button>
      </p>
    </AuthShell>
  );
}

function SignupScreen({ onSignup, goLogin, initialReferralCode, isDashboard }) {
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode || '');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanReferral = referralCode.trim().toLowerCase().replace(/^@/, '');
    const { data, error: err } = await signUp({ email, password, username: cleanUsername, fullName, referralCode: cleanReferral || null, businessName: isDashboard ? (businessName.trim() || null) : null });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (!data.session) { setNeedsConfirmation(true); return; }
    onSignup();
  };

  if (needsConfirmation) {
    return (
      <AuthShell title="Check your email" subtitle="" brandLabel={isDashboard ? 'Tranxact Pay' : 'Tranxact'} tagline={isDashboard ? 'Payment Dashboard' : undefined}>
        <p className="text-neutral-400 text-sm mb-8">
          We've sent a confirmation link to {email}. Verify your email, then log in.
        </p>
        <PrimaryButton onClick={goLogin}>Back to login</PrimaryButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Money, simplified. Set up your wallet in a minute." brandLabel={isDashboard ? 'Tranxact Pay' : 'Tranxact'} tagline={isDashboard ? 'Payment Dashboard' : undefined}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name" icon={User} type="text" placeholder="David Adeyemi" required value={fullName} onChange={e => setFullName(e.target.value)} />
        <Field label="Username" icon={User} type="text" placeholder="david" required value={username} onChange={e => setUsername(e.target.value)} />
        <Field label="Email" icon={Mail} type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Password</span>
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 focus-within:border-neutral-600 transition">
            <Lock className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="At least 8 characters"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-transparent outline-none text-white placeholder-neutral-600 text-sm w-full"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-neutral-500 hover:text-white transition">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <div>
          {isDashboard && (
            <Field label="What are you accepting payments for?" icon={Landmark} type="text" placeholder="e.g. event tickets, consulting, product sales" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          )}
          {!isDashboard && (
            <Field label="Referral code (optional)" icon={Users} type="text" placeholder="username of whoever referred you" value={referralCode} onChange={e => setReferralCode(e.target.value)} />
          )}
          {initialReferralCode && referralCode === initialReferralCode && (
            <p className="text-xs text-emerald-400 mt-1.5">Applied from your referral link</p>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <PrimaryButton type="submit" className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-neutral-500 mt-6">
        Already have an account?{' '}
        <button onClick={goLogin} className="text-white font-medium hover:underline">Log in</button>
      </p>
    </AuthShell>
  );
}

function ForgotScreen({ onSent, goLogin, isDashboard }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await requestPasswordReset(email);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSent();
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter the email on your account and we'll send a reset link." brandLabel={isDashboard ? 'Tranxact Pay' : 'Tranxact'} tagline={isDashboard ? 'Payment Dashboard' : undefined}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email" icon={Mail} type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <PrimaryButton type="submit" className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
        </PrimaryButton>
      </form>
      <button onClick={goLogin} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition mx-auto mt-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to login
      </button>
    </AuthShell>
  );
}

function ForgotSentScreen({ goLogin }) {
  return (
    <AuthShell title="" subtitle="">
      <div className="flex flex-col items-center text-center -mt-4">
        <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center mb-5">
          <Check className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-xl font-bold mb-2">Check your email</h1>
        <p className="text-neutral-400 text-sm mb-8">
          We've sent a password reset link to your inbox. It expires in 15 minutes.
        </p>
        <PrimaryButton onClick={goLogin}>Back to login</PrimaryButton>
      </div>
    </AuthShell>
  );
}

// ---------- Balance card ----------
function BalanceCard({ visible, onToggle, onFund, balance = 0 }) {
  return (
    <div className="relative bg-neutral-950 border border-neutral-800 rounded-3xl p-6 overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-2 text-neutral-400 text-sm mb-3">
          <span>Total Balance</span>
          <button onClick={onToggle} className="hover:text-white transition" aria-label="Toggle balance visibility">
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
        <div className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-5">
          {visible ? fmtNaira(balance) : '₦ • • • • • •'}
        </div>
        <button onClick={onFund} className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 text-sm flex items-center gap-2 hover:bg-neutral-200 transition active:scale-[0.98]">
          Fund Wallet <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-90 hidden sm:block">
        <div className="relative w-24 h-20">
          <div className="absolute inset-0 bg-neutral-800 border border-neutral-700 rounded-2xl rotate-6" />
          <div className="absolute inset-0 bg-neutral-900 border border-neutral-700 rounded-2xl -rotate-3 translate-x-2" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-violet-900 border border-violet-700 rounded-2xl flex items-center justify-center translate-x-4 -translate-y-1">
            <Wallet className="w-7 h-7 text-white/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, sub, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-neutral-950 border border-neutral-800 rounded-2xl py-5 flex flex-col items-center gap-2 hover:bg-neutral-900 hover:border-neutral-700 transition active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-neutral-500">{sub}</div>
    </button>
  );
}

function ServiceTile({ label, icon: Icon, onClick, ready = true }) {
  return (
    <button
      onClick={ready ? onClick : undefined}
      className={`flex flex-col items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-2xl py-4 transition active:scale-[0.98] ${ready ? 'hover:bg-neutral-900' : 'opacity-40 cursor-not-allowed'}`}
    >
      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-neutral-400">{label}</span>
      {!ready && <span className="text-[9px] text-neutral-600">Soon</span>}
    </button>
  );
}

// ---------- Branded receipt (Tranxact equivalent of OPay's "Share Receipt") ----------
// Requires two extra dependencies: `html2canvas` (renders this DOM node into a
// real PNG canvas) and `jspdf` (wraps that PNG into a one-page PDF). Neither
// was confirmed present in package.json — run:
//   npm install html2canvas jspdf
// before shipping this, or the two share buttons below will throw on tap.
const ReceiptCard = React.forwardRef(({ tx }, ref) => {
  const positive = tx.amount > 0;
  const otherPartyLabel = tx.counterparty ? (positive ? 'Sender Details' : 'Recipient Details') : null;
  const maskedRef = tx.id ? `${tx.id.slice(0, 8)}${'*'.repeat(4)}${tx.id.slice(-4)}` : '';

  // Bills, withdrawals, and bank deposits all carry real, specific detail
  // in their description now (what was bought, whose meter, which bank
  // account) — worth showing on the receipt itself, not just in a list row.
  // Reversal/internal text is deliberately excluded, that's not something
  // a customer sharing a receipt should ever see.
  const detailTypes = ['bill_payment', 'withdrawal', 'send_bank', 'fund_bank', 'crypto_deposit'];
  const showDescription = detailTypes.includes(tx.type) && tx.description && !/^reversal/i.test(tx.description);
  const detailLabel = {
    bill_payment: 'Purchase Details',
    withdrawal: 'Bank Details',
    send_bank: 'Bank Details',
    fund_bank: 'Received From',
    crypto_deposit: 'Received From',
  }[tx.type] || 'Details';

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-2xl p-6"
      style={{ background: '#111114', border: '1px solid #27272a', width: 360 }}
    >
      {/* Faint repeated wordmark watermark, like OPay's receipt background */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none select-none"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '28px',
          padding: '10px',
          transform: 'rotate(-18deg) scale(1.4)',
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: 1,
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => <span key={i}>Tranxact</span>)}
      </div>

      <div className="relative flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <LogoMark size={16} />
          </div>
          <span className="font-bold text-white text-sm">Tranxact</span>
        </div>
        <span className="text-xs text-neutral-400">Transaction Receipt</span>
      </div>

      <div className="relative text-center mb-6">
        <div className={`font-mono text-3xl font-bold ${positive ? 'text-emerald-400' : 'text-white'}`}>
          {fmtNaira(tx.amount)}
        </div>
        <div className="text-sm text-neutral-300 mt-2 capitalize">{tx.status || 'Settled'}</div>
        <div className="text-xs text-neutral-500 mt-1">{tx.fullTime}</div>
      </div>

      <div className="relative border-t border-dashed border-neutral-700 pt-5 space-y-4">
        {otherPartyLabel && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">{otherPartyLabel}</div>
            <div className="text-sm font-semibold text-white">@{tx.counterparty}</div>
            <div className="text-xs text-neutral-400">Tranxact user</div>
          </div>
        )}
        {showDescription && (
          <div>
            <div className="text-xs text-neutral-500 mb-1">{detailLabel}</div>
            <div className="text-sm font-semibold text-white break-words">{tx.description}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Transaction No.</div>
          <div className="text-xs font-mono text-neutral-300 break-all">{maskedRef}</div>
        </div>
      </div>

      <div className="relative border-t border-dashed border-neutral-700 mt-5 pt-4">
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Tranxact. Send and receive money instantly, get paid with TranxactPay, and convert crypto to naira in seconds.
        </p>
      </div>
    </div>
  );
});

function ShareReceiptScreen({ tx, onBack }) {
  const [busy, setBusy] = useState(''); // '' | 'image' | 'pdf'
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  // html2canvas has a longstanding, well-documented issue with base64 data-URI
  // images: it can capture the DOM before the browser has actually finished
  // decoding/painting the image, leaving it blank in the output — even though
  // the image itself is completely valid. Explicitly waiting for every image
  // inside the card to confirm loaded (not just present) before capturing is
  // the reliable fix, rather than trusting html2canvas's own image handling.
  const waitForImages = (container) => {
    const imgs = Array.from(container.querySelectorAll('img'));
    return Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true }); // don't hang forever on a bad image
        });
      })
    );
  };

  const renderCanvas = async () => {
    await waitForImages(cardRef.current);
    // img.complete confirms the image is decoded, but not necessarily that
    // the browser has actually painted this frame yet — waiting two animation
    // frames forces a real paint to happen before html2canvas takes its snapshot.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const html2canvas = (await import('html2canvas')).default;
    // html2canvas's own FAQ confirms it runs an internal taint-safety check
    // on every image before drawing it — without allowTaint explicitly set,
    // an image it's not fully certain about gets silently skipped, not
    // errored. Combined with a generous imageTimeout as a second safety net.
    return html2canvas(cardRef.current, { backgroundColor: '#111114', scale: 3, allowTaint: true, imageTimeout: 15000, useCORS: true });
  };

  const shareAsImage = async () => {
    setError('');
    setBusy('image');
    try {
      const canvas = await renderCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) { setError('Could not generate the image'); setBusy(''); return; }
        const file = new File([blob], `tranxact-receipt-${tx.id.slice(0, 8)}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Tranxact receipt' }); } catch { /* cancelled */ }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `tranxact-receipt-${tx.id.slice(0, 8)}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setBusy('');
      }, 'image/png');
    } catch (e) {
      setError('Could not generate the image — make sure html2canvas is installed.');
      setBusy('');
    }
  };

  const shareAsPdf = async () => {
    setError('');
    setBusy('pdf');
    try {
      const canvas = await renderCanvas();
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const blob = pdf.output('blob');
      const file = new File([blob], `tranxact-receipt-${tx.id.slice(0, 8)}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Tranxact receipt' }); } catch { /* cancelled */ }
      } else {
        pdf.save(`tranxact-receipt-${tx.id.slice(0, 8)}.pdf`);
      }
    } catch (e) {
      setError('Could not generate the PDF — make sure html2canvas and jspdf are installed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="max-w-sm mx-auto px-5 pt-6 pb-10" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        <BackHeader title="Share Receipt" onBack={onBack} />
        <div className="flex justify-center mb-6">
          <ReceiptCard tx={tx} ref={cardRef} />
        </div>
        {error && <p className="text-sm text-red-400 text-center mb-4">{error}</p>}
        <div className="flex items-center justify-center gap-8 border-t border-neutral-900 pt-5">
          <button onClick={shareAsImage} disabled={!!busy} className="flex items-center gap-2 text-sm text-emerald-400 disabled:opacity-50">
            {busy === 'image' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            Share as image
          </button>
          <div className="w-px h-5 bg-neutral-800" />
          <button onClick={shareAsPdf} disabled={!!busy} className="flex items-center gap-2 text-sm text-emerald-400 disabled:opacity-50">
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Share as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function TransactionDetailModal({ tx, onClose, onSendAgain }) {
  const [showShare, setShowShare] = useState(false);
  const positive = tx.amount > 0;
  const Icon = tx.icon;
  const isPeer = tx.type === 'send_user' && tx.counterparty;
  const isBank = tx.type === 'send_bank';
  const isCrypto = tx.type === 'crypto_deposit' && tx.cryptoAsset;
  const rows = [
    { label: 'Status', value: <span className="capitalize">{tx.status || 'settled'}</span> },
    { label: 'Date & time', value: tx.fullTime },
    { label: 'Reference', value: <span className="font-mono text-xs">{tx.id}</span> },
  ];
  if (tx.counterparty) rows.splice(1, 0, { label: tx.type === 'send_user' ? 'To/From' : 'User', value: `@${tx.counterparty}` });
  if (tx.cryptoAsset) rows.splice(1, 0, { label: 'Asset', value: tx.cryptoAsset });
  if (tx.description) rows.push({ label: 'Description', value: tx.description });

  if (showShare) return <ShareReceiptScreen tx={tx} onBack={() => setShowShare(false)} />;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6">
        <div className="flex flex-col items-center text-center mb-6">
          {isPeer ? (
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <LogoMark size={22} />
            </div>
          ) : isCrypto ? (
            <CoinIcon symbol={tx.cryptoAsset} size={48} />
          ) : isBank ? (
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-neutral-300" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Icon className="w-5 h-5 text-neutral-300" />
            </div>
          )}
          <div className={`font-mono text-2xl font-bold mt-3 ${positive ? 'text-emerald-400' : 'text-white'}`}>
            {positive ? '+' : '-'}{fmtNaira(tx.amount)}
          </div>
          <div className="text-sm text-neutral-500 mt-1">{tx.title}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500">{r.label}</span>
              <span className="text-sm text-right ml-4">{r.value}</span>
            </div>
          ))}
        </div>

        {isPeer && !positive && onSendAgain && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl mt-4 px-4 py-3">
            <button
              onClick={() => { onSendAgain(tx.counterparty); onClose(); }}
              className="w-full flex items-center gap-2 text-sm text-emerald-400"
            >
              <ArrowUpFromLine className="w-4 h-4" /> Send again
            </button>
          </div>
        )}

        <button onClick={() => setShowShare(true)} className="w-full mt-4 bg-neutral-900 border border-neutral-800 text-white text-sm font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-neutral-800 transition">
          <Share2 className="w-4 h-4" /> Share receipt
        </button>
        <button onClick={onClose} className="w-full mt-3 text-sm text-neutral-500 hover:text-white transition py-2">Close</button>
      </div>
    </div>
  );
}

function TransactionRow({ tx, onSendAgain }) {
  const [showDetail, setShowDetail] = useState(false);
  const positive = tx.amount > 0;
  // The list itself stays simple — just a direction indicator. The specific
  // branded icon (Tranxact logo / bank / coin) only shows once someone taps
  // in to the detail view below.
  const DirectionIcon = positive ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <>
      <button onClick={() => setShowDetail(true)} className="w-full flex items-center justify-between py-3.5 border-b border-neutral-900 last:border-b-0 text-left hover:bg-neutral-900/40 transition -mx-1 px-1 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
            <DirectionIcon className={`w-4 h-4 ${positive ? 'text-emerald-400' : 'text-neutral-300'}`} />
          </div>
          <div>
            <div className="text-sm font-medium">{tx.title}</div>
            <div className="text-xs text-neutral-500">{tx.sub}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-sm ${positive ? 'text-emerald-400' : 'text-white'}`}>
            {positive ? '+' : '-'}{fmtNaira(tx.amount)}
          </div>
          <div className="text-xs text-neutral-500">{tx.time}</div>
        </div>
      </button>
      {showDetail && <TransactionDetailModal tx={tx} onClose={() => setShowDetail(false)} onSendAgain={onSendAgain} />}
    </>
  );
}

// ---------- Home ----------
function HomeScreen({ balanceVisible, toggleBalance, onFund, onReceive, onSend, onSendAgain, onTranxactPay, onAirtime, onData, onElectricity, onTV, onSeeAllBills, onSeeAll, onOpenNotifications, unreadCount = 0, displayName = '', balance = 0, transactions = [] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Hi, {displayName} 👋</h1>
          <p className="text-neutral-500 text-sm">Welcome back</p>
        </div>
        <button onClick={onOpenNotifications} className="relative w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center hover:bg-neutral-900 transition">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-400 text-black text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <BalanceCard visible={balanceVisible} onToggle={toggleBalance} onFund={onFund} balance={balance} />

      <div className="grid grid-cols-3 gap-3">
        <ActionButton label="Receive" sub="Crypto only" icon={ArrowDownToLine} onClick={onReceive} />
        <ActionButton label="Send" sub="To user or bank" icon={ArrowUpFromLine} onClick={onSend} />
        <ActionButton label="TranxactPay" sub="Payment link" icon={Link2} onClick={onTranxactPay} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Pay Bills &amp; Services</h2>
          <button onClick={onSeeAllBills} className="text-xs text-neutral-500 hover:text-white transition">See all</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BILLS.slice(0, 4).map(b => (
            <ServiceTile
              key={b.label}
              label={b.label}
              icon={b.icon}
              ready={b.ready}
              onClick={b.id === 'airtime' ? onAirtime : b.id === 'data' ? onData : b.id === 'electricity' ? onElectricity : b.id === 'tv' ? onTV : undefined}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          {transactions.length > 0 && (
            <button onClick={onSeeAll} className="text-xs text-neutral-500 hover:text-white transition">See all</button>
          )}
        </div>
        {transactions.length === 0 ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl py-8 text-center">
            <p className="text-sm text-neutral-500">No transactions yet</p>
            <p className="text-xs text-neutral-600 mt-1">Fund your wallet or receive crypto to get started</p>
          </div>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4">
            {transactions.slice(0, 3).map(tx => <TransactionRow key={tx.id} tx={tx} onSendAgain={onSendAgain} />)}
          </div>
        )}
      </div>

    </div>
  );
}

// ---------- History ----------
// ---------- Notifications ----------
function NotificationsScreen({ onBack }) {
  const [notifications, setNotifications] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    try {
      setNotifications(await getMyNotifications());
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTap = async (n) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      try { await markNotificationRead(n.id); } catch { /* best-effort */ }
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await markAllNotificationsRead(); } finally { setMarkingAll(false); }
  };

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <BackHeader title="Notifications" onBack={onBack} />
      </div>
      {unreadCount > 0 && (
        <div className="flex justify-end -mt-4 mb-4">
          <button onClick={handleMarkAll} disabled={markingAll} className="text-xs text-violet-400 hover:text-violet-300 transition disabled:opacity-50">
            Mark all as read
          </button>
        </div>
      )}

      {notifications === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
      ) : notifications.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl py-10 text-center">
          <p className="text-sm text-neutral-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => handleTap(n)}
              className={`w-full text-left rounded-2xl p-4 border transition ${n.read ? 'bg-neutral-950 border-neutral-800' : 'bg-violet-500/10 border-violet-500/30'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{n.message}</div>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 mt-1.5" />}
              </div>
              <div className="text-[11px] text-neutral-600 mt-2">{new Date(normalizeTimestamp(n.created_at)).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryScreen({ onBack, transactions = [], onSendAgain }) {
  const todayKey = new Date().toDateString();
  const yesterdayKey = new Date(Date.now() - 86400000).toDateString();
  const groupLabel = (dateKey) => {
    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';
    return dateKey ? new Date(dateKey).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Earlier';
  };

  const groups = [];
  for (const tx of transactions) {
    const key = tx.dateKey || 'Earlier';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(tx);
    else groups.push({ key, items: [tx] });
  }

  return (
    <div>
      <BackHeader title="Transaction History" onBack={onBack} />
      {transactions.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl py-10 text-center">
          <p className="text-sm text-neutral-500">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(g => (
            <div key={g.key}>
              <h3 className="text-xs font-medium text-neutral-500 mb-2 px-1">{groupLabel(g.key)}</h3>
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4">
                {g.items.map(tx => <TransactionRow key={tx.id} tx={tx} onSendAgain={onSendAgain} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Crypto receive (shared: used by Receive, Fund Wallet, Crypto tab) ----------
// USDT and USDC exist on multiple real networks — everything else is native
// to just one chain, so no choice is needed for those.
// USDC-BEP20 deliberately excluded — Circle's own official contract list
// doesn't include BNB Chain, meaning "USDC" there is very likely a bridged/
// third-party token, not the real Circle-issued asset. Not enabling until
// separately, properly verified.
const MULTI_NETWORK_OPTIONS = { USDT: ['TRC20', 'ERC20', 'BEP20'] };
const NETWORK_DISPLAY_NAME = { TRC20: 'TRC20 (Tron)', ERC20: 'ERC20 (Ethereum)', BEP20: 'BEP20 (BNB Smart Chain)', BTC: 'Bitcoin network', SOL: 'Solana network' };

function CryptoReceivePanel() {
  const [assets, setAssets] = useState(null); // null = loading
  const [selected, setSelected] = useState(null); // { symbol, name, network }
  const [chosenNetwork, setChosenNetwork] = useState(null);
  const [address, setAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCryptoAssets().then(({ data, error: err }) => {
      if (err) { setError(err.message); setAssets([]); return; }
      setAssets(data || []);
    });
  }, []);

  const fetchAddress = async (symbol, network) => {
    setAddress(null);
    setError('');
    setAddressLoading(true);
    try {
      const result = await getDepositAddress(symbol, network);
      setAddress(result.address);
    } catch (e) {
      setError(e.message);
    } finally {
      setAddressLoading(false);
    }
  };

  const openAsset = (a) => {
    if (!a.is_receivable) return;
    setSelected(a);
    setChosenNetwork(null);
    const options = MULTI_NETWORK_OPTIONS[a.symbol];
    if (options) return; // wait for network choice — see picker below
    fetchAddress(a.symbol, undefined);
  };

  const pickNetwork = (net) => {
    setChosenNetwork(net);
    fetchAddress(selected.symbol, net);
  };

  const awaitingNetworkChoice = selected && MULTI_NETWORK_OPTIONS[selected.symbol] && !chosenNetwork;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition mb-4">
          <ChevronLeft className="w-4 h-4" /> Choose a different coin
        </button>

        {awaitingNetworkChoice ? (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <CoinIcon symbol={selected.symbol} size={32} />
              <div>
                <div className="text-sm font-semibold">{selected.name}</div>
                <div className="text-xs text-neutral-500">Choose which network you're sending from</div>
              </div>
            </div>
            <div className="space-y-2">
              {MULTI_NETWORK_OPTIONS[selected.symbol].map(net => (
                <button
                  key={net}
                  onClick={() => pickNetwork(net)}
                  className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 text-left hover:border-violet-500 transition"
                >
                  <span className="text-sm font-medium">{NETWORK_DISPLAY_NAME[net] || net}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-300/80 mt-4">Pick the wrong network and the funds may be unrecoverable. Match this to what your exchange or wallet actually sends on.</p>
          </div>
        ) : (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center">
          {addressLoading ? (
            <div className="py-10 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              <span className="text-xs text-neutral-500">Getting your address…</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 py-6 text-center">{error}</p>
          ) : (
            <>
              <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center mb-5 p-3">
                <BrandedQR data={address} size={136} />
              </div>
              <div className="text-xs text-neutral-500 mb-2">
                {selected.name} · {NETWORK_DISPLAY_NAME[chosenNetwork] || selected.network} network
                {chosenNetwork && (
                  <button onClick={() => { setChosenNetwork(null); setAddress(null); }} className="text-violet-400 ml-2">Change</button>
                )}
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 w-full text-center font-mono text-xs text-neutral-300 break-all mb-4">
                {address}
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <GhostButton onClick={() => { navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); notifyCopyEvent({ type: 'crypto', asset: selected.symbol }); }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                </GhostButton>
                <GhostButton><Share2 className="w-4 h-4" /> Share</GhostButton>
              </div>
            </>
          )}
        </div>
        )}
        {!awaitingNetworkChoice && !addressLoading && !error && (
          <p className="text-xs text-neutral-600 text-center mt-4">
            Only send {selected.symbol} on the {NETWORK_DISPLAY_NAME[chosenNetwork] || selected.network} network to this address. It's converted to naira automatically at the current rate and credited to your wallet.
          </p>
        )}
      </div>
    );
  }

  if (assets === null) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>;
  }

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
      {assets.map(a => (
        <button
          key={a.symbol}
          onClick={() => openAsset(a)}
          disabled={!a.is_receivable}
          className={`w-full flex items-center justify-between px-4 py-4 transition ${a.is_receivable ? 'hover:bg-neutral-900' : 'opacity-40 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3">
            <CoinIcon symbol={a.symbol} size={36} />
            <div className="text-left">
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-xs text-neutral-500">{a.symbol}</div>
            </div>
          </div>
          {a.is_receivable ? (
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          ) : (
            <span className="text-[10px] text-neutral-600">Coming soon</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ReceiveScreen({ onBack }) {
  return (
    <div>
      <BackHeader title="Receive Crypto" onBack={onBack} />
      <p className="text-sm text-neutral-500 mb-4">
        We don't hold crypto. Pick a coin, get your address, and whatever lands there is converted to naira and credited to your wallet.
      </p>
      <CryptoReceivePanel />
    </div>
  );
}

// ---------- Fund Wallet ----------
function FundWalletScreen({ onBack, username = '' }) {
  return (
    <div>
      <BackHeader title="Fund Wallet" onBack={onBack} />
      <p className="text-xs text-neutral-500 mb-4">Fund your wallet with crypto, automatically converted to naira at today's rate.</p>
      <CryptoReceivePanel />
    </div>
  );
}

// ---------- Send (naira only — Tranxact user or bank account) ----------
// Real airtime purchase through VTpass, following the exact same
// form -> confirm -> pin -> result pattern already proven in SendScreen,
// so this feels consistent rather than bolted on.
const NETWORKS = [
  { id: 'mtn', label: 'MTN' },
  { id: 'glo', label: 'Glo' },
  { id: 'airtel', label: 'Airtel' },
  { id: 'etisalat', label: '9mobile' },
];
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000];

// The full bills list — the home screen only teases the first 4, this
// shows every real and upcoming service in one place.
function AllBillsScreen({ onBack, onAirtime, onData, onElectricity, onTV }) {
  return (
    <div>
      <BackHeader title="Bills & Services" onBack={onBack} />
      <div className="grid grid-cols-4 gap-2">
        {BILLS.map(b => (
          <ServiceTile
            key={b.label}
            label={b.label}
            icon={b.icon}
            ready={b.ready}
            onClick={b.id === 'airtime' ? onAirtime : b.id === 'data' ? onData : b.id === 'electricity' ? onElectricity : b.id === 'tv' ? onTV : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// Real electricity purchase — the one bill type where a mistake actually
// matters (wrong meter number = someone else gets charged for your power),
// so this always verifies the real customer name before ever charging
// anyone, and shows the real prepaid token prominently since that's the
// actual thing the customer needs, not just a success message.
const DISCOS = [
  { id: 'ikeja-electric', label: 'Ikeja Electric (IKEDC)' },
  { id: 'eko-electric', label: 'Eko Electric (EKEDC)' },
  { id: 'abuja-electric', label: 'Abuja Electric (AEDC)' },
  { id: 'ibadan-electric', label: 'Ibadan Electric (IBEDC)' },
  { id: 'kano-electric', label: 'Kano Electric (KEDCO)' },
  { id: 'portharcourt-electric', label: 'Port Harcourt Electric (PHED)' },
  { id: 'jos-electric', label: 'Jos Electric (JED)' },
  { id: 'kaduna-electric', label: 'Kaduna Electric (KAEDCO)' },
  { id: 'enugu-electric', label: 'Enugu Electric (EEDC)' },
  { id: 'benin-electric', label: 'Benin Electric (BEDC)' },
  { id: 'aba-electric', label: 'ABA Electric' },
  { id: 'yola-electric', label: 'Yola Electric (YEDC)' },
];

// Real TV subscription purchase — verifies the real smartcard/IUC number
// first (showing the real customer name before charging anyone, same
// discipline as electricity), then lets them pick from real, live
// packages fetched from VTpass, same pattern as data plans.
const TV_PROVIDERS = [
  { id: 'dstv', label: 'DStv' },
  { id: 'gotv', label: 'GOtv' },
  { id: 'startimes', label: 'StarTimes' },
];

function TVScreen({ onBack, onDone, hasPin }) {
  const [step, setStep] = useState('form'); // form | packages | confirm | pin | result
  const [provider, setProvider] = useState('dstv');
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState(null);
  const [variations, setVariations] = useState(null);
  const [variationsError, setVariationsError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const validPhone = /^0\d{10}$/.test(phone);
  const canVerify = smartcardNumber.trim().length >= 6 && validPhone;

  const handleVerify = async () => {
    setError('');
    setVerifying(true);
    try {
      const v = await verifyMeter(provider, smartcardNumber.trim());
      setVerifiedCustomer(v);
      setStep('packages');
      const res = await getServiceVariations(provider);
      setVariations(res.variations || []);
    } catch (e) {
      setError(e.message);
      setVariationsError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const executePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await buyTV(provider, smartcardNumber.trim(), selectedPackage.code, selectedPackage.name, phone, selectedPackage.amount);
      setResult(res);
      setStep('result');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (hasPin) {
      setPinError('');
      setStep('pin');
      return;
    }
    executePurchase();
  };

  const handlePinSubmit = async () => {
    setPinError('');
    setPinLoading(true);
    try {
      const valid = await verifyTransactionPin(pin);
      if (!valid) {
        setPinError('Incorrect PIN');
        setPinLoading(false);
        return;
      }
      setPin('');
      await executePurchase();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (step === 'result' && result) {
    const isSettled = result.status === 'settled';

    if (isSettled) {
      return (
        <div>
          <BackHeader title="Summary" onBack={() => {}} />
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Package</span><span className="text-right max-w-[65%]">{selectedPackage?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Smartcard</span><span className="text-right max-w-[65%]">{verifiedCustomer?.customer_name || 'this smartcard'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(result.amount)}</span></div>
          </div>
          <SuccessSheet
            open
            title="Success!"
            subtitle="Subscription active"
            detail={`${selectedPackage?.name || 'Your package'} activated`}
            onDone={onDone}
          />
        </div>
      );
    }

    return (
      <div>
        <BackHeader title="TV Subscription" onBack={onDone} />
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 bg-amber-500/15 border border-amber-500/30">
            <Loader2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Still processing</h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            Your {fmtNaira(result.amount)} is confirmed and being processed. Check your transaction history for the final result.
          </p>
        </div>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div>
        <BackHeader title="Enter PIN" onBack={() => setStep('confirm')} />
        <p className="text-sm text-neutral-500 mb-6">Enter your transaction PIN to pay {fmtNaira(selectedPackage?.amount || 0)} for {selectedPackage?.name}.</p>
        <Field
          label="Transaction PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
        />
        {pinError && <p className="text-sm text-red-400 mt-3">{pinError}</p>}
        <PrimaryButton onClick={handlePinSubmit} disabled={pinLoading || pin.length < 4} className="mt-5">
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    const providerLabel = TV_PROVIDERS.find(p => p.id === provider)?.label || provider;
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('packages')} />
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4">
          <div className="text-xs text-emerald-400 font-medium mb-1">Smartcard verified</div>
          <div className="text-sm font-semibold">{verifiedCustomer?.customer_name}</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Provider</span><span>{providerLabel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Smartcard</span><span>{smartcardNumber}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Package</span><span className="text-right max-w-[60%]">{selectedPackage?.name}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(selectedPackage?.amount || 0)}</span></div>
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Pay'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'packages') {
    return (
      <div>
        <BackHeader title="Choose Package" onBack={() => setStep('form')} />
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-5">
          <div className="text-xs text-emerald-400 font-medium mb-1">Smartcard verified</div>
          <div className="text-sm font-semibold">{verifiedCustomer?.customer_name}</div>
        </div>
        {variations === null ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-600" /></div>
        ) : variationsError ? (
          <p className="text-sm text-red-400 py-4">{variationsError}</p>
        ) : variations.length === 0 ? (
          <p className="text-sm text-neutral-600 py-4">No packages available right now.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {variations.map(v => (
              <button
                key={v.code}
                onClick={() => { setSelectedPackage(v); setStep('confirm'); }}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700"
              >
                <span className="text-sm">{v.name}</span>
                <span className="text-sm font-mono flex-shrink-0 ml-3">{fmtNaira(v.amount)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="TV Subscription" onBack={onBack} />
      <div className="space-y-5">
        <div>
          <span className="text-sm text-neutral-400 mb-2 block">Provider</span>
          <div className="grid grid-cols-3 gap-2">
            {TV_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${provider === p.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Smartcard / IUC number"
          inputMode="numeric"
          value={smartcardNumber}
          onChange={e => setSmartcardNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="1212121212"
        />
        <Field
          label="Phone number"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="08011111111"
        />
      </div>
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleVerify} disabled={!canVerify || verifying} className="mt-6">
        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
      </PrimaryButton>
    </div>
  );
}

function ElectricityScreen({ onBack, onDone, hasPin }) {
  const [step, setStep] = useState('form'); // form | confirm | pin | result
  const [disco, setDisco] = useState('ikeja-electric');
  const [meterType, setMeterType] = useState('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const validPhone = /^0\d{10}$/.test(phone);
  const validAmount = Number(amount) >= 500;
  const canContinue = meterNumber.trim().length >= 6 && validPhone && validAmount;

  const handleFormContinue = async () => {
    setError('');
    setVerifying(true);
    try {
      const v = await verifyMeter(disco, meterNumber.trim(), meterType);
      setVerifiedCustomer(v);
      setStep('confirm');
    } catch (e) {
      setError(e.message);
    } finally {
      setVerifying(false);
    }
  };

  const executePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await buyElectricity(disco, meterNumber.trim(), meterType, phone, Number(amount));
      setResult(res);
      setStep('result');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (hasPin) {
      setPinError('');
      setStep('pin');
      return;
    }
    executePurchase();
  };

  const handlePinSubmit = async () => {
    setPinError('');
    setPinLoading(true);
    try {
      const valid = await verifyTransactionPin(pin);
      if (!valid) {
        setPinError('Incorrect PIN');
        setPinLoading(false);
        return;
      }
      setPin('');
      await executePurchase();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (step === 'result' && result) {
    const isSettled = result.status === 'settled';

    if (isSettled) {
      return (
        <div>
          <BackHeader title="Summary" onBack={() => {}} />
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-4">
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Paid to</span><span className="text-right max-w-[65%]">{verifiedCustomer?.customer_name || 'this meter'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(result.amount)}</span></div>
          </div>
          {result.token && (
            <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 text-left mb-6">
              <div className="text-xs text-neutral-500 mb-1.5">Your prepaid token — load this on your meter</div>
              <div className="font-mono text-sm text-emerald-400 break-all">{result.token}</div>
            </div>
          )}
          <SuccessSheet
            open
            title="Success!"
            subtitle="Payment successful"
            amount={fmtNaira(result.amount)}
            onDone={onDone}
          />
        </div>
      );
    }

    return (
      <div>
        <BackHeader title="Electricity" onBack={onDone} />
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 bg-amber-500/15 border border-amber-500/30">
            <Loader2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Still processing</h2>
          <p className="text-sm text-neutral-500 max-w-xs mb-5">
            Your {fmtNaira(result.amount)} is confirmed and being processed. Check your transaction history for the final result.
          </p>
        </div>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div>
        <BackHeader title="Enter PIN" onBack={() => setStep('confirm')} />
        <p className="text-sm text-neutral-500 mb-6">Enter your transaction PIN to pay {fmtNaira(Number(amount) || 0)} for this meter.</p>
        <Field
          label="Transaction PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
        />
        {pinError && <p className="text-sm text-red-400 mt-3">{pinError}</p>}
        <PrimaryButton onClick={handlePinSubmit} disabled={pinLoading || pin.length < 4} className="mt-5">
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    const discoLabel = DISCOS.find(d => d.id === disco)?.label || disco;
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('form')} />
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4">
          <div className="text-xs text-emerald-400 font-medium mb-1">Meter verified</div>
          <div className="text-sm font-semibold">{verifiedCustomer?.customer_name}</div>
          {verifiedCustomer?.address && <div className="text-xs text-neutral-500 mt-0.5">{verifiedCustomer.address}</div>}
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Provider</span><span>{discoLabel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Meter</span><span>{meterNumber} ({meterType})</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(Number(amount) || 0)}</span></div>
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Pay'}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="Electricity" onBack={onBack} />
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Provider</span>
          <select
            value={disco}
            onChange={e => setDisco(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm"
          >
            {DISCOS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>
        <div>
          <span className="text-sm text-neutral-400 mb-2 block">Meter type</span>
          <TabToggle
            value={meterType}
            onChange={setMeterType}
            options={[
              { value: 'prepaid', label: 'Prepaid' },
              { value: 'postpaid', label: 'Postpaid' },
            ]}
          />
        </div>
        <Field
          label="Meter number"
          inputMode="numeric"
          value={meterNumber}
          onChange={e => setMeterNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="1111111111111"
        />
        <Field
          label="Phone number"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="08011111111"
        />
        <Field
          label="Amount"
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          placeholder="2000"
        />
      </div>
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleFormContinue} disabled={!canContinue || verifying} className="mt-6">
        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
      </PrimaryButton>
    </div>
  );
}

function AirtimeScreen({ onBack, onDone, hasPin }) {
  const [step, setStep] = useState('form'); // form | confirm | pin | result
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { status, amount } once we actually hear back

  const validPhone = /^0\d{10}$/.test(phone);
  const validAmount = Number(amount) >= 50;
  const canContinue = validPhone && validAmount;

  const executePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await buyAirtime(network, phone, Number(amount));
      setResult(res);
      setStep('result');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (hasPin) {
      setPinError('');
      setStep('pin');
      return;
    }
    executePurchase();
  };

  const handlePinSubmit = async () => {
    setPinError('');
    setPinLoading(true);
    try {
      const valid = await verifyTransactionPin(pin);
      if (!valid) {
        setPinError('Incorrect PIN');
        setPinLoading(false);
        return;
      }
      setPin('');
      await executePurchase();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (step === 'result' && result) {
    const isSettled = result.status === 'settled';

    // Only a genuine success gets the celebratory sheet. "Still processing"
    // isn't a success yet, so it stays a plain, honest screen.
    if (isSettled) {
      const networkLabel = NETWORKS.find(n => n.id === network)?.label || network;
      return (
        <div>
          <BackHeader title="Summary" onBack={() => {}} />
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Network</span><span>{networkLabel}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Phone</span><span>{phone}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(result.amount)}</span></div>
          </div>
          <SuccessSheet
            open
            title="Success!"
            subtitle="Airtime delivered"
            amount={fmtNaira(result.amount)}
            detail={`to ${phone}`}
            onDone={onDone}
          />
        </div>
      );
    }

    return (
      <div>
        <BackHeader title="Airtime" onBack={onDone} />
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 bg-amber-500/15 border border-amber-500/30">
            <Loader2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Still processing</h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            Your {fmtNaira(result.amount)} is confirmed and being delivered by the network. This can take a few minutes — check your transaction history for the final result.
          </p>
        </div>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div>
        <BackHeader title="Enter PIN" onBack={() => setStep('confirm')} />
        <p className="text-sm text-neutral-500 mb-6">Enter your transaction PIN to buy {fmtNaira(Number(amount) || 0)} airtime for {phone}.</p>
        <Field
          label="Transaction PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
        />
        {pinError && <p className="text-sm text-red-400 mt-3">{pinError}</p>}
        <PrimaryButton onClick={handlePinSubmit} disabled={pinLoading || pin.length < 4} className="mt-5">
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    const networkLabel = NETWORKS.find(n => n.id === network)?.label || network;
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('form')} />
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Network</span><span>{networkLabel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Phone</span><span>{phone}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(Number(amount) || 0)}</span></div>
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Buy'}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="Airtime" onBack={onBack} />
      <div className="space-y-5">
        <div>
          <span className="text-sm text-neutral-400 mb-2 block">Network</span>
          <div className="grid grid-cols-4 gap-2">
            {NETWORKS.map(n => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${network === n.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Phone number"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="08011111111"
        />
        <div>
          <Field
            label="Amount"
            inputMode="numeric"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="500"
          />
          <div className="flex flex-wrap gap-2 mt-2.5">
            {QUICK_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="bg-neutral-900 border border-neutral-800 rounded-full px-3.5 py-1.5 text-xs text-neutral-300"
              >
                {fmtNaira(a)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <PrimaryButton onClick={() => setStep('confirm')} disabled={!canContinue} className="mt-6">
        Continue
      </PrimaryButton>
    </div>
  );
}

// Real data bundle purchase — same proven flow as AirtimeScreen, with one
// real difference: plans are fetched live from VTpass, never hardcoded,
// since prices and availability can change on their end at any time.
const DATA_NETWORKS = [
  { id: 'mtn-data', label: 'MTN' },
  { id: 'glo-data', label: 'Glo' },
  { id: 'airtel-data', label: 'Airtel' },
  { id: 'etisalat-data', label: '9mobile' },
];

function DataScreen({ onBack, onDone, hasPin }) {
  const [step, setStep] = useState('form'); // form | confirm | pin | result
  const [network, setNetwork] = useState('mtn-data');
  const [variations, setVariations] = useState(null); // null = loading, [] = loaded
  const [variationsError, setVariationsError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null); // { code, name, amount }
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    setVariations(null);
    setVariationsError('');
    setSelectedPlan(null);
    getServiceVariations(network)
      .then(res => setVariations(res.variations || []))
      .catch(e => { setVariationsError(e.message); setVariations([]); });
  }, [network]);

  const validPhone = /^0\d{10}$/.test(phone);
  const canContinue = validPhone && !!selectedPlan;

  const executePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await buyData(network, phone, selectedPlan.code, selectedPlan.name, selectedPlan.amount);
      setResult(res);
      setStep('result');
    } catch (e) {
      setError(e.message);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (hasPin) {
      setPinError('');
      setStep('pin');
      return;
    }
    executePurchase();
  };

  const handlePinSubmit = async () => {
    setPinError('');
    setPinLoading(true);
    try {
      const valid = await verifyTransactionPin(pin);
      if (!valid) {
        setPinError('Incorrect PIN');
        setPinLoading(false);
        return;
      }
      setPin('');
      await executePurchase();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (step === 'result' && result) {
    const isSettled = result.status === 'settled';

    if (isSettled) {
      return (
        <div>
          <BackHeader title="Summary" onBack={() => {}} />
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Plan</span><span className="text-right max-w-[65%]">{selectedPlan?.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Phone</span><span>{phone}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(result.amount)}</span></div>
          </div>
          <SuccessSheet
            open
            title="Success!"
            subtitle="Data delivered"
            detail={`${selectedPlan?.name || 'Your plan'} sent to ${phone}`}
            onDone={onDone}
          />
        </div>
      );
    }

    return (
      <div>
        <BackHeader title="Data" onBack={onDone} />
        <div className="flex flex-col items-center text-center py-10">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 bg-amber-500/15 border border-amber-500/30">
            <Loader2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Still processing</h2>
          <p className="text-sm text-neutral-500 max-w-xs">
            Your {fmtNaira(result.amount)} purchase is confirmed and being delivered by the network. This can take a few minutes — check your transaction history for the final result.
          </p>
        </div>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div>
        <BackHeader title="Enter PIN" onBack={() => setStep('confirm')} />
        <p className="text-sm text-neutral-500 mb-6">Enter your transaction PIN to buy {selectedPlan?.name} for {phone}.</p>
        <Field
          label="Transaction PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
        />
        {pinError && <p className="text-sm text-red-400 mt-3">{pinError}</p>}
        <PrimaryButton onClick={handlePinSubmit} disabled={pinLoading || pin.length < 4} className="mt-5">
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    const networkLabel = DATA_NETWORKS.find(n => n.id === network)?.label || network;
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('form')} />
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Network</span><span>{networkLabel}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Plan</span><span className="text-right max-w-[60%]">{selectedPlan?.name}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Phone</span><span>{phone}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(selectedPlan?.amount || 0)}</span></div>
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Buy'}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="Data" onBack={onBack} />
      <div className="space-y-5">
        <div>
          <span className="text-sm text-neutral-400 mb-2 block">Network</span>
          <div className="grid grid-cols-4 gap-2">
            {DATA_NETWORKS.map(n => (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition ${network === n.id ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Phone number"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="08011111111"
        />
        <div>
          <span className="text-sm text-neutral-400 mb-2 block">Plan</span>
          {variations === null ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-600" /></div>
          ) : variationsError ? (
            <p className="text-sm text-red-400 py-4">{variationsError}</p>
          ) : variations.length === 0 ? (
            <p className="text-sm text-neutral-600 py-4">No plans available right now.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {variations.map(v => (
                <button
                  key={v.code}
                  onClick={() => setSelectedPlan(v)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition ${selectedPlan?.code === v.code ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-300'}`}
                >
                  <span className="text-sm">{v.name}</span>
                  <span className="text-sm font-mono flex-shrink-0 ml-3">{fmtNaira(v.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <PrimaryButton onClick={() => setStep('confirm')} disabled={!canContinue} className="mt-6">
        Continue
      </PrimaryButton>
    </div>
  );
}

function SendScreen({ onBack, onDone, hasPin, initialUsername = '' }) {
  const [mode, setMode] = useState('user');
  const [step, setStep] = useState('form');
  const [username, setUsername] = useState(initialUsername);
  const [banks, setBanks] = useState(null); // null = loading, [] = failed/empty
  const [banksError, setBanksError] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    if (mode !== 'bank' || banks !== null) return;
    listPaystackBanks()
      .then(setBanks)
      .catch(e => { setBanksError(e.message); setBanks([]); });
  }, [mode, banks]);

  useEffect(() => {
    setResolvedName('');
    setResolveError('');
    if (accountNumber.length !== 10 || !bankCode) return;
    let cancelled = false;
    setResolving(true);
    resolveBankAccount(accountNumber, bankCode)
      .then(res => { if (!cancelled) setResolvedName(res.account_name); })
      .catch(e => { if (!cancelled) setResolveError(e.message); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [accountNumber, bankCode]);

  const selectedBank = (banks || []).find(b => b.code === bankCode);
  const recipientLabel = mode === 'user' ? `@${username}` : `${resolvedName || accountNumber}${selectedBank ? ' · ' + selectedBank.name : ''}`;
  const canReview = mode === 'user' ? (username && amount) : (accountNumber.length === 10 && amount && resolvedName && !resolving);

  const executeSend = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'bank') {
        await requestWithdrawal({
          amount: Number(amount),
          bank_name: selectedBank?.name || '',
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: resolvedName,
        });
      } else {
        await sendToUser(username, Number(amount));
      }
      setStep('success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (hasPin) {
      setPinError('');
      setStep('pin');
      return;
    }
    executeSend();
  };

  const handlePinSubmit = async () => {
    setPinError('');
    setPinLoading(true);
    try {
      const valid = await verifyTransactionPin(pin);
      if (!valid) {
        setPinError('Incorrect PIN');
        setPinLoading(false);
        return;
      }
      setPin('');
      await executeSend();
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  if (step === 'success') {
    const shareReceipt = async () => {
      const text = `Tranxact\n${fmtNaira(Number(amount) || 0)} sent to ${recipientLabel}\n${new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`;
      if (navigator.share) {
        try { await navigator.share({ title: 'Tranxact receipt', text }); } catch { /* cancelled */ }
      } else {
        navigator.clipboard?.writeText(text);
      }
    };
    return (
      <div>
        {/* The summary stays on screen behind the sheet, so the result reads
            as something that happened to this transfer, not a new page. */}
        <BackHeader title="Summary" onBack={() => {}} />
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Amount</span>
            <span className="font-mono">{fmtNaira(Number(amount) || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">To</span>
            <span className="text-right max-w-[65%]">{recipientLabel}</span>
          </div>
        </div>

        <SuccessSheet
          open
          title="Success!"
          subtitle={mode === 'bank' ? 'Transfer processed' : 'Sent instantly'}
          amount={fmtNaira(Number(amount) || 0)}
          detail={`to ${recipientLabel}`}
          onDone={onDone}
          secondaryLabel="Share receipt"
          onSecondary={shareReceipt}
        />
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div>
        <BackHeader title="Enter PIN" onBack={() => setStep('confirm')} />
        <p className="text-sm text-neutral-500 mb-6">Enter your transaction PIN to send {fmtNaira(Number(amount) || 0)} to {recipientLabel}.</p>
        <Field
          label="Transaction PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••"
        />
        {pinError && <p className="text-sm text-red-400 mt-3">{pinError}</p>}
        <PrimaryButton onClick={handlePinSubmit} disabled={pinLoading || pin.length < 4} className="mt-5">
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
        </PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('form')} />
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Recipient</span><span>{recipientLabel}</span></div>
          {mode === 'bank' && <div className="flex justify-between text-sm"><span className="text-neutral-500">Bank</span><span>{selectedBank?.name}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(Number(amount) || 0)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Fee</span><span className="font-mono">₦0.00</span></div>
        </div>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <PrimaryButton onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Send'}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div>
      <BackHeader title="Send" onBack={onBack} />
      <TabToggle
        value={mode}
        onChange={setMode}
        options={[
          { value: 'user', label: 'Tranxact User' },
          { value: 'bank', label: 'Bank Account' },
        ]}
      />
      <div className="space-y-4">
        {mode === 'user' ? (
          <Field label="Tranxact username" icon={User} value={username} onChange={e => setUsername(e.target.value)} placeholder="david" />
        ) : (
          <>
            <label className="block">
              <span className="text-sm text-neutral-400 mb-2 block">Bank</span>
              <BankPicker banks={banks} banksError={banksError} bankCode={bankCode} onSelect={setBankCode} />
            </label>
            <Field label="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" />
            {resolving && <div className="text-sm text-neutral-500 -mt-2 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying account…</div>}
            {resolvedName && <div className="text-sm text-emerald-400 -mt-2">{resolvedName}</div>}
            {resolveError && <div className="text-sm text-red-400 -mt-2">{resolveError}</div>}
          </>
        )}
        <Field label="Amount" value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00" />
        <PrimaryButton onClick={() => setStep('confirm')} disabled={!canReview} className="mt-2">Review</PrimaryButton>
      </div>
    </div>
  );
}

// ---------- TranxactPay ----------
function TranxactPayScreen({ onClose, username }) {
  const [tab, setTab] = useState('getpaid'); // getpaid | tip | payments

  const [links, setLinks] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('fixed');
  const [newAmount, setNewAmount] = useState('');
  const [createError, setCreateError] = useState('');
  const [justCreated, setJustCreated] = useState(null);

  const [tipLink, setTipLink] = useState(undefined); // undefined = loading, null = none yet
  const [tipCreating, setTipCreating] = useState(false);

  const [payments, setPayments] = useState(null);
  const [copied, setCopied] = useState('');
  const [viewingQr, setViewingQr] = useState(null); // slug of the link whose QR is expanded
  const [viewingEmbed, setViewingEmbed] = useState(null); // slug of the link whose embed snippet is expanded

  const loadLinks = async () => {
    try {
      const data = await getMyPaymentLinks();
      setLinks(data);
      const tip = data.find(l => l.is_tip);
      setTipLink(tip || null);
    } catch {
      setLinks([]);
      setTipLink(null);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await getMyTranxactPayments();
      setPayments(data);
    } catch {
      setPayments([]);
    }
  };

  useEffect(() => { loadLinks(); loadPayments(); }, []);

  const handleCreate = async () => {
    setCreateError('');
    if (!newTitle.trim()) { setCreateError('Give it a title'); return; }
    setCreating(true);
    try {
      const res = await createPaymentLink({
        title: newTitle,
        link_type: newType,
        amount: newType === 'fixed' ? Number(newAmount) : undefined,
      });
      setJustCreated(res);
      setNewTitle('');
      setNewAmount('');
      loadLinks();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const ensureTipLink = async () => {
    setTipCreating(true);
    try {
      const res = await createPaymentLink({ title: 'Tip Me', link_type: 'flexible', is_tip: true });
      setTipLink({ slug: res.slug, title: 'Tip Me', link_type: 'flexible', is_tip: true, status: 'active' });
    } catch {
      // leave as null, tab will show a retry state implicitly
    } finally {
      setTipCreating(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const share = async (url, title) => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      copy(url, url);
    }
  };

  const totalReceived = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  const LinkCard = ({ link }) => {
    const url = `https://app.tranxact.co/pay/${link.slug}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
    const showingQr = viewingQr === link.slug;
    const showingEmbed = viewingEmbed === link.slug;
    const embedCode = `<a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#111;color:#fff;padding:12px 20px;border-radius:12px;font-family:-apple-system,sans-serif;font-weight:600;font-size:14px;text-decoration:none;">
  <img src="https://app.tranxact.co/icon-192.png" alt="" style="width:20px;height:20px;border-radius:4px;" />
  Pay with Tranxact
</a>`;
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{link.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${link.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>{link.status}</span>
        </div>
        <div className="text-xs text-neutral-500 mb-3 font-mono">{link.link_type === 'fixed' ? fmtNaira(link.amount) : 'Flexible amount'}</div>

        {showingQr && (
          <div className="flex flex-col items-center bg-neutral-950 border border-neutral-800 rounded-lg p-4 mb-3">
            <div className="bg-white rounded-lg p-2 mb-3"><BrandedQR data={url} size={144} /></div>
            <div className="text-violet-400 text-xs font-mono break-all text-center">{url.replace('https://', '')}</div>
          </div>
        )}

        {showingEmbed && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-3">
            <p className="text-xs text-neutral-500 mb-2">Paste this into your site's HTML. It'll render as a real button linking to this checkout.</p>
            <pre className="text-[11px] text-violet-300 font-mono whitespace-pre-wrap break-all bg-black/40 rounded-lg p-2 mb-2">{embedCode}</pre>
            <button onClick={() => copy(embedCode, `embed-${link.slug}`)} className="w-full flex items-center justify-center gap-1.5 bg-neutral-800 rounded-lg py-2 text-xs">
              {copied === `embed-${link.slug}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === `embed-${link.slug}` ? 'Copied' : 'Copy code'}
            </button>
          </div>
        )}

        <div className={`grid gap-2 ${link.status === 'active' ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {link.status === 'active' && (
            <button onClick={() => setViewingQr(showingQr ? null : link.slug)} className="flex items-center justify-center gap-1.5 bg-neutral-800 rounded-lg py-2 text-xs">
              <QrCode className="w-3.5 h-3.5" /> QR
            </button>
          )}
          <button onClick={() => setViewingEmbed(showingEmbed ? null : link.slug)} className="flex items-center justify-center gap-1.5 bg-neutral-800 rounded-lg py-2 text-xs">
            <Link2 className="w-3.5 h-3.5" /> Embed
          </button>
          <button onClick={() => copy(url, link.slug)} className="flex items-center justify-center gap-1.5 bg-neutral-800 rounded-lg py-2 text-xs">
            {copied === link.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === link.slug ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => share(url, link.title)} className="flex items-center justify-center gap-1.5 bg-neutral-800 rounded-lg py-2 text-xs">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>

        {showingQr && (
          <a href={qrUrl} download={`${link.slug}-qr.png`} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg py-2 text-xs text-neutral-400">
            <ArrowDownToLine className="w-3.5 h-3.5" /> Download QR
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">TranxactPay</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <TabToggle
          value={tab}
          onChange={setTab}
          options={[
            { value: 'getpaid', label: 'Get Paid' },
            { value: 'tip', label: 'Tip Me' },
            { value: 'payments', label: 'Payments' },
          ]}
        />

        {tab === 'getpaid' && (
          <div className="space-y-5">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
              <Field label="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What's this for?" />
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setNewType('fixed')} className={`rounded-xl py-2.5 text-xs font-medium border transition ${newType === 'fixed' ? 'bg-white text-black border-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}>Fixed amount</button>
                <button onClick={() => setNewType('flexible')} className={`rounded-xl py-2.5 text-xs font-medium border transition ${newType === 'flexible' ? 'bg-white text-black border-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}>Flexible amount</button>
              </div>
              {newType === 'fixed' && <Field label="Amount (NGN)" type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0.00" />}
              {createError && <p className="text-sm text-red-400">{createError}</p>}
              <PrimaryButton onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
              </PrimaryButton>
            </div>

            {justCreated && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
                <div className="bg-white rounded-lg p-1.5 mb-3 inline-block"><BrandedQR data={justCreated.url} size={112} /></div>
                <div className="text-violet-300 text-xs font-mono break-all mb-3">{justCreated.url}</div>
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton onClick={() => copy(justCreated.url, 'new')}>
                    {copied === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'new' ? 'Copied' : 'Copy'}
                  </GhostButton>
                  <GhostButton onClick={() => share(justCreated.url, 'Payment link')}><Share2 className="w-4 h-4" /> Share</GhostButton>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-3">Your Links</h4>
              {links === null ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
              ) : links.filter(l => !l.is_tip).length === 0 ? (
                <p className="text-sm text-neutral-500">No links yet.</p>
              ) : (
                <div className="space-y-2">
                  {links.filter(l => !l.is_tip).map(l => <LinkCard key={l.id} link={l} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'tip' && (
          <div>
            {tipLink === undefined ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
            ) : tipLink === null ? (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-500 mb-4">No setup needed. One tap creates your permanent tip link.</p>
                <PrimaryButton onClick={ensureTipLink} disabled={tipCreating}>
                  {tipCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create My Tip Link'}
                </PrimaryButton>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center">
                <div className="bg-white rounded-lg p-2 mb-4 inline-block"><BrandedQR data={`https://app.tranxact.co/pay/${tipLink.slug}`} size={128} /></div>
                <div className="text-violet-400 text-xs font-mono break-all mb-4">{`app.tranxact.co/pay/${tipLink.slug}`}</div>
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton onClick={() => copy(`https://app.tranxact.co/pay/${tipLink.slug}`, 'tip')}>
                    {copied === 'tip' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'tip' ? 'Copied' : 'Copy'}
                  </GhostButton>
                  <GhostButton onClick={() => share(`https://app.tranxact.co/pay/${tipLink.slug}`, 'Tip me on Tranxact')}><Share2 className="w-4 h-4" /> Share</GhostButton>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-center mb-5">
              <div className="text-xs text-neutral-500 mb-1">Total Received</div>
              <div className="font-mono text-2xl font-bold">{fmtNaira(totalReceived)}</div>
            </div>
            {payments === null ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-6">No payments yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{p.link_title || 'Payment'}</div>
                      <div className="text-xs text-neutral-500">{new Date(normalizeTimestamp(p.created_at)).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-emerald-400">+{fmtNaira(p.amount)}</div>
                      <div className="text-xs text-neutral-600 capitalize">{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Rates ----------
function RatesScreen({ onBack }) {
  const [tab, setTab] = useState('rates');
  const [rates, setRates] = useState(null);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [calcAsset, setCalcAsset] = useState('USDT');
  const [calcAmount, setCalcAmount] = useState('');

  const FEE_PCT = 0.7; // matches the platform's real crypto funding fee

  const fetchRates = async () => {
    const { data, error: err } = await supabase.rpc('get_public_rates');
    if (err) { setError(err.message); return; }
    setRates(data || []);
    setFetchedAt(Date.now());
    setError('');
  };

  useEffect(() => {
    fetchRates();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!rates || !fetchedAt) return;
    const elapsed = Math.floor((now - fetchedAt) / 1000);
    if (rates[0] && rates[0].seconds_until_next_update - elapsed <= 0) fetchRates();
  }, [now, rates, fetchedAt]);

  const fmtCountdown = (secondsLeft) => {
    const s = Math.max(0, secondsLeft);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const elapsed = fetchedAt ? Math.floor((now - fetchedAt) / 1000) : 0;
  const secondsLeft = rates && rates[0] ? rates[0].seconds_until_next_update - elapsed : 0;

  const selectedRate = rates?.find(r => r.coin === calcAsset);
  const amountUsd = parseFloat(calcAmount) || 0;
  const feeUsd = amountUsd * (FEE_PCT / 100);
  const nairaReceived = selectedRate ? (amountUsd - feeUsd) * Number(selectedRate.effective_rate) : 0;

  return (
    <div>
      <BackHeader title="Rates" onBack={onBack} />

      <TabToggle
        value={tab}
        onChange={setTab}
        options={[{ value: 'rates', label: 'Rates' }, { value: 'calculator', label: 'Calculator' }]}
      />

      <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl py-5 text-center mb-5">
        <div className="text-xs text-violet-300 mb-1">Rate refreshes in</div>
        <div className="font-mono text-3xl font-bold text-violet-100">{fmtCountdown(secondsLeft)}</div>
      </div>

      {rates === null && !error && (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {rates && tab === 'rates' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
          {rates.map(r => {
            const asset = ASSETS.find(a => a.symbol === r.coin);
            return (
              <div key={r.coin} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={r.coin} size={36} />
                  <div>
                    <div className="text-sm font-medium">{r.coin}</div>
                    <div className="text-xs text-neutral-500">{asset?.name || r.coin}</div>
                  </div>
                </div>
                <div className="font-mono text-sm">$1 = ₦{Number(r.effective_rate).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}

      {rates && tab === 'calculator' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
            <div className="text-xs text-neutral-500 mb-2">You send (USD)</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 w-full">
                <span className="text-2xl font-mono font-semibold text-neutral-500">$</span>
                <input
                  type="number"
                  value={calcAmount}
                  onChange={e => setCalcAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent text-2xl font-mono font-semibold outline-none w-full text-white placeholder-neutral-700"
                />
              </div>
              <select
                value={calcAsset}
                onChange={e => setCalcAsset(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-2 text-sm flex-shrink-0"
              >
                {rates.map(r => <option key={r.coin} value={r.coin} className="bg-neutral-900">{r.coin}</option>)}
              </select>
            </div>
            <p className="text-xs text-neutral-600 mt-2">Paid in {calcAsset}</p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Exchange Rate</span>
              <span className="font-mono">$1 = ₦{selectedRate ? Number(selectedRate.effective_rate).toLocaleString() : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Fee</span>
              <span className="font-mono">{FEE_PCT}% = ${feeUsd.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
            <div className="text-xs text-neutral-500 mb-2">You receive</div>
            <div className="font-mono text-2xl font-semibold">
              ₦{nairaReceived.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Crypto ----------
function CryptoScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Crypto</h1>
        <p className="text-sm text-neutral-500">We don't hold crypto. Payments you receive are converted to naira automatically at the current rate.</p>
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-1">Supported Cryptos</h2>
        <p className="text-xs text-neutral-600 mb-3">Tap a coin to get your receiving address.</p>
        <CryptoReceivePanel />
      </div>
    </div>
  );
}

// ---------- Cards ----------
function CardsScreen({ fullName = '' }) {
  const CARD_IMG_B64 = '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';
  return (
    <div className="pt-4">
      <h1 className="text-xl font-bold mb-6">Cards</h1>
      <div className="flex justify-center mb-2">
        <span className="text-[10px] font-semibold bg-black border border-neutral-800 text-white px-2.5 py-1 rounded-full">
          Coming Soon
        </span>
      </div>
      <div className="max-w-sm mx-auto rounded-2xl overflow-hidden">
        <img
          src={`data:image/jpeg;base64,${CARD_IMG_B64}`}
          alt="Tranxact Virtual Debit card, coming soon"
          className="w-full h-auto block"
        />
      </div>
      <p className="text-sm text-neutral-400 text-center mt-8 max-w-xs mx-auto">
        Your Tranxact card is on its way: clean, fast, and ready to tap wherever cards are accepted.
      </p>
      <p className="text-xs text-neutral-600 text-center mt-2 max-w-xs mx-auto">
        Spend straight from your Tranxact balance. No top-up delays, no separate account. Just your money, ready when you need it.
      </p>
    </div>
  );
}

// ---------- Profile ----------
// ---------- Admin ----------
function AdminScreen() {
  const [adminTab, setAdminTab] = useState('overview');
  const [searchUsername, setSearchUsername] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [settleType, setSettleType] = useState('crypto_deposit');
  const [cryptoAsset, setCryptoAsset] = useState('ETH');
  const [amountUsd, setAmountUsd] = useState('');
  const [bankAmount, setBankAmount] = useState('');
  const [description, setDescription] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [settleSuccess, setSettleSuccess] = useState(null);
  const [rates, setRates] = useState(null);

  // TranxactPay is settled separately from normal wallet funding — its own
  // section, its own form, matched against a specific payment link.
  const [tpMethod, setTpMethod] = useState('crypto_deposit');
  const [tpLinkSlug, setTpLinkSlug] = useState('');
  const [tpCryptoAsset, setTpCryptoAsset] = useState('ETH');
  const [tpAmountUsd, setTpAmountUsd] = useState('');
  const [tpBankAmount, setTpBankAmount] = useState('');
  const [tpLoading, setTpLoading] = useState(false);
  const [tpError, setTpError] = useState('');
  const [tpSuccess, setTpSuccess] = useState(null);
  const [pendingNotices, setPendingNotices] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(null);
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState(null);
  const [salesLeads, setSalesLeads] = useState(null);
  const [leadActionLoading, setLeadActionLoading] = useState(null);
  const [currentRates, setCurrentRates] = useState(null);
  const [baseRateInput, setBaseRateInput] = useState('');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState('');
  const [rateSaved, setRateSaved] = useState(false);
  const [spreadInputs, setSpreadInputs] = useState({});
  const [spreadSaving, setSpreadSaving] = useState(null);
  const [spreadError, setSpreadError] = useState('');
  const [pkUsername, setPkUsername] = useState('');
  const [pkAsset, setPkAsset] = useState('BTC');
  const [pkConfirming, setPkConfirming] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);
  const [pkResult, setPkResult] = useState(null);
  const [pkError, setPkError] = useState('');
  const [swUsername, setSwUsername] = useState('');
  const [swAsset, setSwAsset] = useState('ETH');
  const [swNetwork, setSwNetwork] = useState('ERC20');
  const [swChecking, setSwChecking] = useState(false);
  const [swResult, setSwResult] = useState(null);
  const [swError, setSwError] = useState('');
  const [swConfirmingSweep, setSwConfirmingSweep] = useState(false);
  const [swSweeping, setSwSweeping] = useState(false);
  const [swSweepResult, setSwSweepResult] = useState(null);
  const [trUsername, setTrUsername] = useState('');
  const [trAsset, setTrAsset] = useState('TRX');
  const [trChecking, setTrChecking] = useState(false);
  const [trResult, setTrResult] = useState(null);
  const [trError, setTrError] = useState('');
  const [trSweeping, setTrSweeping] = useState(false);
  const [trConfirmingSweep, setTrConfirmingSweep] = useState(false);
  const [btcUsername, setBtcUsername] = useState('');
  const [btcChecking, setBtcChecking] = useState(false);
  const [btcResult, setBtcResult] = useState(null);
  const [btcError, setBtcError] = useState('');
  const [solUsername, setSolUsername] = useState('');
  const [solAsset, setSolAsset] = useState('SOL');
  const [solChecking, setSolChecking] = useState(false);
  const [solResult, setSolResult] = useState(null);
  const [solError, setSolError] = useState('');

  const loadStats = async () => {
    try {
      setStats(await adminGetOverviewStats());
    } catch {
      setStats(null);
    }
  };

  const loadCurrentRates = async () => {
    try {
      const res = await adminGetCurrentRates();
      setCurrentRates(res);
      setBaseRateInput(res.base_rate != null ? String(res.base_rate) : '');
      const initialSpreads = {};
      (res.assets || []).forEach(a => { initialSpreads[a.symbol] = String(a.spread_percentage); });
      setSpreadInputs(initialSpreads);
    } catch {
      setCurrentRates(null);
    }
  };

  const saveBaseRate = async () => {
    setRateError('');
    setRateSaved(false);
    setRateSaving(true);
    try {
      await adminUpdateBaseRate(Number(baseRateInput));
      setRateSaved(true);
      loadCurrentRates();
    } catch (e) {
      setRateError(e.message);
    } finally {
      setRateSaving(false);
    }
  };

  const saveSpread = async (symbol) => {
    setSpreadError('');
    setSpreadSaving(symbol);
    try {
      await adminUpdateSpread(symbol, Number(spreadInputs[symbol]));
      loadCurrentRates();
    } catch (e) {
      setSpreadError(e.message);
    } finally {
      setSpreadSaving(null);
    }
  };

  const revealPrivateKey = async () => {
    setPkError('');
    setPkResult(null);
    setPkLoading(true);
    try {
      const res = await adminRevealPrivateKey(pkUsername.trim().toLowerCase().replace(/^@/, ''), pkAsset);
      setPkResult(res);
    } catch (e) {
      setPkError(e.message);
    } finally {
      setPkLoading(false);
      setPkConfirming(false);
    }
  };

  const checkEvmBalance = async () => {
    setSwError('');
    setSwResult(null);
    setSwSweepResult(null);
    setSwConfirmingSweep(false);
    setSwChecking(true);
    try {
      const res = await adminSweepEvm('check_balance', swUsername.trim().toLowerCase().replace(/^@/, ''), swAsset, swNetwork);
      setSwResult(res);
    } catch (e) {
      setSwError(e.message);
    } finally {
      setSwChecking(false);
    }
  };

  const executeSweep = async () => {
    setSwError('');
    setSwSweeping(true);
    try {
      const res = await adminSweepEvm('sweep', swUsername.trim().toLowerCase().replace(/^@/, ''), swAsset, swNetwork);
      setSwSweepResult(res);
    } catch (e) {
      setSwError(e.message);
    } finally {
      setSwSweeping(false);
      setSwConfirmingSweep(false);
    }
  };

  const checkTronBalance = async () => {
    setTrError('');
    setTrResult(null);
    setTrConfirmingSweep(false);
    setTrChecking(true);
    try {
      const res = await adminCheckTronBalance(trUsername.trim().toLowerCase().replace(/^@/, ''), trAsset);
      setTrResult(res);
    } catch (e) {
      setTrError(e.message);
    } finally {
      setTrChecking(false);
    }
  };

  const executeTronSweep = async () => {
    setTrError('');
    setTrSweeping(true);
    try {
      const res = await adminSweepTron('sweep', trUsername.trim().toLowerCase().replace(/^@/, ''), trAsset);
      setTrResult({ ...trResult, swept: true, tx_hash: res.tx_hash, swept_amount: res.amount });
      setTrConfirmingSweep(false);
    } catch (e) {
      setTrError(e.message);
    } finally {
      setTrSweeping(false);
    }
  };

  const checkBtcBalance = async () => {
    setBtcError('');
    setBtcResult(null);
    setBtcChecking(true);
    try {
      const res = await adminCheckBtcBalance(btcUsername.trim().toLowerCase().replace(/^@/, ''));
      setBtcResult(res);
    } catch (e) {
      setBtcError(e.message);
    } finally {
      setBtcChecking(false);
    }
  };

  const checkSolBalance = async () => {
    setSolError('');
    setSolResult(null);
    setSolChecking(true);
    try {
      const res = await adminCheckSolBalance(solUsername.trim().toLowerCase().replace(/^@/, ''), solAsset);
      setSolResult(res);
    } catch (e) {
      setSolError(e.message);
    } finally {
      setSolChecking(false);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await adminListPendingWithdrawals();
      setPendingWithdrawals(res.requests || []);
    } catch {
      setPendingWithdrawals([]);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    setWithdrawalActionLoading(id);
    try {
      await adminApproveWithdrawal(id);
      loadWithdrawals();
      loadStats();
    } finally {
      setWithdrawalActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (id) => {
    setWithdrawalActionLoading(id);
    try {
      await adminRejectWithdrawal(id);
      loadWithdrawals();
      loadStats();
    } finally {
      setWithdrawalActionLoading(null);
    }
  };

  const loadSalesLeads = async () => {
    try {
      const res = await adminListSalesLeads();
      setSalesLeads(res.leads || []);
    } catch {
      setSalesLeads([]);
    }
  };

  const handleUpdateLeadStatus = async (id, status) => {
    setLeadActionLoading(id);
    try {
      await adminUpdateLeadStatus(id, status);
      loadSalesLeads();
    } finally {
      setLeadActionLoading(null);
    }
  };

  const [settlements, setSettlements] = useState(null);
  const [showAllSettlements, setShowAllSettlements] = useState(false);

  const loadNotices = async () => {
    try {
      const res = await adminListPaymentNotices();
      setPendingNotices(res.notices || []);
    } catch {
      setPendingNotices([]);
    }
  };

  const loadSettlements = async () => {
    try {
      const res = await adminRecentSettlements();
      setSettlements(res.settlements || []);
    } catch {
      setSettlements([]);
    }
  };

  useEffect(() => {
    loadSettlements();
    loadNotices();
    loadStats();
    loadWithdrawals();
    loadSalesLeads();
    loadCurrentRates();
    supabase.rpc('get_public_rates').then(({ data }) => setRates(data || []));
  }, []);

  const handleLookup = async () => {
    if (!searchUsername.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await adminLookupUser(searchUsername);
      setLookupResult(res);
    } catch (e) {
      setLookupError(e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSettle = async () => {
    setSettleError('');
    setSettleSuccess(null);
    setSettleLoading(true);
    try {
      const payload = {
        type: settleType,
        target_username: lookupResult?.username || searchUsername,
        description: description || undefined,
      };
      if (settleType === 'crypto_deposit') {
        payload.crypto_asset = cryptoAsset;
        payload.amount_usd = Number(amountUsd);
      } else {
        payload.amount_ngn = Number(bankAmount);
      }
      const res = await adminSettle(payload);
      setSettleSuccess(res);
      setAmountUsd('');
      setBankAmount('');
      setDescription('');
      handleLookup();
      loadSettlements();
      loadStats();
    } catch (e) {
      setSettleError(e.message);
    } finally {
      setSettleLoading(false);
    }
  };

  const canSettle = Boolean(lookupResult?.username || searchUsername.trim());

  const handleTpSettle = async () => {
    setTpError('');
    setTpSuccess(null);
    if (!tpLinkSlug.trim()) { setTpError('Enter the payment link slug'); return; }
    setTpLoading(true);
    try {
      const payload = { type: tpMethod, link_slug: tpLinkSlug.trim() };
      if (tpMethod === 'crypto_deposit') {
        payload.crypto_asset = tpCryptoAsset;
        payload.amount_usd = Number(tpAmountUsd);
      } else {
        payload.amount_ngn = Number(tpBankAmount);
      }
      const res = await adminSettle(payload);
      setTpSuccess(res);
      setTpAmountUsd('');
      setTpBankAmount('');
      setTpLinkSlug('');
      loadNotices();
      loadSettlements();
      loadStats();
    } catch (e) {
      setTpError(e.message);
    } finally {
      setTpLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Admin</h1>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'payment', label: 'Payment Settling' },
          { key: 'crypto', label: 'Crypto Settling' },
          { key: 'sweeping', label: 'Sweeping' },
          { key: 'transactions', label: 'Transactions' },
          { key: 'other', label: 'Other' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setAdminTab(t.key)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${adminTab === t.key ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {adminTab === 'overview' && (
      <>
      {stats && (
        <div>
          <h2 className="text-xs text-neutral-500 mb-2">Overview</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Total Users</div>
              <div className="font-mono text-lg font-bold">{stats.user_count}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Settled Volume</div>
              <div className="font-mono text-lg font-bold">{fmtNaira(stats.total_volume_settled)}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Settled</div>
              <div className="font-mono text-lg font-bold text-emerald-400">{stats.transaction_status_counts?.settled || 0}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Pending</div>
              <div className="font-mono text-lg font-bold text-amber-400">{stats.transaction_status_counts?.pending || 0}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Awaiting Confirmation</div>
              <div className="font-mono text-lg font-bold text-violet-400">{stats.pending_payment_notices}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Pending Withdrawals</div>
              <div className="font-mono text-lg font-bold text-amber-400">{stats.pending_withdrawals}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Spread Earned</div>
              <div className="font-mono text-lg font-bold">{fmtNaira(stats.total_spread_earned)}</div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500">Fees Earned</div>
              <div className="font-mono text-lg font-bold">{fmtNaira(stats.total_fees_earned)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
        <div className="text-xs text-neutral-500 mb-2">Find user</div>
        <div className="flex gap-2">
          <input
            value={searchUsername}
            onChange={e => setSearchUsername(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
            placeholder="username"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm flex-1 outline-none text-white placeholder-neutral-600"
          />
          <button onClick={handleLookup} disabled={lookupLoading} className="bg-white text-black rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 flex-shrink-0">
            {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
          </button>
        </div>
        {lookupError && <p className="text-sm text-red-400 mt-3">{lookupError}</p>}
        {lookupResult && (
          <div className="mt-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">@{lookupResult.username}</span>
              <span className="font-mono text-sm">{fmtNaira(lookupResult.balance)}</span>
            </div>
            {lookupResult.recent_transactions?.length > 0 && (
              <div className="mt-3 space-y-2 pt-3 border-t border-neutral-800">
                {lookupResult.recent_transactions.map((t, i) => (
                  <div key={i} className="flex justify-between text-xs text-neutral-500">
                    <span>{t.type}{t.crypto_asset ? ` (${t.crypto_asset})` : ''}</span>
                    <span className={Number(t.amount) >= 0 ? 'text-emerald-400' : 'text-neutral-300'}>
                      {Number(t.amount) >= 0 ? '+' : ''}{fmtNaira(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {adminTab === 'crypto' && (
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
        <div className="text-xs text-neutral-500 mb-3">Settle Wallet Funding</div>
        <TabToggle
          value={settleType}
          onChange={setSettleType}
          options={[{ value: 'crypto_deposit', label: 'Crypto' }, { value: 'fund_bank', label: 'Bank' }]}
        />
        {settleType === 'crypto_deposit' ? (
          <div className="space-y-3">
            <select value={cryptoAsset} onChange={e => setCryptoAsset(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm w-full">
              {ASSETS.map(a => <option key={a.symbol} value={a.symbol} className="bg-neutral-900">{a.symbol}</option>)}
            </select>
            <div>
              <span className="text-sm text-neutral-400 mb-2 block">Amount received (USD)</span>
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <span className="text-neutral-500 font-mono">$</span>
                <input
                  type="number"
                  value={amountUsd}
                  onChange={e => setAmountUsd(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent outline-none text-white placeholder-neutral-600 text-sm w-full font-mono"
                />
              </div>
              <p className="text-xs text-neutral-600 mt-1.5">
                Enter the USD value of what was received, not the raw coin quantity. Most wallets/explorers show this directly.
              </p>
            </div>
            {(() => {
              const rateRow = rates?.find(r => r.coin === cryptoAsset);
              const usd = parseFloat(amountUsd) || 0;
              if (!rateRow || usd <= 0) return null;
              const gross = usd * Number(rateRow.effective_rate);
              const fee = gross * (CRYPTO_FUNDING_FEE_PCT / 100);
              const net = gross - fee;
              return (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-violet-300">
                    <span>Gross value</span>
                    <span className="font-mono">{fmtNaira(gross)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-violet-300">
                    <span>Fee ({CRYPTO_FUNDING_FEE_PCT}%)</span>
                    <span className="font-mono">-{fmtNaira(fee)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-violet-500/20">
                    <span className="text-xs text-violet-300">User receives</span>
                    <span className="font-mono text-xl font-bold text-violet-100">{fmtNaira(net)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Amount received (NGN)" type="number" value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="0.00" />
            {(() => {
              const gross = parseFloat(bankAmount) || 0;
              if (gross <= 0) return null;
              const net = gross - NAIRA_FUNDING_FEE_FLAT;
              return (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-violet-300">
                    <span>Fee (flat)</span>
                    <span className="font-mono">-{fmtNaira(NAIRA_FUNDING_FEE_FLAT)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-violet-500/20">
                    <span className="text-xs text-violet-300">User receives</span>
                    <span className="font-mono text-xl font-bold text-violet-100">{fmtNaira(net)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        <div className="mt-3">
          <Field label="Note (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. tx hash or reference" />
        </div>
        {settleError && <p className="text-sm text-red-400 mt-3">{settleError}</p>}
        {settleSuccess && (
          <p className="text-sm text-emerald-400 mt-3">
            ✓ Credited {fmtNaira(settleSuccess.net_ngn)} to @{settleSuccess.target_username}
            {settleSuccess.fee_ngn > 0 && <span className="text-neutral-500"> (fee: {fmtNaira(settleSuccess.fee_ngn)})</span>}
          </p>
        )}
        <PrimaryButton onClick={handleSettle} disabled={settleLoading || !canSettle} className="mt-4">
          {settleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Settle'}
        </PrimaryButton>
      </div>
      )}

      {adminTab === 'payment' && (
      <div className="bg-neutral-950 border border-violet-500/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-300 font-medium">TranxactPay Payments</span>
        </div>

        {pendingNotices === null ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-neutral-500" /></div>
        ) : pendingNotices.length > 0 ? (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-neutral-500 mb-1">Awaiting confirmation. Tap to pre-fill the claim below, verify against what actually arrived, then Settle</p>
            {pendingNotices.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  setTpLinkSlug(n.link_slug || '');
                  const method = n.method === 'crypto' ? 'crypto_deposit' : 'fund_bank';
                  setTpMethod(method);
                  if (method === 'crypto_deposit') {
                    if (n.crypto_asset) setTpCryptoAsset(n.crypto_asset);
                    const rateRow = rates?.find(r => r.coin === n.crypto_asset);
                    if (rateRow && n.claimed_amount) {
                      setTpAmountUsd((Number(n.claimed_amount) / Number(rateRow.effective_rate)).toFixed(2));
                    }
                  } else {
                    setTpBankAmount(n.claimed_amount ? String(n.claimed_amount) : '');
                  }
                }}
                className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-left hover:border-violet-500/40 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">{n.link_title || n.link_slug}</div>
                    {n.is_storefront && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 uppercase flex-shrink-0">
                        {n.cart_items?.length > 0 ? 'Cart' : n.product_type || 'Storefront'}
                      </span>
                    )}
                    {n.sold_out && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 uppercase flex-shrink-0">Sold out</span>
                    )}
                    {!n.sold_out && n.inventory !== null && n.inventory <= 5 && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase flex-shrink-0">{n.inventory} left</span>
                    )}
                  </div>
                  {n.cart_items?.length > 0 && (
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {n.cart_items.map((ci, i) => `${ci.title}${ci.quantity > 1 ? ` ×${ci.quantity}` : ''}`).join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-neutral-500 mt-0.5">@{n.creator_username} · {n.method}{n.crypto_asset ? ` (${n.crypto_asset})` : ''} · claims {n.claimed_amount ? fmtNaira(n.claimed_amount) : '—'}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-600 mb-4">No payments awaiting confirmation.</p>
        )}

        <div className="pt-3 border-t border-neutral-900 space-y-3">
          <Field label="Payment link slug" value={tpLinkSlug} onChange={e => setTpLinkSlug(e.target.value)} placeholder="e.g. testlink01" />
          <TabToggle
            value={tpMethod}
            onChange={setTpMethod}
            options={[{ value: 'crypto_deposit', label: 'Crypto' }, { value: 'fund_bank', label: 'Bank' }]}
          />
          {tpMethod === 'crypto_deposit' ? (
            <div className="space-y-3">
              <select value={tpCryptoAsset} onChange={e => setTpCryptoAsset(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm w-full">
                {ASSETS.map(a => <option key={a.symbol} value={a.symbol} className="bg-neutral-900">{a.symbol}</option>)}
              </select>
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <span className="text-neutral-500 font-mono">$</span>
                <input
                  type="number"
                  value={tpAmountUsd}
                  onChange={e => setTpAmountUsd(e.target.value)}
                  placeholder="Amount received (USD)"
                  className="bg-transparent outline-none text-white placeholder-neutral-600 text-sm w-full font-mono"
                />
              </div>
            </div>
          ) : (
            <Field label="Amount received (NGN)" type="number" value={tpBankAmount} onChange={e => setTpBankAmount(e.target.value)} placeholder="0.00" />
          )}
          {tpError && <p className="text-sm text-red-400">{tpError}</p>}
          {tpSuccess && (
            <div className="text-sm text-emerald-400">
              <p>✓ Credited {fmtNaira(tpSuccess.net_ngn)} to @{tpSuccess.target_username} via TranxactPay</p>
              {tpSuccess.fee_ngn > 0 && (
                <p className="text-xs text-neutral-500 mt-1">
                  Fee: {fmtNaira(tpSuccess.fee_ngn)}
                  {tpSuccess.flat_fee_ngn > 0 && ` (${fmtNaira(tpSuccess.percent_fee_ngn)} + ${fmtNaira(tpSuccess.flat_fee_ngn)} flat)`}
                </p>
              )}
              {tpSuccess.link_closed && <p className="text-xs text-neutral-500">Link closed. One-time payment settled</p>}
              {tpSuccess.order_numbers?.length > 0 && (
                <p className="text-xs text-neutral-500 mt-1">
                  Order{tpSuccess.order_numbers.length > 1 ? 's' : ''} created: {tpSuccess.order_numbers.join(', ')}
                  {tpSuccess.inventory_decremented && ' · Stock updated'}
                </p>
              )}
            </div>
          )}
          <PrimaryButton onClick={handleTpSettle} disabled={tpLoading}>
            {tpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Settle Payment'}
          </PrimaryButton>
        </div>
      </div>
      )}

      {adminTab === 'other' && (
      <>
      <div>
        <h2 className="text-sm font-semibold mb-3">Pending Withdrawals</h2>
        {pendingWithdrawals === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
        ) : pendingWithdrawals.length === 0 ? (
          <p className="text-sm text-neutral-500">No pending withdrawal requests.</p>
        ) : (
          <div className="space-y-2">
            {pendingWithdrawals.map(w => (
              <div key={w.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">@{w.username}</span>
                  <span className="font-mono text-sm">{fmtNaira(w.amount)}</span>
                </div>
                <div className="text-xs text-neutral-500 mb-3">{w.bank_name} · {w.account_number} · {w.account_name}</div>
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton onClick={() => handleRejectWithdrawal(w.id)} disabled={withdrawalActionLoading === w.id}>
                    {withdrawalActionLoading === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                  </GhostButton>
                  <button
                    onClick={() => handleApproveWithdrawal(w.id)}
                    disabled={withdrawalActionLoading === w.id}
                    className="bg-emerald-500 text-black font-semibold rounded-xl py-3 text-sm hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center"
                  >
                    {withdrawalActionLoading === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Paid'}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-600 mt-2">Approve only after you've actually sent this transfer.</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Sales Leads</h2>
        {salesLeads === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
        ) : salesLeads.length === 0 ? (
          <p className="text-sm text-neutral-500">No sales leads yet.</p>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
            {salesLeads.map(l => (
              <div key={l.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{l.name}</span>
                  <select
                    value={l.status}
                    onChange={e => handleUpdateLeadStatus(l.id, e.target.value)}
                    disabled={leadActionLoading === l.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-full px-2 py-1 text-xs text-neutral-300"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="text-xs text-neutral-500 mb-1">{l.email}</div>
                {l.message && <div className="text-xs text-neutral-600">{l.message}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Rate Settings</h2>
        {currentRates === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
        ) : (
          <>
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-3">
              <div className="text-xs text-neutral-500 mb-2">USD/NGN base rate</div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">₦</span>
                <input
                  type="number"
                  value={baseRateInput}
                  onChange={e => setBaseRateInput(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                />
                <button onClick={saveBaseRate} disabled={rateSaving} className="text-xs bg-violet-600 rounded-lg px-3 py-2 font-semibold disabled:opacity-50 flex-shrink-0">
                  {rateSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>
              {rateSaved && <p className="text-xs text-emerald-400 mt-2">Saved.</p>}
              {rateError && <p className="text-xs text-red-400 mt-2">{rateError}</p>}
              {currentRates.last_manual_update_at && (
                <p className="text-[11px] text-neutral-600 mt-2">
                  Last manually set {new Date(normalizeTimestamp(currentRates.last_manual_update_at)).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
              {(currentRates.assets || []).map(a => (
                <div key={a.symbol} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={a.symbol} size={28} />
                    <div>
                      <div className="text-sm font-medium">{a.symbol}</div>
                      <div className="text-[11px] text-neutral-600">Spread %</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={spreadInputs[a.symbol] ?? ''}
                      onChange={e => setSpreadInputs(prev => ({ ...prev, [a.symbol]: e.target.value }))}
                      className="w-20 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-sm text-right outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={() => saveSpread(a.symbol)}
                      disabled={spreadSaving === a.symbol}
                      className="text-xs bg-neutral-800 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
                    >
                      {spreadSaving === a.symbol ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {spreadError && <p className="text-xs text-red-400 mt-2">{spreadError}</p>}
          </>
        )}
      </div>
      </>
      )}

      {adminTab === 'sweeping' && (
      <>
      <div>
        <h2 className="text-sm font-semibold mb-1 text-amber-400">Reveal Deposit Private Key</h2>
        <p className="text-xs text-neutral-500 mb-3">Extremely sensitive: this returns a real key controlling real funds. The backend re-derives and verifies the address before returning anything.</p>
        <div className="bg-neutral-950 border border-amber-500/30 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              value={pkUsername}
              onChange={e => { setPkUsername(e.target.value); setPkResult(null); setPkError(''); }}
              placeholder="username"
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500"
            />
            <select
              value={pkAsset}
              onChange={e => { setPkAsset(e.target.value); setPkResult(null); setPkError(''); }}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white"
            >
              {ASSETS.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
            </select>
          </div>

          {!pkConfirming ? (
            <button
              onClick={() => setPkConfirming(true)}
              disabled={!pkUsername.trim()}
              className="w-full bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Reveal Private Key
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-300">This will display a real private key. Anyone who sees it can move the funds at that address. Continue?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPkConfirming(false)} className="bg-neutral-800 rounded-lg py-2.5 text-sm">Cancel</button>
                <button onClick={revealPrivateKey} disabled={pkLoading} className="bg-amber-500 text-black rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50">
                  {pkLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yes, reveal it'}
                </button>
              </div>
            </div>
          )}

          {pkError && <p className="text-xs text-red-400 mt-3">{pkError}</p>}

          {pkResult && (
            <div className="mt-3 bg-black/40 border border-amber-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Address verified, matches what's on record
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">Address</div>
                <div className="text-xs font-mono break-all">{pkResult.address}</div>
              </div>
              <div>
                <div className="text-[11px] text-neutral-500">Private key ({pkResult.key_format})</div>
                <div className="text-xs font-mono break-all text-amber-300">{pkResult.private_key}</div>
              </div>
              <div className="text-[11px] text-neutral-600">Derivation index {pkResult.derivation_index}</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-1">Sweep to Treasury (EVM only: ETH/BNB)</h2>
        <p className="text-xs text-neutral-500 mb-3">Checking a balance is read-only and safe. Sweeping broadcasts a real transaction. Bitcoin isn't supported here yet.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input
              value={swUsername}
              onChange={e => { setSwUsername(e.target.value); setSwResult(null); setSwSweepResult(null); setSwError(''); }}
              placeholder="username"
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />
            <select value={swAsset} onChange={e => { setSwAsset(e.target.value); setSwResult(null); setSwSweepResult(null); }} className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2.5 text-sm text-white">
              {['ETH', 'BNB', 'USDT', 'USDC'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={swNetwork} onChange={e => { setSwNetwork(e.target.value); setSwResult(null); setSwSweepResult(null); }} className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2.5 text-sm text-white">
              <option value="ERC20">ERC20</option>
              <option value="BEP20">BEP20</option>
            </select>
          </div>

          <button onClick={checkEvmBalance} disabled={swChecking || !swUsername.trim()} className="w-full bg-neutral-800 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40 mb-2">
            {swChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Check Balance (safe, read-only)'}
          </button>

          {swError && <p className="text-xs text-red-400 mt-2">{swError}</p>}

          {swResult && (
            <div className="mt-3 bg-black/40 border border-neutral-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] text-neutral-500">Address</div>
              <div className="text-xs font-mono break-all mb-2">{swResult.address}</div>
              {swResult.balance !== undefined ? (
                <>
                  <div className="text-xs">Balance: <span className="font-mono">{swResult.balance} {swResult.symbol}</span></div>
                  <div className="text-xs">Sweepable after gas: <span className="font-mono text-emerald-400">{swResult.sweepable} {swResult.symbol}</span></div>
                </>
              ) : (
                <>
                  <div className="text-xs">Token balance: <span className="font-mono">{swResult.token_balance} {swAsset}</span></div>
                  <div className="text-xs">Native gas available: <span className="font-mono">{swResult.native_gas_balance} {swResult.native_symbol}</span></div>
                </>
              )}

              {(() => {
                const sweepableAmount = swResult.balance !== undefined ? Number(swResult.sweepable) : Number(swResult.token_balance);
                if (!(sweepableAmount > 0)) {
                  return <p className="text-xs text-neutral-600 mt-3">Nothing to sweep, balance is zero.</p>;
                }
                return !swConfirmingSweep ? (
                  <button onClick={() => setSwConfirmingSweep(true)} className="w-full bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-lg py-2 text-xs font-semibold mt-3">
                    Sweep to Treasury
                  </button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-amber-300">This broadcasts a real transaction. Continue?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setSwConfirmingSweep(false)} className="bg-neutral-800 rounded-lg py-2 text-xs">Cancel</button>
                      <button onClick={executeSweep} disabled={swSweeping} className="bg-amber-500 text-black rounded-lg py-2 text-xs font-semibold disabled:opacity-50">
                        {swSweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Yes, sweep it'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {swSweepResult && (
            <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-400"><Check className="w-3.5 h-3.5" /> Swept</div>
              <div className="text-xs">Amount: <span className="font-mono">{swSweepResult.amount}</span></div>
              <div className="text-[11px] text-neutral-500 break-all">Tx: {swSweepResult.tx_hash}</div>
              {swSweepResult.gas_funding_tx_hash && <div className="text-[11px] text-neutral-500 break-all">Gas funding tx: {swSweepResult.gas_funding_tx_hash}</div>}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-1">Tron Sweep (TRX / USDT-TRC20)</h2>
        <p className="text-xs text-neutral-500 mb-3">USDT sweeps automatically fund the address with TRX first if it has none for energy.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              value={trUsername}
              onChange={e => { setTrUsername(e.target.value); setTrResult(null); setTrError(''); setTrConfirmingSweep(false); }}
              placeholder="username"
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />
            <select value={trAsset} onChange={e => { setTrAsset(e.target.value); setTrResult(null); setTrConfirmingSweep(false); }} className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2.5 text-sm text-white">
              <option value="TRX">TRX</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <button onClick={checkTronBalance} disabled={trChecking || !trUsername.trim()} className="w-full bg-neutral-800 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40">
            {trChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Check Balance'}
          </button>
          {trError && <p className="text-xs text-red-400 mt-2">{trError}</p>}
          {trResult && (
            <div className="mt-3 bg-black/40 border border-neutral-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] text-neutral-500">Address</div>
              <div className="text-xs font-mono break-all mb-2">{trResult.address}</div>
              {trResult.swept ? (
                <>
                  <div className="text-xs text-emerald-400">Swept {trResult.swept_amount} {trAsset}</div>
                  <div className="text-[11px] text-neutral-500 font-mono break-all mt-1">{trResult.tx_hash}</div>
                </>
              ) : (
                <>
                  <div className="text-xs">Balance: <span className="font-mono">{trResult.balance ?? trResult.token_balance} {trResult.asset}</span></div>
                  {trResult.sweepable !== undefined && <div className="text-xs">Sweepable: <span className="font-mono text-emerald-400">{trResult.sweepable} {trResult.asset}</span></div>}
                  {trResult.native_gas_balance !== undefined && <div className="text-xs text-neutral-500">TRX for energy: <span className="font-mono">{trResult.native_gas_balance}</span></div>}
                  {(() => {
                    const sweepableAmount = trResult.sweepable !== undefined ? Number(trResult.sweepable) : Number(trResult.token_balance);
                    if (!(sweepableAmount > 0)) {
                      return <p className="text-xs text-neutral-600 mt-3">Nothing to sweep, balance is zero.</p>;
                    }
                    return !trConfirmingSweep ? (
                      <button onClick={() => setTrConfirmingSweep(true)} className="w-full bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-lg py-2 text-xs font-semibold mt-3">
                        Sweep to Treasury
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-amber-300">This broadcasts a real transaction. Continue?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setTrConfirmingSweep(false)} className="bg-neutral-800 rounded-lg py-2 text-xs">Cancel</button>
                          <button onClick={executeTronSweep} disabled={trSweeping} className="bg-amber-500 text-black rounded-lg py-2 text-xs font-semibold disabled:opacity-50">
                            {trSweeping ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Yes, sweep it'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-1">Bitcoin Balance Check (read-only)</h2>
        <p className="text-xs text-neutral-500 mb-3">Confirms what's actually on a real BTC address. Sweeping isn't built for Bitcoin yet.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <input
            value={btcUsername}
            onChange={e => { setBtcUsername(e.target.value); setBtcResult(null); setBtcError(''); }}
            placeholder="username"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500 mb-3"
          />
          <button onClick={checkBtcBalance} disabled={btcChecking || !btcUsername.trim()} className="w-full bg-neutral-800 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40">
            {btcChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Check Balance'}
          </button>
          {btcError && <p className="text-xs text-red-400 mt-2">{btcError}</p>}
          {btcResult && (
            <div className="mt-3 bg-black/40 border border-neutral-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] text-neutral-500">Address</div>
              <div className="text-xs font-mono break-all mb-2">{btcResult.address}</div>
              <div className="text-xs">Confirmed: <span className="font-mono">{btcResult.confirmed_balance_btc} BTC</span></div>
              {Number(btcResult.unconfirmed_balance_btc) !== 0 && (
                <div className="text-xs">Unconfirmed: <span className="font-mono">{btcResult.unconfirmed_balance_btc} BTC</span></div>
              )}
              <div className="text-xs text-neutral-500">{btcResult.utxo_count} unspent output{btcResult.utxo_count === 1 ? '' : 's'}</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-1">Solana Balance Check (read-only)</h2>
        <p className="text-xs text-neutral-500 mb-3">SOL and USDT-SPL balance lookup. Sweeping isn't built for Solana yet.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              value={solUsername}
              onChange={e => { setSolUsername(e.target.value); setSolResult(null); setSolError(''); }}
              placeholder="username"
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-violet-500"
            />
            <select value={solAsset} onChange={e => { setSolAsset(e.target.value); setSolResult(null); }} className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2.5 text-sm text-white">
              <option value="SOL">SOL</option>
              <option value="USDT">USDT</option>
            </select>
          </div>
          <button onClick={checkSolBalance} disabled={solChecking || !solUsername.trim()} className="w-full bg-neutral-800 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-40">
            {solChecking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Check Balance'}
          </button>
          {solError && <p className="text-xs text-red-400 mt-2">{solError}</p>}
          {solResult && (
            <div className="mt-3 bg-black/40 border border-neutral-800 rounded-lg p-3 space-y-1.5">
              <div className="text-[11px] text-neutral-500">Address</div>
              <div className="text-xs font-mono break-all mb-2">{solResult.address}</div>
              <div className="text-xs">Balance: <span className="font-mono">{solResult.balance} {solResult.asset}</span></div>
              {solResult.asset === 'USDT' && solResult.has_token_account === false && (
                <div className="text-[11px] text-neutral-600">No USDT token account exists yet for this address.</div>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {adminTab === 'transactions' && (
      <div>
        <h2 className="text-sm font-semibold mb-3">Recent Settlements</h2>
        {settlements === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
        ) : settlements.length === 0 ? (
          <p className="text-sm text-neutral-500">No settlements yet.</p>
        ) : (
          <>
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
              {(showAllSettlements ? settlements : settlements.slice(0, 5)).map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">@{s.username}</div>
                    <div className="text-xs text-neutral-500">{s.type}{s.crypto_asset ? ` · ${s.crypto_asset}` : ''}</div>
                  </div>
                  <span className="font-mono text-sm">{fmtNaira(s.amount_ngn)}</span>
                </div>
              ))}
            </div>
            {settlements.length > 5 && (
              <button
                onClick={() => setShowAllSettlements(v => !v)}
                className="w-full text-center text-xs text-violet-400 hover:text-violet-300 transition mt-3 py-1"
              >
                {showAllSettlements ? 'Show less' : `See all (${settlements.length})`}
              </button>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

function AccountDetailsScreen({ onBack, profile, onUpdated }) {
  const [email, setEmail] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ''));
  }, []);

  const memberSince = profile?.created_at
    ? new Date(normalizeTimestamp(profile.created_at)).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : '—';

  const saveName = async () => {
    setNameError('');
    setSaving(true);
    try {
      await updateFullName(nameInput);
      setEditingName(false);
      onUpdated?.();
    } catch (e) {
      setNameError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { label: 'Username', value: profile?.username ? `@${profile.username}` : '—' },
    { label: 'Email', value: email || '—' },
    { label: 'Member since', value: memberSince },
  ];

  return (
    <div>
      <BackHeader title="Account Details" onBack={onBack} />
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Full name</span>
            {!editingName && (
              <button onClick={() => { setNameInput(profile?.full_name || ''); setEditingName(true); }} className="flex items-center gap-2">
                <span className="text-sm font-medium">{profile?.full_name || 'Add your name'}</span>
                <span className="text-xs text-violet-400">{profile?.full_name ? 'Edit' : 'Add'}</span>
              </button>
            )}
          </div>
          {editingName && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Your full name"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
              <button onClick={saveName} disabled={saving} className="text-xs bg-violet-600 rounded-lg px-3 py-2 font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setEditingName(false)} className="text-xs text-neutral-500 px-2">Cancel</button>
            </div>
          )}
          {nameError && <p className="text-xs text-red-400 mt-2">{nameError}</p>}
        </div>
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between px-4 py-4">
            <span className="text-sm text-neutral-500">{r.label}</span>
            <span className="text-sm font-medium">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsernameScreen({ onBack, currentUsername, onChanged }) {
  const [value, setValue] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await changeUsername(value);
      setSuccess(true);
      onChanged?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackHeader title="Username" onBack={onBack} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" value={value} onChange={e => setValue(e.target.value)} placeholder="username" />
        <p className="text-xs text-neutral-600">
          Once you change your username, no one else can ever claim your old one. It stays permanently reserved to you.
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">Username updated.</p>}
        <PrimaryButton type="submit" disabled={loading || !value.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </PrimaryButton>
      </form>
    </div>
  );
}

function SecurityScreen({ onBack }) {
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await updatePassword(newPassword);
      setPwSuccess(true);
      setNewPassword('');
    } catch (e) {
      setPwError(e.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handlePinChange = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess(false);
    setPinLoading(true);
    try {
      await setTransactionPin(pin);
      setPinSuccess(true);
      setPin('');
    } catch (e) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <BackHeader title="Security" onBack={onBack} />
      <form onSubmit={handlePasswordChange} className="space-y-4">
        <h2 className="text-sm font-semibold">Change password</h2>
        <Field label="New password" type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
        {pwError && <p className="text-sm text-red-400">{pwError}</p>}
        {pwSuccess && <p className="text-sm text-emerald-400">Password updated.</p>}
        <PrimaryButton type="submit" disabled={pwLoading || newPassword.length < 8}>
          {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
        </PrimaryButton>
      </form>

      <form onSubmit={handlePinChange} className="space-y-4 pt-6 border-t border-neutral-900">
        <h2 className="text-sm font-semibold">Transaction PIN</h2>
        <Field label="New PIN (4-6 digits)" type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••" />
        {pinError && <p className="text-sm text-red-400">{pinError}</p>}
        {pinSuccess && <p className="text-sm text-emerald-400">PIN set.</p>}
        <PrimaryButton type="submit" disabled={pinLoading || pin.length < 4}>
          {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set PIN'}
        </PrimaryButton>
      </form>
    </div>
  );
}

function SettingsScreen({ onBack, initialLimit, initialPushEnabled }) {
  const [limit, setLimit] = useState(initialLimit != null ? String(initialLimit) : '');
  const [limitLoading, setLimitLoading] = useState(false);
  const [limitSaved, setLimitSaved] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled || false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');

  const saveLimit = async () => {
    setLimitLoading(true);
    setLimitSaved(false);
    try {
      await updateSpendingLimit(limit ? Number(limit) : null);
      setLimitSaved(true);
    } finally {
      setLimitLoading(false);
    }
  };

  const togglePush = async () => {
    const next = !pushEnabled;
    setPushError('');
    setPushLoading(true);
    try {
      if (next) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
      await updatePushPreference(next);
      setPushEnabled(next);
    } catch (e) {
      setPushError(e.message);
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <BackHeader title="Settings" onBack={onBack} />
      <div>
        <h2 className="text-sm font-semibold mb-3">Daily spending limit</h2>
        <div className="flex gap-2">
          <Field label="Amount (NGN, optional)" type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="No limit set" />
        </div>
        <p className="text-xs text-neutral-600 mt-2">Applies to sends and withdrawals. Resets on a rolling 24-hour basis. Leave blank for no limit.</p>
        {limitSaved && <p className="text-sm text-emerald-400 mt-2">Saved.</p>}
        <PrimaryButton onClick={saveLimit} disabled={limitLoading} className="mt-4">
          {limitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save limit'}
        </PrimaryButton>
      </div>

      <div className="pt-6 border-t border-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Push notifications</div>
            <p className="text-xs text-neutral-600 mt-1">Get alerted the moment something happens to your account, even when the app is closed.</p>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading}
            className={`w-12 h-7 rounded-full flex-shrink-0 flex items-center transition-colors ${pushEnabled ? 'bg-violet-600 justify-end' : 'bg-neutral-800 justify-start'} px-1 disabled:opacity-50`}
          >
            <span className="w-5 h-5 rounded-full bg-white block" />
          </button>
        </div>
        {pushError && <p className="text-xs text-red-400 mt-2">{pushError}</p>}
      </div>
    </div>
  );
}

// ---------- Public checkout page (works for anyone, logged in or not) ----------
// ---------- Public checkout page (works for anyone, logged in or not) ----------

function CheckoutPage({ slug }) {
  const [link, setLink] = useState(undefined); // undefined = loading, null = not found
  const [error, setError] = useState('');
  const [flexAmount, setFlexAmount] = useState('');
  const [payTab, setPayTab] = useState('naira'); // naira | card | crypto
  const [cryptoAsset, setCryptoAsset] = useState(null);
  const [cryptoNetwork, setCryptoNetwork] = useState(null);
  const [coinPickerOpen, setCoinPickerOpen] = useState(false);
  const [rates, setRates] = useState(null);
  const [copied, setCopied] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [notice, setNotice] = useState(null);
  // Real customer details — a merchant genuinely can't fulfil an order
  // without knowing who it's from and how to reach them.
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  // §31 IDEMPOTENCY — one stable key per checkout session. A double-tap or a
  // refresh reuses it, so the backend returns the same notice instead of
  // creating a second one. Regenerated only after a genuine failure.
  const [idemKey, setIdemKey] = useState(() => `chk_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
  // §21 / §37 — real, specific failure states rather than one generic error.
  const [failureReason, setFailureReason] = useState('');
  // Business orders run as two real steps: details first, then payment.
  // Cramming both onto one screen made a long page and buried the payment
  // instructions below a form the customer hadn't filled yet.
  const [checkoutStep, setCheckoutStep] = useState('details');

  // A number typed while on one tab means a different currency on another —
  // reset on switch so it's never misread (e.g. a naira figure silently
  // treated as dollars after tapping into Crypto).
  useEffect(() => { setFlexAmount(''); }, [payTab]);

  useEffect(() => {
    getPublicPaymentLink(slug)
      .then(data => {
        setLink(data);
        const firstKey = data?.crypto_addresses ? Object.keys(data.crypto_addresses)[0] : null;
        if (firstKey) {
          const [symbol, network] = firstKey.split('-');
          setCryptoAsset(symbol);
          setCryptoNetwork(network);
        }
      })
      .catch(e => { setError(e.message); setLink(null); });
    supabase.rpc('get_public_rates').then(({ data }) => setRates(data || []));
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtCountdown = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  // For a flexible link, what the payer typed means something different
  // depending on which tab they're on: naira/card is NGN, crypto is a direct
  // USD entry (not a naira figure that then gets converted). Switching tabs
  // resets the field so a number typed in one currency can never be
  // misread as the other.
  const flexIsUsd = payTab === 'crypto';
  const amountNgn = link?.link_type === 'fixed'
    ? Number(link.amount)
    : (flexIsUsd ? 0 : (parseFloat(flexAmount) || 0));
  const rateRow = rates?.find(r => r.coin === cryptoAsset);
  // effective_rate is ₦ per $1, so this division gives the USD value — NOT a
  // crypto quantity. The actual coin amount needs a further division by that
  // coin's own USD market price.
  const usdAmount = link?.link_type === 'flexible' && flexIsUsd
    ? (parseFloat(flexAmount) || 0)
    : (rateRow && amountNgn > 0 ? amountNgn / Number(rateRow.effective_rate) : 0);
  const cryptoAmount = rateRow && rateRow.usd_market_price > 0 ? usdAmount / Number(rateRow.usd_market_price) : 0;
  // link.crypto_addresses is keyed "SYMBOL-NETWORK" (e.g. "USDT-TRC20") since
  // some coins exist on more than one network with genuinely different
  // addresses. Group into symbols for the primary picker, with networks
  // available as a sub-choice only when a symbol actually has more than one.
  const cryptoBySymbol = {};
  if (link?.crypto_addresses) {
    for (const key of Object.keys(link.crypto_addresses)) {
      const [symbol, network] = key.split('-');
      if (!cryptoBySymbol[symbol]) cryptoBySymbol[symbol] = [];
      cryptoBySymbol[symbol].push(network);
    }
  }
  const cryptoOptions = Object.keys(cryptoBySymbol);
  const networksForSelected = cryptoAsset ? (cryptoBySymbol[cryptoAsset] || []) : [];
  const selectedAddress = link?.crypto_addresses?.[`${cryptoAsset}-${cryptoNetwork}`];

  // Only real business storefront orders need customer details — tips and
  // plain payment links stay frictionless, exactly as before.
  const isBusinessOrder = Boolean(link?.business_name);
  // §7 — only a real delivery fulfilment needs an address. Falls back to
  // product_type for items created before fulfillment_type existed.
  const needsAddress = isBusinessOrder && (
    link?.fulfillment_type === 'delivery' ||
    (!link?.fulfillment_type || link?.fulfillment_type === 'none') && link?.product_type === 'product'
  );
  const custEmailValid = !custEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail.trim());
  // A real customer typed "gmail.con" and nothing caught it — the address
  // was syntactically valid, so the confirmation email would have silently
  // gone nowhere. Warn on the obvious near-misses without blocking, since
  // plenty of legitimate domains look unusual.
  const emailTypoHint = (() => {
    const e = custEmail.trim().toLowerCase();
    if (!e.includes('@')) return '';
    const domain = e.split('@')[1] || '';
    const corrections = {
      'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmial.com': 'gmail.com',
      'gmail.cm': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.comm': 'gmail.com',
      'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
      'hotmail.con': 'hotmail.com', 'outlook.con': 'outlook.com',
      'icloud.con': 'icloud.com',
    };
    return corrections[domain] ? `Did you mean ${e.split('@')[0]}@${corrections[domain]}?` : '';
  })();
  const custPhoneValid = !custPhone || /^0\d{10}$/.test(custPhone.replace(/\s/g, ''));
  const customerDetailsComplete = !isBusinessOrder || (
    custName.trim().length > 0 &&
    (custEmail.trim() || custPhone.trim()) &&
    custEmailValid && custPhoneValid &&
    (!needsAddress || custAddress.trim().length > 0)
  );

  const handleSent = async (method) => {
    setSendError('');
    setFailureReason('');
    setSending(true);
    try {
      const [res] = await Promise.all([
        notifyPaymentSent({
          slug, method,
          crypto_asset: method === 'crypto' ? cryptoAsset : undefined,
          claimed_amount: amountNgn || undefined,
          customer_name: isBusinessOrder ? custName.trim() : undefined,
          customer_email: isBusinessOrder && custEmail.trim() ? custEmail.trim() : undefined,
          customer_phone: isBusinessOrder && custPhone.trim() ? custPhone.trim() : undefined,
          delivery_address: needsAddress && custAddress.trim() ? custAddress.trim() : undefined,
          idempotency_key: idemKey,
        }),
        new Promise(r => setTimeout(r, 1100)), // brief, honest loading beat — not simulating a real check
      ]);
      setNotice(res);
    } catch (e) {
      setSendError(e.message);
      setFailureReason(e.reason || '');
      // A genuine failure means the attempt never landed — a fresh key lets
      // the customer retry cleanly without being blocked by the old one.
      setIdemKey(`chk_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-5 py-8" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between w-full max-w-sm mb-8">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="font-bold text-sm">Tranxact</span>
        </div>
      </div>

      {link === undefined && (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
      )}

      {link === null && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs">
          <p className="text-sm text-neutral-400">{error || 'This payment link could not be found.'}</p>
        </div>
      )}

      {link && link.status !== 'active' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
            <X className="w-5 h-5 text-neutral-500" />
          </div>
          <p className="text-sm text-neutral-400">This payment is no longer available.</p>
        </div>
      )}

      {link && link.status === 'active' && !notice && (
        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-neutral-900">
            {link.image_url ? (
              <img src={link.image_url} alt={link.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-violet-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">{link.is_tip ? 'Tipping' : 'Paying'} @{link.creator_username}</p>
              {link.title && <p className="font-semibold truncate">{link.title}</p>}
            </div>
          </div>

          <p className="text-xs text-neutral-500 mb-1.5">
            {link.is_tip ? 'Tip amount' : 'Amount due'}
            {link.link_type === 'flexible' ? (flexIsUsd ? ' (USD)' : ' (NGN)') : (payTab === 'crypto' ? ' (USD)' : '')}
          </p>
          {link.link_type === 'fixed' ? (
            <div className="font-mono text-3xl font-bold mb-5">
              {payTab === 'crypto' && rateRow ? `$${usdAmount.toFixed(2)}` : fmtNaira(link.amount)}
            </div>
          ) : (
            <div className="mb-5">
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <span className="text-neutral-500 font-mono text-xl">{flexIsUsd ? '$' : '₦'}</span>
                <input
                  type="number"
                  value={flexAmount}
                  onChange={e => setFlexAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent outline-none font-mono text-xl font-bold w-full text-white placeholder-neutral-700"
                />
              </div>
            </div>
          )}
          {link.description && <p className="text-xs text-neutral-500 mb-5 -mt-3">{link.description}</p>}

          {failureReason === 'business_paused' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-5">
              <div className="text-sm font-semibold text-amber-400 mb-1">Store unavailable</div>
              <p className="text-xs text-neutral-400">
                {link.business_name} isn't accepting orders right now. Your payment was not taken. Try again later, or contact them directly.
              </p>
            </div>
          )}
          {failureReason === 'sold_out' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-5">
              <div className="text-sm font-semibold text-red-400 mb-1">Just sold out</div>
              <p className="text-xs text-neutral-400">
                This item sold out before your order went through. Your payment was not taken.
              </p>
            </div>
          )}

          {isBusinessOrder && checkoutStep === 'details' && (
            <div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-4">
                <div className="text-xs font-semibold mb-1">Your details</div>
                <p className="text-[11px] text-neutral-500 mb-3">
                  So {link.business_name} can confirm your order and reach you about it.
                </p>
                <div className="space-y-2.5">
                  <input
                    value={custName}
                    onChange={e => setCustName(e.target.value)}
                    placeholder="Full name"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 placeholder-neutral-600"
                  />
                  <input
                    type="email"
                    inputMode="email"
                    value={custEmail}
                    onChange={e => setCustEmail(e.target.value)}
                    placeholder="Email"
                    className={`w-full bg-neutral-900 border rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder-neutral-600 ${custEmail && !custEmailValid ? 'border-red-500/50' : 'border-neutral-800 focus:border-violet-500'}`}
                  />
                  {emailTypoHint && (
                    <button
                      onClick={() => setCustEmail(emailTypoHint.replace(/^Did you mean /, '').replace(/\?$/, ''))}
                      className="w-full text-left text-[11px] text-amber-400 -mt-1 px-1"
                    >
                      {emailTypoHint} <span className="underline">Tap to fix</span>
                    </button>
                  )}
                  <input
                    inputMode="numeric"
                    value={custPhone}
                    onChange={e => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="Phone number"
                    className={`w-full bg-neutral-900 border rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder-neutral-600 ${custPhone && !custPhoneValid ? 'border-red-500/50' : 'border-neutral-800 focus:border-violet-500'}`}
                  />
                  {needsAddress && (
                    <textarea
                      value={custAddress}
                      onChange={e => setCustAddress(e.target.value)}
                      placeholder="Delivery address"
                      rows={2}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-500 placeholder-neutral-600 resize-none"
                    />
                  )}
                </div>
                {custEmail.trim() && (
                  <p className="text-[11px] text-neutral-600 mt-2.5">We'll email your receipt and order details here.</p>
                )}
                {!custEmail.trim() && !custPhone.trim() && (
                  <p className="text-[11px] text-neutral-600 mt-2.5">Add an email or phone number so they can reach you.</p>
                )}
              </div>
              <button
                onClick={() => setCheckoutStep('payment')}
                disabled={!customerDetailsComplete}
                className="w-full bg-white text-black rounded-xl py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to payment
              </button>
            </div>
          )}

          {(!isBusinessOrder || checkoutStep === 'payment') && (<>
          {isBusinessOrder && (
            <button
              onClick={() => setCheckoutStep('details')}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to your details
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 mb-5">
            <button onClick={() => setPayTab('naira')} className={`rounded-xl py-2.5 text-xs font-semibold transition ${payTab === 'naira' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}>Pay Naira</button>
            <button onClick={() => setPayTab('card')} className={`rounded-xl py-2.5 text-xs font-semibold transition ${payTab === 'card' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}>Pay Card</button>
            <button onClick={() => setPayTab('crypto')} className={`rounded-xl py-2.5 text-xs font-semibold transition ${payTab === 'crypto' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-400'}`}>Crypto</button>
          </div>

          {payTab === 'naira' && (
            <div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Bank</span><span className="font-medium">Moniepoint</span></div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-neutral-500">Account Number</span>
                  <button onClick={() => copy('6436425418', 'acct')} className="flex items-center gap-1.5 font-mono">
                    6436425418 {copied === 'acct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                  </button>
                </div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Account Name</span><span className="font-medium text-right">Tranxact Technologies Ltd</span></div>
                <div className="pt-3 border-t border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-1.5">Use this exact reference</p>
                  <button onClick={() => copy(link.bank_reference, 'ref')} className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5">
                    <span className="font-mono text-sm text-violet-400">{link.bank_reference}</span>
                    {copied === 'ref' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-500" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 mb-4">
                <Loader2 className="w-3 h-3" style={{ animation: 'none' }} /> Expires in {fmtCountdown(secondsLeft)}
              </div>
              {sendError && <p className="text-sm text-red-400 mb-3 text-center">{sendError}</p>}
              <PrimaryButton onClick={() => handleSent('bank')} disabled={sending || !customerDetailsComplete || (link.link_type === 'flexible' && amountNgn <= 0)}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've sent the payment"}
              </PrimaryButton>
            </div>
          )}

          {payTab === 'card' && (
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl p-4 overflow-hidden">
              <span className="absolute top-3 right-3 text-[10px] font-semibold bg-neutral-800 border border-neutral-700 text-neutral-400 px-2.5 py-1 rounded-full">Coming Soon</span>
              <div className="flex gap-2 mb-4 opacity-40 pointer-events-none">
                {['NGN', 'USD', 'EUR', 'GBP'].map(c => (
                  <span key={c} className="text-xs font-medium bg-neutral-950 border border-neutral-800 rounded-full px-3 py-1.5">{c}</span>
                ))}
              </div>
              <div className="space-y-2 opacity-40 pointer-events-none">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-600">Card number</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-600">MM/YY</div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-600">CVV</div>
                </div>
              </div>
              <p className="text-xs text-neutral-500 text-center mt-4">Card payments are on the way. Use Naira or Crypto for now.</p>
            </div>
          )}

          {payTab === 'crypto' && (
            <div>
              {cryptoOptions.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">No crypto option available for this link yet.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <button
                      onClick={() => setCoinPickerOpen(!coinPickerOpen)}
                      className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <CoinIcon symbol={cryptoAsset} size={24} />
                        <span className="text-sm font-medium">Pay with {cryptoAsset}</span>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`w-4 h-4 text-neutral-500 transition-transform ${coinPickerOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
                    </button>

                    {coinPickerOpen && (
                      <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 grid grid-cols-4 gap-2">
                        {cryptoOptions.map(symbol => (
                          <button
                            key={symbol}
                            onClick={() => { setCryptoAsset(symbol); setCryptoNetwork(cryptoBySymbol[symbol][0]); setCoinPickerOpen(false); }}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-lg transition ${cryptoAsset === symbol ? 'bg-white' : 'bg-neutral-950'}`}
                          >
                            <CoinIcon symbol={symbol} size={24} />
                            <span className={`text-xs font-medium ${cryptoAsset === symbol ? 'text-black' : 'text-neutral-400'}`}>{symbol}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {networksForSelected.length > 1 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {networksForSelected.map(net => (
                        <button
                          key={net}
                          onClick={() => setCryptoNetwork(net)}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${cryptoNetwork === net ? 'bg-violet-600 text-white border-violet-600' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
                        >
                          {NETWORK_DISPLAY_NAME[net] || net}
                        </button>
                      ))}
                    </div>
                  )}

                  {usdAmount > 0 && rateRow && (
                    <div className="text-center mb-4">
                      <div className="text-sm text-neutral-400">Send</div>
                      <div className="font-mono text-2xl font-bold">{cryptoAmount.toFixed(6)} {cryptoAsset}</div>
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
                    <span className="text-amber-400 text-sm flex-shrink-0">⚠️</span>
                    <p className="text-xs text-amber-300">Send only {cryptoAsset} on the {NETWORK_DISPLAY_NAME[cryptoNetwork] || cryptoNetwork || 'correct network'} to this address. Sending any other asset may result in permanent loss.</p>
                  </div>

                  <div className="flex flex-col items-center bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
                    <div className="bg-white rounded-lg p-2 mb-3"><BrandedQR data={selectedAddress} size={128} /></div>
                    <button onClick={() => copy(selectedAddress, 'crypto')} className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5">
                      <span className="font-mono text-xs text-neutral-300 break-all text-left">{selectedAddress}</span>
                      {copied === 'crypto' ? <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" /> : <Copy className="w-4 h-4 text-neutral-500 flex-shrink-0 ml-2" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 mb-4">
                    Expires in {fmtCountdown(secondsLeft)}
                  </div>

                  {sendError && <p className="text-sm text-red-400 mb-3 text-center">{sendError}</p>}
                  <PrimaryButton onClick={() => handleSent('crypto')} disabled={sending || !customerDetailsComplete}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've sent the payment"}
                  </PrimaryButton>
                </>
              )}
            </div>
          )}
          </>)}
        </div>
      )}

      {notice && link.business_name && (
        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Confirming your payment</h2>
          <p className="text-sm text-neutral-500 mb-4">
            {link.title} · {link.business_name}
          </p>
          <p className="text-xs text-neutral-600 font-mono mb-5">Ref: {notice.reference}</p>

          {custEmail.trim() ? (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 text-left mb-4">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-emerald-400 mb-1">We'll email you</div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Once your payment is confirmed, we'll send your order number, receipt, and a link to track it to <span className="text-neutral-300">{custEmail.trim()}</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-left mb-4">
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Your payment is being confirmed. {link.business_name} will be in touch about your order.
              </p>
            </div>
          )}

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-left mb-4">
            <div className="text-xs text-neutral-500 mb-2.5">Contact {link.business_name}</div>
            <div className="space-y-2">
              {link.business_contact_phone && (
                <a
                  href={`https://wa.me/${String(link.business_contact_phone).replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${link.business_name}, about my payment ${notice.reference} for ${link.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-white text-black rounded-xl py-2.5 text-sm font-semibold"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  Message on WhatsApp
                </a>
              )}
              {link.business_contact_email && (
                <a
                  href={`mailto:${link.business_contact_email}?subject=${encodeURIComponent(`Payment ${notice.reference} — ${link.title}`)}`}
                  className="flex items-center justify-center gap-2 w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 text-sm text-neutral-300"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  Send an email
                </a>
              )}
              {!link.business_contact_phone && !link.business_contact_email && (
                <p className="text-xs text-neutral-600">No contact details added by this business yet.</p>
              )}
            </div>
          </div>

          <a href={`https://business.tranxact.co/${link.business_slug}`} className="block w-full text-sm text-violet-400 hover:text-violet-300 transition py-2">
            Back to store
          </a>
        </div>
      )}

      {notice && !link.business_name && (
        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Payment noted</h2>
          <p className="text-sm text-neutral-500 mb-1">We're confirming this and will credit @{link.creator_username} shortly.</p>
          <p className="text-xs text-neutral-600 font-mono mt-4 mb-6">Ref: {notice.reference}</p>
          <a href="https://tranxact.co" className="block mb-3">
            <PrimaryButton onClick={() => {}}>Done</PrimaryButton>
          </a>
          <a href={`https://app.tranxact.co/?ref=${link.creator_username}`} className="block text-sm text-violet-400 hover:text-violet-300 transition py-2">
            New here? Join Tranxact →
          </a>
        </div>
      )}

      <p className="text-xs text-neutral-700 mt-8 flex items-center gap-1.5">
        <Lock className="w-3 h-3" /> Powered by Tranxact
      </p>
    </div>
  );
}

function VerificationModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold mb-1">You are verified</h2>
        <p className="text-sm text-neutral-500 mb-6">Your account is in good standing.</p>
        <PrimaryButton onClick={onClose}>Done</PrimaryButton>
      </div>
    </div>
  );
}

function SupportScreen({ onBack }) {
  const faqs = [
    { q: 'How do I fund my wallet?', a: 'Tap Fund Wallet on Home and send any supported crypto. It converts to naira automatically once confirmed.' },
    { q: 'Which crypto coins are supported?', a: 'ETH, BTC, BNB (BEP-20), USDT (TRC20), USDC (ERC-20), TRX, and SOL. Received crypto converts to naira automatically.' },
    { q: 'How long does a deposit take to reflect?', a: 'Usually a few minutes after the transfer or deposit is confirmed.' },
    { q: 'Is sending to a Tranxact user free?', a: 'Yes, transfers between Tranxact users have no fee.' },
  ];
  return (
    <div>
      <BackHeader title="Help & Support" onBack={onBack} />
      <a
        href="https://wa.me/2347058866702"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-4 mb-4 hover:bg-neutral-900 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center"><Smartphone className="w-4 h-4 text-emerald-400" /></div>
          <div>
            <div className="text-sm font-medium">Chat with us on WhatsApp</div>
            <div className="text-xs text-neutral-500">07058866702</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-600" />
      </a>
      <h2 className="text-sm font-semibold mb-3">Frequently asked questions</h2>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
        {faqs.map((f, i) => (
          <div key={i} className="px-4 py-4">
            <div className="text-sm font-medium mb-1">{f.q}</div>
            <div className="text-xs text-neutral-500">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen({ onLogout, onOpenRates, onOpenSupport, onOpenUsername, onOpenSecurity, onOpenSettings, onOpenAccountDetails }) {
  const [showVerification, setShowVerification] = useState(false);
  const items = [
    { label: 'Account details', icon: UserCircle, onClick: onOpenAccountDetails },
    { label: 'Username', icon: User, onClick: onOpenUsername },
    { label: 'Rates', icon: LineChart, onClick: onOpenRates },
    { label: 'Verification', icon: ShieldCheck, badge: 'Verified', onClick: () => setShowVerification(true) },
    { label: 'Security', icon: Lock, onClick: onOpenSecurity },
    { label: 'Settings', icon: Settings, onClick: onOpenSettings },
    { label: 'Help & Support', icon: Smartphone, onClick: onOpenSupport },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Profile</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900 mb-4">
        {items.map(it => (
          <button key={it.label} onClick={it.onClick} className="w-full flex items-center justify-between px-4 py-4 hover:bg-neutral-900 transition">
            <div className="flex items-center gap-3">
              <it.icon className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium">{it.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {it.badge && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{it.badge}</span>}
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </div>
          </button>
        ))}
      </div>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-400 text-sm font-medium py-3.5 hover:text-red-300 transition">
        <LogOut className="w-4 h-4" /> Log out
      </button>
      {showVerification && <VerificationModal onClose={() => setShowVerification(false)} />}
    </div>
  );
}

// ---------- Referrals ----------
function EarnScreen({ onEarnings, onLeaderboard, username, userId }) {
  const [copied, setCopied] = useState(false);
  const [pendingBalance, setPendingBalance] = useState(null);

  useEffect(() => {
    getReferralEarnings(userId).then(({ data }) => {
      const total = (data || []).filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0);
      setPendingBalance(total);
    });
  }, [userId]);
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Earn</h1>
      <p className="text-sm text-neutral-500 mb-5">Every way to make Tranxact pay you back.</p>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4 text-center">
        <p className="text-sm text-neutral-500 mb-2">Your referral code</p>
        <div className="font-mono text-2xl font-semibold mb-4">@{username || '—'}</div>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton onClick={() => { navigator.clipboard?.writeText(username || ''); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy code'}
          </GhostButton>
          <GhostButton
            onClick={async () => {
              const link = `${window.location.origin}/?ref=${username}`;
              if (navigator.share) {
                try { await navigator.share({ title: 'Join me on Tranxact', text: 'Sign up on Tranxact using my referral link:', url: link }); }
                catch { /* user cancelled share sheet, ignore */ }
              } else {
                navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            <Share2 className="w-4 h-4" /> Share
          </GhostButton>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <button onClick={onEarnings} className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-900 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><Wallet className="w-4 h-4 text-violet-400" /></div>
            <span className="text-sm font-medium">Referral Earnings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-neutral-400">{pendingBalance === null ? '···' : fmtNaira(pendingBalance)}</span>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </div>
        </button>
        <button onClick={onLeaderboard} className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-900 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><Trophy className="w-4 h-4 text-violet-400" /></div>
            <span className="text-sm font-medium">Leaderboard</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-600" />
        </button>
      </div>
      <p className="text-xs text-neutral-600 mb-6 text-center">
        You earn 25% of the crypto funding fee every time someone you referred receives crypto, and they get ₦1,000 on their first deposit of $25 or more.
      </p>

      {/* Genuinely not live yet — no rate has been decided, no backend
          crediting exists. Shown honestly as coming soon rather than as a
          working feature, so nobody expects cashback that isn't real yet. */}
      <div className="bg-neutral-950 border border-dashed border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-teal-500/15 flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4 text-teal-400" /></div>
          <span className="text-sm font-semibold">Cashback Rewards</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 ml-auto">Coming soon</span>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Earn a little back on the things you already pay for, bills, transfers, and more, on top of what referrals bring in.
        </p>
      </div>
    </div>
  );
}

function ReferralEarningsScreen({ onBack, userId, onWithdrawn }) {
  const [earnings, setEarnings] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await getReferralEarnings(userId);
    setEarnings(data || []);
  };

  useEffect(() => { load(); }, []);

  const pendingBalance = (earnings || [])
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const handleWithdraw = async () => {
    setError('');
    setWithdrawing(true);
    try {
      await withdrawReferralEarnings();
      setWithdrawn(true);
      await load();
      onWithdrawn?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div>
      <BackHeader title="Referral Earnings" onBack={onBack} />
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm text-neutral-500 mb-2">Available balance</p>
        {earnings === null ? (
          <div className="flex justify-center py-2 mb-5"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
        ) : (
          <div className="font-mono text-3xl font-semibold mb-5">{fmtNaira(pendingBalance)}</div>
        )}
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <PrimaryButton onClick={handleWithdraw} disabled={withdrawing || pendingBalance <= 0 || withdrawn}>
          {withdrawing ? <Loader2 className="w-4 h-4 animate-spin" /> : withdrawn ? <><Check className="w-4 h-4" /> Withdrawn to wallet</> : 'Withdraw to Tranxact Wallet'}
        </PrimaryButton>
      </div>
      <h2 className="text-sm font-semibold mb-2">How it works</h2>
      <p className="text-xs text-neutral-500">
        Earn 25% of the crypto funding fee every time someone you referred receives crypto. Withdraw anytime to your main wallet balance.
      </p>
    </div>
  );
}

function LeaderboardScreen({ onBack, myUsername }) {
  const [range, setRange] = useState('all');
  const [data, setData] = useState(null);

  const load = async (period) => {
    setData(null);
    const { data: rows } = await getReferralLeaderboard(period);
    setData(rows || []);
  };

  useEffect(() => { load(range); }, [range]);

  return (
    <div>
      <BackHeader title="Leaderboard" onBack={onBack} />
      <TabToggle
        value={range}
        onChange={setRange}
        options={[
          { value: 'all', label: 'All Time' },
          { value: 'month', label: 'This Month' },
        ]}
      />
      {data === null ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-6">No referral earnings yet.</p>
      ) : (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
          {data.map((row, i) => (
            <div key={row.username} className={`flex items-center justify-between px-4 py-3.5 ${row.username === myUsername ? 'bg-violet-500/10' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-sm text-neutral-500 font-mono">{i + 1}</span>
                <span className={`text-sm ${row.username === myUsername ? 'font-semibold text-violet-300' : ''}`}>@{row.username}</span>
              </div>
              <span className="font-mono text-sm text-neutral-400">{fmtNaira(row.total_earned)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- App shell (nav) ----------
function AppShell({ tab, setTab, isAdmin = false, children }) {
  const navItems = isAdmin ? [...NAV, { key: 'admin', label: 'Admin', icon: ShieldCheck }] : NAV;
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-neutral-900 p-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <LogoMark size={22} />
          <span className="font-bold tracking-tight">Tranxact</span>
        </div>
        <nav className="space-y-1">
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${tab === n.key ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-950'}`}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 pb-28 md:pb-8" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neutral-900 flex justify-around py-2.5 z-40" style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => setTab(n.key)} className="flex flex-col items-center gap-1 px-3 py-1">
            <n.icon className={`w-5 h-5 ${tab === n.key ? 'text-white' : 'text-neutral-600'}`} />
            <span className={`text-[10px] ${tab === n.key ? 'text-white' : 'text-neutral-600'}`}>{n.label}</span>
            {tab === n.key && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---------- Root ----------
// ---------- Web Dashboard (pay.tranxact.co) ----------
function DashboardShell({ tab, setTab, onLogout, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    { key: 'overview', label: 'Overview', icon: LineChart },
    { key: 'links', label: 'Payment Links', icon: Link2 },
    { key: 'storefront', label: 'Business', icon: ShoppingBag },
    { key: 'orders', label: 'Orders', icon: FileText },
    { key: 'customers', label: 'Customers', icon: UserCircle },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'transactions', label: 'Transactions', icon: Wallet },
    { key: 'withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];
  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-5 border-b border-neutral-900 flex-shrink-0"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', paddingBottom: '1rem' }}
      >
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <div>
            <div className="font-bold text-sm leading-tight">Tranxact</div>
            <div className="text-[10px] text-violet-400 leading-tight">Pay Dashboard</div>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-neutral-900 p-6 flex-col flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <LogoMark size={22} />
          <span className="font-bold tracking-tight">Tranxact</span>
        </div>
        <div className="text-xs text-violet-400 mb-10">Pay Dashboard</div>
        <nav className="space-y-1 flex-1">
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${tab === n.key ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-white hover:bg-neutral-950'}`}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={onLogout} className="flex items-center gap-2 text-red-400 text-sm px-3 py-2.5 hover:text-red-300 transition">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </aside>

      {/* Mobile menu, replaces the old cramped bottom nav */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}
      >
        <div
          className={`absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-neutral-950 border-l border-neutral-900 flex flex-col p-5 transition-transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <button onClick={() => setMobileMenuOpen(false)} className="self-end p-1.5 mb-4">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
          <nav className="space-y-1 flex-1">
            {navItems.map(n => (
              <button
                key={n.key}
                onClick={() => { setTab(n.key); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition ${tab === n.key ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </button>
            ))}
          </nav>
          <button onClick={onLogout} className="flex items-center gap-2 text-red-400 text-sm px-3 py-3">
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </div>

      <main className="flex-1 p-5 md:p-10 pb-10 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  );
}

function DashboardOverview({ balance, totalReceived, paymentCount }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Overview</h1>
      <p className="text-sm text-neutral-500 mb-8">Tranxact Pay is the infrastructure layer for how your business gets paid: links, tracking, and payouts, all in one place.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="text-xs text-neutral-500 mb-2">Balance</div>
          <div className="font-mono text-2xl font-bold">{fmtNaira(balance)}</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="text-xs text-neutral-500 mb-2">Total Received</div>
          <div className="font-mono text-2xl font-bold">{fmtNaira(totalReceived)}</div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="text-xs text-neutral-500 mb-2">Payments</div>
          <div className="font-mono text-2xl font-bold">{paymentCount}</div>
        </div>
      </div>
      <p className="text-xs text-neutral-600 mt-6">This is the same Tranxact balance as your app: spendable there immediately, withdrawable here.</p>

      <div className="relative bg-neutral-950 border border-violet-500/25 rounded-2xl p-6 mt-8 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-violet-300">Pay with Tranxact</h2>
        </div>
        <p className="text-sm text-neutral-400 max-w-md">
          A checkout button for your own website. Let customers pay directly with Tranxact, without ever leaving your product. Same rates, same tracking, same balance as everything else here.
        </p>
        <p className="text-xs text-neutral-500 mt-3">
          Head to <span className="text-violet-400 font-medium">Payment Links</span> and tap "Copy embed" on any link to grab the button code.
        </p>
      </div>
    </div>
  );
}

function DashboardLinks({ links, onCreate, creating, createError }) {
  const [title, setTitle] = useState('');
  const [linkType, setLinkType] = useState('fixed');
  const [amount, setAmount] = useState('');
  const [serviceType, setServiceType] = useState('product');
  const [expectedPeople, setExpectedPeople] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [copied, setCopied] = useState('');

  const [showSales, setShowSales] = useState(false);
  const [salesName, setSalesName] = useState('');
  const [salesEmail, setSalesEmail] = useState('');
  const [salesMessage, setSalesMessage] = useState('');
  const [salesSending, setSalesSending] = useState(false);
  const [salesSent, setSalesSent] = useState(false);
  const [salesError, setSalesError] = useState('');

  const handleSubmit = () => {
    onCreate({
      title,
      link_type: linkType,
      amount: linkType === 'fixed' ? Number(amount) : undefined,
      service_type: serviceType,
      expected_people: expectedPeople ? Number(expectedPeople) : undefined,
      expiry_date: hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : undefined,
    });
    setTitle('');
    setAmount('');
    setExpectedPeople('');
    setHasExpiry(false);
    setExpiryDate('');
  };

  const handleSalesSubmit = async () => {
    setSalesError('');
    setSalesSending(true);
    try {
      await submitSalesLead({ name: salesName, email: salesEmail, message: salesMessage });
      setSalesSent(true);
    } catch (e) {
      setSalesError(e.message);
    } finally {
      setSalesSending(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Payment Links</h1>
      <p className="text-sm text-neutral-500 mb-8">The core of how you get paid on Tranxact. Tell us what it's for, and we'll set up the right checkout for it.</p>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold mb-4">Create a new link</h2>
        <div className="space-y-4">
          <Field label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What's this for?" />

          <div>
            <span className="text-sm text-neutral-400 mb-2 block">What type of service is this?</span>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm w-full text-white">
              <option value="product">Product sale</option>
              <option value="service">Service / consulting</option>
              <option value="event">Event or ticketing</option>
              <option value="subscription">Subscription / recurring</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-neutral-400 mb-2 block">Amount type</span>
              <select value={linkType} onChange={e => setLinkType(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm w-full text-white">
                <option value="fixed">Fixed amount</option>
                <option value="flexible">Flexible amount</option>
              </select>
            </div>
            {linkType === 'fixed' && <Field label="Amount (NGN)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />}
          </div>

          {serviceType === 'event' && (
            <Field label="Expected number of people (optional)" type="number" value={expectedPeople} onChange={e => setExpectedPeople(e.target.value)} placeholder="e.g. 50" />
          )}

          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
              <input type="checkbox" checked={hasExpiry} onChange={e => setHasExpiry(e.target.checked)} className="accent-violet-500" />
              This link should stop accepting payments after a certain date (e.g. until an event ends)
            </label>
            {hasExpiry && (
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm w-full text-white"
              />
            )}
          </div>

          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <PrimaryButton onClick={handleSubmit} disabled={creating || !title.trim()} style={{ width: 'auto' }}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Link'}
          </PrimaryButton>
        </div>

        <div className="mt-5 pt-5 border-t border-neutral-900">
          <p className="text-xs text-neutral-500 mb-2">Need something more custom: recurring billing, high volume, a dedicated setup?</p>
          {!showSales ? (
            <button onClick={() => setShowSales(true)} className="text-sm text-violet-400 hover:text-violet-300 transition">Talk to Sales →</button>
          ) : salesSent ? (
            <p className="text-sm text-emerald-400">✓ Thanks, we'll be in touch shortly.</p>
          ) : (
            <div className="space-y-3 mt-3">
              <Field label="Your name" value={salesName} onChange={e => setSalesName(e.target.value)} placeholder="Full name" />
              <Field label="Email" type="email" value={salesEmail} onChange={e => setSalesEmail(e.target.value)} placeholder="you@example.com" />
              <Field label="Tell us what you need" value={salesMessage} onChange={e => setSalesMessage(e.target.value)} placeholder="A short description" />
              {salesError && <p className="text-sm text-red-400">{salesError}</p>}
              <PrimaryButton onClick={handleSalesSubmit} disabled={salesSending || !salesName.trim() || !salesEmail.trim()} style={{ width: 'auto' }}>
                {salesSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden">
        {links.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-10">No payment links yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-900 text-left text-xs text-neutral-500">
                  <th className="px-5 py-3 font-normal">Title</th>
                  <th className="px-5 py-3 font-normal">Type</th>
                  <th className="px-5 py-3 font-normal">Amount</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Link</th>
                </tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id} className="border-b border-neutral-900 last:border-b-0">
                    <td className="px-5 py-3 whitespace-nowrap">{l.title}</td>
                    <td className="px-5 py-3 text-neutral-500 capitalize whitespace-nowrap">{l.link_type}</td>
                    <td className="px-5 py-3 font-mono whitespace-nowrap">{l.link_type === 'fixed' ? fmtNaira(l.amount) : '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>{l.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => copy(`https://app.tranxact.co/pay/${l.slug}`, l.slug)} className="text-violet-400 text-xs flex items-center gap-1">
                        {copied === l.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === l.slug ? 'Copied' : 'Copy link'}
                      </button>
                      <button
                        onClick={() => copy(`<a href="https://app.tranxact.co/pay/${l.slug}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#111;color:#fff;padding:12px 20px;border-radius:12px;font-family:-apple-system,sans-serif;font-weight:600;font-size:14px;text-decoration:none;">\n  <img src="https://app.tranxact.co/icon-192.png" alt="" style="width:20px;height:20px;border-radius:4px;" />\n  Pay with Tranxact\n</a>`, `embed-${l.slug}`)}
                        className="text-neutral-400 text-xs flex items-center gap-1"
                      >
                        {copied === `embed-${l.slug}` ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />} {copied === `embed-${l.slug}` ? 'Copied' : 'Copy embed'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardAnalytics({ analytics, userId }) {
  const [storeAnalytics, setStoreAnalytics] = useState(undefined); // undefined = loading, null = no business

  useEffect(() => {
    getMyBusiness(userId).then(async ({ data: business }) => {
      if (!business) { setStoreAnalytics(null); return; }
      try {
        const sa = await getStorefrontAnalytics(business.id);
        setStoreAnalytics(sa);
      } catch {
        setStoreAnalytics(null);
      }
    });
  }, [userId]);

  if (!analytics) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-8">Analytics</h1>
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
      </div>
    );
  }

  const StatCard = ({ label, value, sub }) => (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
      <div className="text-xs text-neutral-500 mb-2">{label}</div>
      <div className="font-mono text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-neutral-600 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Analytics</h1>
      <p className="text-sm text-neutral-500 mb-8">Real numbers on how your payment links are actually performing.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard label="Total Links Created" value={analytics.total_links} />
        <StatCard label="Total Payments" value={analytics.total_payments} />
        <StatCard label="Total Volume" value={fmtNaira(analytics.total_volume)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Acceptance Rate"
          value={`${analytics.acceptance_rate_pct}%`}
          sub={`${analytics.links_with_payment} of ${analytics.total_links} links have received a payment`}
        />
        <StatCard label="Average Payment" value={fmtNaira(analytics.avg_payment)} />
        <StatCard label="Active Links" value={`${analytics.active_links} active \u00b7 ${analytics.closed_links} closed`} />
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold mb-4">Link type breakdown</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
              <span>Fixed amount</span>
              <span>{analytics.fixed_links} ({analytics.fixed_pct}%)</span>
            </div>
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500" style={{ width: `${analytics.fixed_pct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
              <span>Flexible amount</span>
              <span>{analytics.flexible_links} ({analytics.flexible_pct}%)</span>
            </div>
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500" style={{ width: `${analytics.flexible_pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {analytics.daily_volume && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mt-4">
          <h2 className="text-sm font-semibold mb-1">Last 14 days</h2>
          <p className="text-xs text-neutral-600 mb-5">Real settled volume, day by day.</p>
          {(() => {
            const max = Math.max(...analytics.daily_volume.map(d => d.amount), 1);
            return (
              <div className="flex items-end gap-1.5 h-32">
                {analytics.daily_volume.map((d) => {
                  const heightPct = Math.max((d.amount / max) * 100, d.amount > 0 ? 4 : 1);
                  const label = new Date(d.date + 'T00:00:00Z').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="text-[9px] text-neutral-600 mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap absolute -top-4">
                        {fmtNaira(d.amount)}
                      </div>
                      <div
                        className={`w-full rounded-t-sm transition ${d.amount > 0 ? 'bg-violet-500' : 'bg-neutral-900'}`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <div className="text-[8px] text-neutral-700 mt-1.5">{label.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {analytics.top_links && analytics.top_links.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mt-4">
          <h2 className="text-sm font-semibold mb-4">Top performing links</h2>
          <div className="space-y-3">
            {analytics.top_links.map((l, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.title}</div>
                  <div className="text-xs text-neutral-600">{l.count} payment{l.count === 1 ? '' : 's'}</div>
                </div>
                <div className="text-sm font-mono flex-shrink-0 ml-3">{fmtNaira(l.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {storeAnalytics && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-4">Business</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Store visits" value={storeAnalytics.visits} />
            <StatCard label="Product views" value={storeAnalytics.product_views} />
            <StatCard label="Checkouts started" value={storeAnalytics.checkout_starts} />
            <StatCard label="Conversion rate" value={storeAnalytics.conversion_rate !== null ? `${storeAnalytics.conversion_rate}%` : '—'} sub={storeAnalytics.visits === 0 ? 'No visits tracked yet' : undefined} />
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-4">
            <div className="text-xs text-neutral-500 mb-2">Business revenue</div>
            <div className="font-mono text-2xl font-bold">{fmtNaira(storeAnalytics.revenue)}</div>
            <div className="text-xs text-neutral-600 mt-1">{storeAnalytics.orders} order{storeAnalytics.orders === 1 ? '' : 's'}</div>
          </div>
          {storeAnalytics.top_products && storeAnalytics.top_products.length > 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4">Top items</h3>
              <div className="space-y-3">
                {storeAnalytics.top_products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-xs text-neutral-600">{p.order_count} order{p.order_count === 1 ? '' : 's'}</div>
                    </div>
                    <div className="text-sm font-mono flex-shrink-0 ml-3">{fmtNaira(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardTransactions({ transactions }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Transactions</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-5">
        {transactions.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-10">No transactions yet.</p>
        ) : (
          transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}

function DashboardWithdrawals({ balance, withdrawals, onRequest, requesting, requestError, requestSuccess }) {
  const [amount, setAmount] = useState('');
  const [banks, setBanks] = useState(null);
  const [banksError, setBanksError] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    if (banks !== null) return;
    listPaystackBanks()
      .then(setBanks)
      .catch(e => { setBanksError(e.message); setBanks([]); });
  }, [banks]);

  useEffect(() => {
    setResolvedName('');
    setResolveError('');
    if (accountNumber.length !== 10 || !bankCode) return;
    let cancelled = false;
    setResolving(true);
    resolveBankAccount(accountNumber, bankCode)
      .then(res => { if (!cancelled) setResolvedName(res.account_name); })
      .catch(e => { if (!cancelled) setResolveError(e.message); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [accountNumber, bankCode]);

  const selectedBank = (banks || []).find(b => b.code === bankCode);
  const canSubmit = amount && bankCode && accountNumber.length === 10 && resolvedName && !resolving;

  const handleSubmit = () => {
    onRequest({
      amount: Number(amount),
      bank_name: selectedBank?.name || '',
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: resolvedName,
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Withdrawals</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold mb-1">Request a withdrawal</h2>
        <p className="text-xs text-neutral-500 mb-4">Available balance: {fmtNaira(balance)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Amount (NGN)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          <div>
            <span className="text-sm text-neutral-400 mb-2 block">Bank</span>
            <BankPicker banks={banks} banksError={banksError} bankCode={bankCode} onSelect={setBankCode} />
          </div>
          <Field label="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" />
          <div>
            <span className="text-sm text-neutral-400 mb-2 block">Account Name</span>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm min-h-[42px] flex items-center">
              {resolving ? (
                <span className="text-neutral-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</span>
              ) : resolvedName ? (
                <span className="text-emerald-400">{resolvedName}</span>
              ) : resolveError ? (
                <span className="text-red-400">{resolveError}</span>
              ) : (
                <span className="text-neutral-600">Resolved automatically</span>
              )}
            </div>
          </div>
        </div>
        {requestError && <p className="text-sm text-red-400 mt-3">{requestError}</p>}
        {requestSuccess && <p className="text-sm text-emerald-400 mt-3">✓ Withdrawal request submitted. You'll be paid once it's processed.</p>}
        <PrimaryButton onClick={handleSubmit} disabled={requesting || !canSubmit} className="mt-4" style={{ width: 'auto' }}>
          {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Withdrawal'}
        </PrimaryButton>
      </div>

      <h2 className="text-sm font-semibold mb-3">History</h2>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
        {withdrawals.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-10">No withdrawal requests yet.</p>
        ) : (
          withdrawals.map(w => (
            <div key={w.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium">{fmtNaira(w.amount)}</div>
                <div className="text-xs text-neutral-500">{w.bank_name} · {w.account_number}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${w.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : w.status === 'rejected' || w.status === 'transfer_failed' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>{w.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WebDashboardApp() {
  const [screen, setScreen] = useState('splash'); // splash | login | signup | forgot | app
  const [tab, setTab] = useState('overview');
  const [userId, setUserId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [links, setLinks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [payments, setPayments] = useState([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  const loadAll = async (userId) => {
    const { data: wallet } = await getWallet(userId);
    setBalance(wallet?.balance || 0);
    try { setLinks(await getMyPaymentLinks()); } catch { setLinks([]); }
    const { data: txs } = await getRecentTransactions(userId, 50);
    setTransactions((txs || []).map(mapTransaction));
    try { setPayments(await getMyTranxactPayments()); } catch { setPayments([]); }
    try { setWithdrawals(await getMyWithdrawals()); } catch { setWithdrawals([]); }
    try { setAnalytics(await getDashboardAnalytics()); } catch { setAnalytics(null); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        loadAll(session.user.id).then(() => setScreen('app'));
      } else {
        setScreen('login');
      }
    });
  }, []);

  const handleAuthed = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      await loadAll(session.user.id);
      setScreen('app');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setScreen('login');
  };

  const handleCreateLink = async (payload) => {
    setCreateError('');
    setCreating(true);
    try {
      await createPaymentLink(payload);
      setLinks(await getMyPaymentLinks());
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRequestWithdrawal = async (payload) => {
    setRequestError('');
    setRequestSuccess(false);
    setRequesting(true);
    try {
      await requestWithdrawal(payload);
      setRequestSuccess(true);
      setWithdrawals(await getMyWithdrawals());
      const { data: { session } } = await supabase.auth.getSession();
      const { data: wallet } = await getWallet(session.user.id);
      setBalance(wallet?.balance || 0);
    } catch (e) {
      setRequestError(e.message);
    } finally {
      setRequesting(false);
    }
  };

  const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (screen === 'splash') {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }

  if (screen === 'login' || screen === 'signup' || screen === 'forgot') {
    return (
      <>
        {screen === 'login' && <LoginScreen onLogin={handleAuthed} goSignup={() => setScreen('signup')} goForgot={() => setScreen('forgot')} isDashboard />}
        {screen === 'signup' && <SignupScreen onSignup={handleAuthed} goLogin={() => setScreen('login')} isDashboard />}
        {screen === 'forgot' && <ForgotScreen onSent={() => setScreen('login')} goLogin={() => setScreen('login')} isDashboard />}
      </>
    );
  }

  return (
    <DashboardShell tab={tab} setTab={setTab} onLogout={handleLogout}>
      {tab === 'overview' && <DashboardOverview balance={balance} totalReceived={totalReceived} paymentCount={payments.length} />}
      {tab === 'links' && <DashboardLinks links={links} onCreate={handleCreateLink} creating={creating} createError={createError} />}
      {tab === 'storefront' && <DashboardStorefront userId={userId} setTab={setTab} />}
      {tab === 'analytics' && <DashboardAnalytics analytics={analytics} userId={userId} />}
      {tab === 'transactions' && <DashboardTransactions transactions={transactions} />}
      {tab === 'withdrawals' && (
        <DashboardWithdrawals
          balance={balance}
          withdrawals={withdrawals}
          onRequest={handleRequestWithdrawal}
          requesting={requesting}
          requestError={requestError}
          requestSuccess={requestSuccess}
        />
      )}
      {tab === 'orders' && <DashboardOrders userId={userId} />}
      {tab === 'customers' && <DashboardCustomers userId={userId} />}
      {tab === 'settings' && <DashboardSettings userId={userId} />}
    </DashboardShell>
  );
}

function MobileAppRoot() {
  const [screen, setScreen] = useState('splash'); // splash | login | signup | forgot | forgotSent | welcome | app
  const [tab, setTab] = useState('home');
  const [homeView, setHomeView] = useState('main'); // main | fund | receive | send | history | notifications
  const [sendAgainUsername, setSendAgainUsername] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileView, setProfileView] = useState('main'); // main | rates | support | username | security | settings | account
  const [earnView, setEarnView] = useState('main'); // main | earnings | leaderboard
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tpOpen, setTpOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const initializedRef = React.useRef(false);
  const referralFromUrl = React.useRef(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null
  ).current;
  // Separate from referral codes on purpose — a ?signup=1 link shouldn't be
  // treated as an actual referral attribution, just an intent to land on
  // the signup form instead of login.
  const signupIntent = React.useRef(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('signup') === '1' : false
  ).current;

  const loadUserData = async (userId) => {
    const [{ data: p }, { data: w }, { data: t }] = await Promise.all([
      getProfile(userId),
      getWallet(userId),
      getRecentTransactions(userId),
    ]);
    setProfile(p);
    setWallet(w);
    setTransactions((t || []).map(mapTransaction));
    getUnreadNotificationCount().then(setUnreadCount).catch(() => {});
  };

  const hasSeenWelcome = (session) =>
    localStorage.getItem('hasSeenWelcome') === 'true' || session?.user?.user_metadata?.hasSeenWelcome === true;

  const handleWelcomeContinue = async () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    try { await supabase.auth.updateUser({ data: { hasSeenWelcome: true } }); } catch { /* best-effort */ }
    // Real first entry — a confirmed session finally exists at this point,
    // which is why this couldn't fire at signup time. Never blocks getting
    // into the app if it's slow or fails; nothing here is awaited by setScreen.
    sendWelcomeEmail(profile?.username).catch(() => {});
    setScreen('app');
  };

  useEffect(() => {
    const minSplashTime = new Promise(resolve => setTimeout(resolve, 1200));

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await minSplashTime; // keep the splash on screen for a minimum duration, even if the session check is instant
      if (session) {
        await loadUserData(session.user.id);
        setScreen(hasSeenWelcome(session) ? 'app' : 'welcome');
      } else {
        setScreen((referralFromUrl || signupIntent) ? 'signup' : 'login');
      }
      initializedRef.current = true;
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initializedRef.current) return; // the initial load is already handled by init() above
      if (session) {
        loadUserData(session.user.id).then(() => {
          setScreen(hasSeenWelcome(session) ? 'app' : 'welcome');
        });
      } else {
        setProfile(null);
        setWallet(null);
        setTransactions([]);
        setScreen('login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setScreen('login');
  };

  // Checkout works for anyone, logged in or not — checked before any auth screen.
  const checkoutSlug = typeof window !== 'undefined' && window.location.pathname.startsWith('/pay/')
    ? window.location.pathname.slice('/pay/'.length).replace(/\/$/, '')
    : null;
  if (checkoutSlug) return <CheckoutPage slug={checkoutSlug} />;

  if (screen === 'splash') return <SplashScreen />;

  if (screen === 'login') return <LoginScreen onLogin={() => {}} goSignup={() => setScreen('signup')} goForgot={() => setScreen('forgot')} />;
  if (screen === 'signup') return <SignupScreen onSignup={() => {}} goLogin={() => setScreen('login')} initialReferralCode={referralFromUrl} />;
  if (screen === 'forgot') return <ForgotScreen onSent={() => setScreen('forgotSent')} goLogin={() => setScreen('login')} />;
  if (screen === 'forgotSent') return <ForgotSentScreen goLogin={() => setScreen('login')} />;
  if (screen === 'welcome') return <WelcomeScreen onContinue={handleWelcomeContinue} />;

  const displayName = profile?.full_name?.split(' ')[0] || profile?.username || '';
  const balance = wallet ? Number(wallet.balance) : 0;

  return (
    <AppShell tab={tab} setTab={(t) => { setTab(t); setHomeView('main'); setProfileView('main'); }} isAdmin={profile?.is_admin === true}>
      {tab === 'home' && homeView === 'main' && (
        <HomeScreen
          balanceVisible={balanceVisible}
          toggleBalance={() => setBalanceVisible(v => !v)}
          onFund={() => setHomeView('fund')}
          onReceive={() => setHomeView('receive')}
          onSend={() => setHomeView('send')}
          onSendAgain={(username) => { setSendAgainUsername(username); setHomeView('send'); }}
          onTranxactPay={() => setTpOpen(true)}
          onAirtime={() => setHomeView('airtime')}
          onData={() => setHomeView('data')}
          onElectricity={() => setHomeView('electricity')}
          onTV={() => setHomeView('tv')}
          onSeeAllBills={() => setHomeView('allBills')}
          onSeeAll={() => setHomeView('history')}
          onOpenNotifications={() => setHomeView('notifications')}
          unreadCount={unreadCount}
          displayName={displayName}
          balance={balance}
          transactions={transactions}
        />
      )}
      {tab === 'home' && homeView === 'notifications' && (
        <NotificationsScreen
          onBack={() => { setHomeView('main'); getUnreadNotificationCount().then(setUnreadCount).catch(() => {}); }}
        />
      )}
      {tab === 'home' && homeView === 'fund' && <FundWalletScreen onBack={() => setHomeView('main')} username={profile?.username || ''} />}
      {tab === 'home' && homeView === 'receive' && <ReceiveScreen onBack={() => setHomeView('main')} />}
      {tab === 'home' && homeView === 'send' && (
        <SendScreen
          onBack={() => { setSendAgainUsername(''); setHomeView('main'); }}
          onDone={() => { if (profile?.id) loadUserData(profile.id); setSendAgainUsername(''); setHomeView('main'); }}
          hasPin={!!profile?.pin_hash}
          initialUsername={sendAgainUsername}
        />
      )}
      {tab === 'home' && homeView === 'allBills' && (
        <AllBillsScreen
          onBack={() => setHomeView('main')}
          onAirtime={() => setHomeView('airtime')}
          onData={() => setHomeView('data')}
          onElectricity={() => setHomeView('electricity')}
          onTV={() => setHomeView('tv')}
        />
      )}
      {tab === 'home' && homeView === 'tv' && (
        <TVScreen
          onBack={() => setHomeView('main')}
          onDone={() => { if (profile?.id) loadUserData(profile.id); setHomeView('main'); }}
          hasPin={!!profile?.pin_hash}
        />
      )}
      {tab === 'home' && homeView === 'electricity' && (
        <ElectricityScreen
          onBack={() => setHomeView('main')}
          onDone={() => { if (profile?.id) loadUserData(profile.id); setHomeView('main'); }}
          hasPin={!!profile?.pin_hash}
        />
      )}
      {tab === 'home' && homeView === 'airtime' && (
        <AirtimeScreen
          onBack={() => setHomeView('main')}
          onDone={() => { if (profile?.id) loadUserData(profile.id); setHomeView('main'); }}
          hasPin={!!profile?.pin_hash}
        />
      )}
      {tab === 'home' && homeView === 'data' && (
        <DataScreen
          onBack={() => setHomeView('main')}
          onDone={() => { if (profile?.id) loadUserData(profile.id); setHomeView('main'); }}
          hasPin={!!profile?.pin_hash}
        />
      )}
      {tab === 'home' && homeView === 'history' && (
        <HistoryScreen
          onBack={() => setHomeView('main')}
          transactions={transactions}
          onSendAgain={(username) => { setSendAgainUsername(username); setHomeView('send'); }}
        />
      )}

      {tab === 'earn' && earnView === 'main' && (
        <EarnScreen
          onEarnings={() => setEarnView('earnings')}
          onLeaderboard={() => setEarnView('leaderboard')}
          username={profile?.username || ''}
          userId={profile?.id}
        />
      )}
      {tab === 'earn' && earnView === 'earnings' && (
        <ReferralEarningsScreen
          onBack={() => setEarnView('main')}
          userId={profile?.id}
          onWithdrawn={() => { if (profile?.id) loadUserData(profile.id); }}
        />
      )}
      {tab === 'earn' && earnView === 'leaderboard' && (
        <LeaderboardScreen onBack={() => setEarnView('main')} myUsername={profile?.username || ''} />
      )}
      {tab === 'crypto' && <CryptoScreen />}
      {tab === 'cards' && <CardsScreen fullName={profile?.full_name || ''} />}
      {tab === 'admin' && profile?.is_admin === true && <AdminScreen />}

      {tab === 'profile' && profileView === 'main' && (
        <ProfileScreen
          onLogout={handleLogout}
          onOpenRates={() => setProfileView('rates')}
          onOpenSupport={() => setProfileView('support')}
          onOpenUsername={() => setProfileView('username')}
          onOpenSecurity={() => setProfileView('security')}
          onOpenSettings={() => setProfileView('settings')}
          onOpenAccountDetails={() => setProfileView('account')}
        />
      )}
      {tab === 'profile' && profileView === 'rates' && (
        <RatesScreen onBack={() => setProfileView('main')} />
      )}
      {tab === 'profile' && profileView === 'support' && <SupportScreen onBack={() => setProfileView('main')} />}
      {tab === 'profile' && profileView === 'account' && <AccountDetailsScreen onBack={() => setProfileView('main')} profile={profile} onUpdated={() => { if (profile?.id) loadUserData(profile.id); }} />}
      {tab === 'profile' && profileView === 'username' && (
        <UsernameScreen
          onBack={() => setProfileView('main')}
          currentUsername={profile?.username || ''}
          onChanged={() => { if (profile?.id) loadUserData(profile.id); }}
        />
      )}
      {tab === 'profile' && profileView === 'security' && <SecurityScreen onBack={() => setProfileView('main')} />}
      {tab === 'profile' && profileView === 'settings' && (
        <SettingsScreen
          onBack={() => setProfileView('main')}
          initialLimit={profile?.daily_spending_limit}
          initialPushEnabled={profile?.push_notifications_enabled}
        />
      )}

      {tpOpen && <TranxactPayScreen onClose={() => setTpOpen(false)} username={profile?.username || ''} />}
    </AppShell>
  );
}

// ---------- Business Platform ----------
// Public storefront at business.tranxact.co/{slug} — no login required.
// Every "buy" button links straight to the existing, already-proven checkout
// at app.tranxact.co/pay/{slug} — zero new payment code, same crypto/naira/
// admin-settlement flow that already works today.
// The public marketing site for business.tranxact.co (no slug) — explains
// Tranxact Business and drives signup. Genuinely distinct from the real
// customer storefronts at business.tranxact.co/{slug} below, and distinct
// from the merchant dashboard at pay.tranxact.co. Built incrementally,
// section by section, matching the same discipline as the rest of this
// build rather than rushed in one pass.
function BusinessMarketingScreen() {
  const [menuOpen, setMenuOpen] = useState(false);

  const capabilities = [
    { Icon: ShoppingBag, title: 'Store', desc: 'Create your own professional business page and showcase what you sell.' },
    { Icon: Wallet, title: 'Payments', desc: 'Accept payments through Tranxact checkout using supported naira and crypto payment methods.' },
    { Icon: Link2, title: 'Payment Links', desc: 'Create a payment link in seconds and share it anywhere.' },
    { Icon: FileText, title: 'Orders', desc: 'Track purchases and order activity from one dashboard.' },
    { Icon: UserCircle, title: 'Customers', desc: 'Keep track of customers and their purchase activity.' },
    { Icon: Calendar, title: 'Events', desc: 'Create events, sell tickets and manage check-ins.' },
  ];

  const steps = [
    { n: '01', title: 'Create your page', desc: 'Tell us about your business and get your unique Tranxact page.' },
    { n: '02', title: 'Add what you sell', desc: 'Add products, services, or events.' },
    { n: '03', title: 'Share your link', desc: 'Share it on WhatsApp, Instagram, TikTok, X, or anywhere else.' },
    { n: '04', title: 'Get paid', desc: 'Customers checkout through Tranxact using supported payment methods.' },
  ];

  const navLinks = [
    { href: '#product', label: 'Product' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#payments', label: 'Payments' },
    { href: '#storefront', label: 'Business Page' },
    { href: '#events', label: 'Events' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-bold text-sm">Tranxact Business</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-neutral-400">
            {navLinks.map(l => <a key={l.href} href={l.href} className="hover:text-white transition">{l.label}</a>)}
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <a href="https://pay.tranxact.co" className="text-sm text-neutral-400 hover:text-white transition">Log in</a>
            <a href="https://pay.tranxact.co" className="bg-white text-black text-sm font-semibold rounded-full px-4 py-2">Get started</a>
          </div>
          <button onClick={() => setMenuOpen(true)} className="md:hidden p-1.5" aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setMenuOpen(false); }}>
          <div className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-neutral-950 border-l border-neutral-900 p-5 flex flex-col" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}>
            <button onClick={() => setMenuOpen(false)} className="self-end p-1.5 mb-4" aria-label="Close menu"><X className="w-5 h-5 text-neutral-400" /></button>
            <nav className="flex flex-col gap-1">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="text-sm py-3 border-b border-neutral-900 text-neutral-300">{l.label}</a>
              ))}
            </nav>
            <div className="mt-6 space-y-2">
              <a href="https://pay.tranxact.co" className="block text-center text-sm py-2.5 rounded-full bg-neutral-900 border border-neutral-800">Log in</a>
              <a href="https://pay.tranxact.co" className="block text-center text-sm font-semibold py-2.5 rounded-full bg-white text-black">Get started</a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Build your business on Tranxact.</h1>
        <p className="text-neutral-400 max-w-lg mx-auto mb-8">Sell your products, services and events, accept payments, and manage your business from one place.</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a href="https://pay.tranxact.co" className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3">Get started</a>
          <a href="#how-it-works" className="text-sm text-neutral-400 hover:text-white transition px-4 py-3">See how it works</a>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-4 text-left">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wide mb-3">Merchant dashboard</div>
            <div className="text-xs text-violet-400 font-medium mb-1">Vscents</div>
            <div className="text-sm font-semibold mb-4 break-all">business.tranxact.co/vscents</div>
            <div className="flex items-center justify-between text-xs bg-neutral-900 rounded-lg px-3 py-2.5">
              <span className="text-neutral-400">Maahir Legacy LATAFA</span>
              <span className="font-mono">₦55,000</span>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wide mb-3">Customer storefront</div>
            <div className="text-sm font-bold mb-1">Vscents</div>
            <div className="text-xs text-neutral-500 mb-4">Perfumes &amp; fragrances</div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-xs font-medium mb-1">Maahir Legacy LATAFA</div>
              <div className="text-sm font-mono mb-2">₦55,000</div>
              <div className="bg-white text-black text-xs font-semibold rounded-lg py-1.5 text-center">Buy now</div>
            </div>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wide mb-3">Checkout</div>
            <div className="text-xs text-neutral-500 mb-1">Paying Vscents</div>
            <div className="text-lg font-mono font-bold mb-4">₦55,000</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white text-black text-xs font-semibold rounded-lg py-2 text-center">Naira</div>
              <div className="bg-neutral-900 text-xs font-semibold rounded-lg py-2 text-center border border-neutral-800">Crypto</div>
            </div>
          </div>
        </div>
      </div>

      <div id="product" className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Everything you need to sell and get paid.</h2>
        <p className="text-neutral-500 text-center max-w-md mx-auto mb-12">One product, not a pile of disconnected tools.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {capabilities.map((f, i) => (
            <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center mb-3">
                <f.Icon className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-sm font-semibold mb-1">{f.title}</div>
              <div className="text-xs text-neutral-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="storefront" className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Your business deserves its own place online.</h2>
          <p className="text-neutral-400 mb-6">Create a shareable page for your business and give your customers one simple place to discover what you sell.</p>
          <a href="https://pay.tranxact.co" className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3 inline-block">Get started</a>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-neutral-900">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center"><LogoMark size={18} /></div>
            <div>
              <div className="text-sm font-bold">Vscents</div>
              <div className="text-xs text-neutral-500">Perfumes &amp; fragrances</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[{ title: 'Maahir Legacy LATAFA', price: '₦55,000' }, { title: 'Amour Eternal', price: '₦45,000' }].map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-neutral-900 rounded-xl px-3.5 py-2.5">
                <div>
                  <div className="text-xs text-violet-400 font-medium">Product</div>
                  <div className="text-sm font-medium">{p.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono mb-1">{p.price}</div>
                  <div className="bg-white text-black text-[10px] font-semibold rounded-full px-2.5 py-1">Buy now</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-[10px] text-neutral-700 mt-4">Powered by Tranxact</div>
        </div>
      </div>

      <div id="how-it-works" className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">From business to selling in minutes.</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i}>
              <div className="text-xs font-mono text-violet-400 mb-2">{s.n}</div>
              <div className="text-sm font-semibold mb-1.5">{s.title}</div>
              <div className="text-xs text-neutral-500 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="payments" className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Need to get paid for something else?</h2>
          <p className="text-neutral-400 mb-6">Create a payment link in seconds. No developer required.</p>
          <div className="space-y-5">
            {[
              { n: '1', title: 'Create the link', desc: "Give it a name, set a fixed amount or let the customer enter their own, and you're done." },
              { n: '2', title: 'Share it anywhere', desc: 'Send it to a WhatsApp chat, drop it in your Instagram bio, or paste it into an email.' },
              { n: '3', title: 'Get paid', desc: 'Your customer pays by bank transfer or supported crypto. The money lands in your balance instantly.' },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.n}</div>
                <div>
                  <div className="text-sm font-semibold mb-0.5">{s.title}</div>
                  <div className="text-xs text-neutral-500 leading-relaxed">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="text-xs text-neutral-500 mb-2">Payment for</div>
          <div className="text-sm font-semibold mb-4">Logo Design</div>
          <div className="text-2xl font-mono font-bold mb-5">₦50,000</div>
          <div className="bg-white text-black text-sm font-semibold rounded-full py-2.5 text-center">Pay</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">One checkout. Multiple ways to pay.</h2>
        <p className="text-neutral-500 max-w-md mx-auto mb-12">Customers pay using supported naira payment methods or supported crypto, all through the same Tranxact checkout.</p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          {['Business page', 'Product / Service / Event', 'Checkout', 'Choose payment method', 'Payment', 'Confirmation', 'Business receives funds'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className="bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2">{s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Run your business from one dashboard.</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Available balance</div>
                <div className="text-lg font-mono font-bold">₦482,600</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wide">Orders</div>
                <div className="text-lg font-mono font-bold">18</div>
              </div>
            </div>
            <div className="text-[10px] text-neutral-600 text-center border-t border-neutral-900 pt-3">Demonstration data</div>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {['Business', 'Products', 'Services', 'Events', 'Orders', 'Customers', 'Payments', 'Payment Links', 'Analytics', 'Transactions', 'Withdraw'].map(item => (
              <span key={item} className="text-xs bg-neutral-950 border border-neutral-800 rounded-full px-3 py-1.5 text-neutral-400">{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Whatever you sell, build it on Tranxact.</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: 'Retailers', desc: 'Sell products online.' },
            { title: 'Freelancers', desc: 'Get paid for your work.' },
            { title: 'Creators', desc: 'Accept tips and payments.' },
            { title: 'Service providers', desc: 'Showcase and sell your services.' },
            { title: 'Event organizers', desc: 'Sell tickets and manage events.' },
            { title: 'Small businesses', desc: 'Manage your business and payments in one place.' },
          ].map((b, i) => (
            <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5">
              <div className="text-sm font-semibold mb-1">{b.title}</div>
              <div className="text-xs text-neutral-500">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">One link. Everywhere.</h2>
        <p className="text-neutral-500 max-w-md mx-auto mb-10">Share your page on WhatsApp, Instagram, TikTok, X, your website, or a QR code. Create once, share anywhere.</p>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 max-w-sm mx-auto flex items-center justify-between gap-3">
          <span className="text-sm text-violet-400 font-mono truncate">business.tranxact.co/yourbusiness</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="flex items-center gap-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2 text-neutral-400"><Copy className="w-3 h-3" /> Copy</span>
          <span className="flex items-center gap-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2 text-neutral-400"><Share2 className="w-3 h-3" /> Share</span>
          <span className="flex items-center gap-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2 text-neutral-400"><QrCode className="w-3 h-3" /> QR</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-10">Your customers get a simpler way to buy.</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          {['Discover your business', 'Choose a product / service / event', 'Checkout', 'Pay', 'Confirmation'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className="bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2">{s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div id="events" className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Sell more than products.</h2>
          <p className="text-neutral-400">Create events, set ticket types and inventory, sell tickets, generate digital tickets, and scan them at entry, all tracked from the same dashboard.</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-2.5">
          {[{ tier: 'Regular', price: '₦10,000' }, { tier: 'VIP', price: '₦30,000' }, { tier: 'VVIP', price: '₦75,000' }].map(t => (
            <div key={t.tier} className="flex items-center justify-between bg-neutral-900 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">{t.tier}</span>
              <span className="text-sm font-mono">{t.price}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Let customers pay their way.</h2>
        <p className="text-neutral-500 max-w-md mx-auto">Businesses can accept supported naira and supported crypto payment methods through Tranxact, all settling into the same balance.</p>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-10">Built to grow with your business.</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400 mb-3">
          {['Create a page', 'Add one product', 'Share the link', 'Get paid'].map((s, i, arr) => (
            <React.Fragment key={s}>
              <span className="bg-neutral-950 border border-neutral-800 rounded-full px-3.5 py-2">{s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-neutral-700" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-neutral-600">Then grow into products, services, orders, customers, events, analytics, and more, whenever you're ready.</p>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-20 border-t border-neutral-900 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to build your business on Tranxact?</h2>
        <p className="text-neutral-400 mb-8">Create your page, share what you sell, and start getting paid.</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a href="https://pay.tranxact.co" className="bg-white text-black text-sm font-semibold rounded-full px-6 py-3">Get started</a>
          <a href="#how-it-works" className="text-sm text-neutral-400 hover:text-white transition px-4 py-3">See how it works</a>
        </div>
      </div>

      <footer className="border-t border-neutral-900">
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LogoMark size={18} />
                <span className="font-bold text-sm">Tranxact Business</span>
              </div>
              <p className="text-xs text-neutral-600">Build your business on Tranxact.</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-500 mb-3">Product</div>
              <div className="flex flex-col gap-2 text-xs text-neutral-500">
                <a href="#storefront" className="hover:text-white transition">Business Page</a>
                <a href="#payments" className="hover:text-white transition">Payments</a>
                <a href="#payments" className="hover:text-white transition">Payment Links</a>
                <a href="#events" className="hover:text-white transition">Events</a>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-500 mb-3">Business</div>
              <div className="flex flex-col gap-2 text-xs text-neutral-500">
                <a href="https://pay.tranxact.co" className="hover:text-white transition">Get started</a>
                <a href="https://pay.tranxact.co" className="hover:text-white transition">Log in</a>
                <a href="mailto:hello@tranxact.co" className="hover:text-white transition">Help</a>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-500 mb-3">Tranxact</div>
              <div className="flex flex-col gap-2 text-xs text-neutral-500">
                <a href="https://tranxact.co" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Main Tranxact</a>
                <a href="https://tranxact.co/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Terms</a>
                <a href="https://tranxact.co/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Privacy</a>
              </div>
            </div>
          </div>
          <div className="text-xs text-neutral-700 border-t border-neutral-900 pt-6">© 2026 Tranxact Technologies Ltd.</div>
        </div>
      </footer>
    </div>
  );
}

// The customer's real order page — reached by a random access token, so it
// works for guests with no Tranxact account, and can't be found by guessing
// an order number. Keeps the customer inside the business's context, never
// dumping them onto the Tranxact homepage.
const TRACKING_STEPS = [
  { key: 'paid', label: 'Paid', note: 'Payment confirmed' },
  { key: 'processing', label: 'Processing', note: 'Being prepared' },
  { key: 'ready', label: 'Ready', note: 'Ready for you' },
  { key: 'completed', label: 'Completed', note: 'All done' },
];

function OrderTrackingScreen({ token }) {
  const [order, setOrder] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    getStorefrontOrderByToken(token)
      .then(setOrder)
      .catch(e => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-bold mb-2">Order not found</h1>
        <p className="text-sm text-neutral-500 max-w-xs">This order link doesn't work. Double-check the link, or contact the business you ordered from.</p>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
      </div>
    );
  }

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const currentStepIndex = TRACKING_STEPS.findIndex(s => s.key === order.status);
  const placed = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const waLink = order.business_contact_phone
    ? `https://wa.me/${String(order.business_contact_phone).replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi, about my order ${order.order_number}`)}`
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-5 py-8">
        <div className="flex items-center gap-3 mb-8">
          {order.business_logo_url ? (
            <img src={order.business_logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-sm font-bold">
              {(order.business_name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-bold">{order.business_name}</div>
            <div className="text-xs text-neutral-500 font-mono">{order.order_number}</div>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-sm font-semibold">{order.item_title}</div>
              {order.quantity > 1 && <div className="text-xs text-neutral-500 mt-0.5">Qty {order.quantity}</div>}
            </div>
            {order.item_amount != null && (
              <div className="text-sm font-mono flex-shrink-0 ml-3">{fmtNaira(Number(order.item_amount))}</div>
            )}
          </div>
          <div className="border-t border-neutral-800 pt-4 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-neutral-500">Payment</span><span className="text-emerald-400">Paid</span></div>
            {placed && <div className="flex justify-between text-xs"><span className="text-neutral-500">Placed</span><span>{placed}</span></div>}
            {order.customer_name && (
              <div className="flex justify-between text-xs"><span className="text-neutral-500">Ordered by</span><span>{order.customer_name}</span></div>
            )}
            <div className="flex justify-between text-xs"><span className="text-neutral-500">Reference</span><span className="font-mono text-neutral-400">{order.order_number}</span></div>
          </div>
        </div>

        {(order.fulfillment_type && order.fulfillment_type !== 'none') && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-5">
            <div className="text-xs text-neutral-500 mb-2">
              {order.fulfillment_type === 'delivery' ? 'Delivery' :
               order.fulfillment_type === 'pickup' ? 'Pickup' :
               order.fulfillment_type === 'digital' ? 'Digital delivery' :
               order.fulfillment_type === 'event' ? 'Event' : 'Service'}
            </div>
            {order.delivery_address && (
              <div className="text-sm mb-2 leading-relaxed">{order.delivery_address}</div>
            )}
            {order.fulfillment_instructions && (
              <p className="text-xs text-neutral-400 leading-relaxed">{order.fulfillment_instructions}</p>
            )}
            {!order.delivery_address && !order.fulfillment_instructions && (
              <p className="text-xs text-neutral-500">
                {order.business_name} will be in touch about how to receive this.
              </p>
            )}
          </div>
        )}

        {isCancelled ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-5">
            <div className="text-sm font-semibold text-red-400 mb-1">
              {order.status === 'refunded' ? 'Order refunded' : 'Order cancelled'}
            </div>
            <div className="text-xs text-neutral-400">
              {order.status === 'refunded'
                ? `${order.business_name} has marked this order as refunded.`
                : `${order.business_name} has cancelled this order.`}
            </div>
          </div>
        ) : (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-5">
            <div className="text-xs text-neutral-500 mb-4">Order status</div>
            <div className="space-y-4">
              {TRACKING_STEPS.map((step, i) => {
                const done = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${done ? 'bg-emerald-500' : 'bg-neutral-800 border border-neutral-700'}`}>
                      {done && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <div>
                      <div className={`text-sm ${done ? 'font-semibold' : 'text-neutral-600'}`}>{step.label}</div>
                      {isCurrent && <div className="text-xs text-neutral-500 mt-0.5">{step.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-8">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-white text-black rounded-xl py-3 text-sm font-semibold text-center">
              Contact {order.business_name}
            </a>
          )}
          {order.business_contact_email && (
            <a href={`mailto:${order.business_contact_email}?subject=${encodeURIComponent(`Order ${order.order_number}`)}`} className="block w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 text-sm text-center text-neutral-300">
              Email {order.business_name}
            </a>
          )}
          {order.business_slug && (
            <a href={`https://business.tranxact.co/${order.business_slug}`} className="block w-full text-center text-sm text-neutral-500 py-2">
              Back to store
            </a>
          )}
        </div>

        <p className="text-[11px] text-neutral-600 text-center leading-relaxed">
          Your order is fulfilled by {order.business_name}.<br />
          Powered by Tranxact
        </p>
      </div>
    </div>
  );
}

function BusinessStorefrontScreen({ slug }) {
  const [business, setBusiness] = useState(null); // null = loading, false = not found
  const [error, setError] = useState('');
  const [view, setView] = useState('list'); // list | detail | cart
  const [selectedItem, setSelectedItem] = useState(null);
  const [cart, setCart] = useState([]); // [{ item, quantity }]
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    getBusinessStorefront(slug)
      .then(setBusiness)
      .catch((e) => { setError(e.message); setBusiness(false); });
    trackStorefrontEvent(slug, 'store_visit');
  }, [slug]);

  if (business === null) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }
  if (business === false) {
    if (!slug) {
      return <BusinessMarketingScreen />;
    }
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
        <LogoMark size={36} />
        <p className="text-neutral-500 text-sm mt-6">{error || "This store link doesn't work."}</p>
        <p className="text-xs text-neutral-600 mt-2">Double-check the link, or ask whoever shared it for the right one.</p>
      </div>
    );
  }
  if (business.status === 'paused') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
        {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-2xl object-cover mb-4" /> : <LogoMark size={36} />}
        <h1 className="text-lg font-bold mb-1">{business.name}</h1>
        <p className="text-neutral-500 text-sm">This store is temporarily unavailable. Check back soon.</p>
      </div>
    );
  }

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + Number(c.item.amount) * c.quantity, 0);

  const addToCart = (item, qty) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.slug === item.slug);
      if (existing) {
        return prev.map(c => c.item.slug === item.slug ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, { item, quantity: qty }];
    });
    setView('list');
  };

  const updateCartQty = (itemSlug, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.item.slug !== itemSlug));
    } else {
      setCart(prev => prev.map(c => c.item.slug === itemSlug ? { ...c, quantity: qty } : c));
    }
  };

  const handleCheckout = async () => {
    setCheckoutError('');
    setCheckoutLoading(true);
    trackStorefrontEvent(slug, 'checkout_start');
    try {
      const result = await createCartCheckout(slug, cart.map(c => ({ slug: c.item.slug, quantity: c.quantity })));
      window.location.href = result.url;
    } catch (e) {
      setCheckoutError(e.message);
      setCheckoutLoading(false);
    }
  };

  if (view === 'detail' && selectedItem) {
    return (
      <ProductDetailScreen
        item={selectedItem}
        business={business}
        onBack={() => { setView('list'); setSelectedItem(null); }}
        onAddToCart={addToCart}
      />
    );
  }

  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-lg mx-auto px-5 py-8">
          <BackHeader title="Your picks" onBack={() => setView('list')} />
          {cart.length === 0 ? (
            <p className="text-sm text-neutral-600 text-center py-10">Nothing picked yet.</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {cart.map(c => (
                  <div key={c.item.slug} className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                    {c.item.image_url ? (
                      <img src={c.item.image_url} alt={c.item.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-neutral-900 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.item.title}</div>
                      <div className="text-xs text-neutral-500">{fmtNaira(c.item.amount)} each</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateCartQty(c.item.slug, c.quantity - 1)} className="w-7 h-7 rounded-full bg-neutral-900 text-sm">−</button>
                      <span className="text-sm w-4 text-center">{c.quantity}</span>
                      <button onClick={() => updateCartQty(c.item.slug, c.quantity + 1)} className="w-7 h-7 rounded-full bg-neutral-900 text-sm">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-sm text-neutral-400">Total</span>
                <span className="text-lg font-mono font-bold">{fmtNaira(cartTotal)}</span>
              </div>
              {checkoutError && <p className="text-sm text-red-400 mb-4">{checkoutError}</p>}
              <PrimaryButton onClick={handleCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Checkout'}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    );
  }

  const typeLabel = { product: 'Product', service: 'Service', event: 'Event', custom: 'Talk to Sales' };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <LogoMark size={18} />
            )}
            <span className="text-sm font-semibold truncate">{business.name}</span>
          </div>
          <button onClick={() => setView('cart')} className="relative p-1.5 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-violet-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      {business.cover_image_url && (
        <div className="w-full h-40 overflow-hidden"><img src={business.cover_image_url} alt="" className="w-full h-full object-cover" /></div>
      )}
      {business.is_paused && (
        <div className="max-w-lg mx-auto px-5 pt-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
            <div className="text-sm font-semibold text-amber-400 mb-1">This store is currently unavailable</div>
            <p className="text-xs text-neutral-400">
              {business.name} isn't taking new orders right now. If you already placed an order, it's unaffected.
            </p>
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto px-5 py-10">
        <div className="flex flex-col items-center text-center mb-10">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-2xl object-cover mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
              <LogoMark size={28} />
            </div>
          )}
          <h1 className="text-xl font-bold">{business.name}</h1>
          {business.category && <p className="text-xs text-violet-400 mt-1">{business.category}</p>}
          {business.description && <p className="text-sm text-neutral-500 mt-2 max-w-sm">{business.description}</p>}
        </div>

        {business.products.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-10">Nothing listed here yet.</p>
        ) : (
          <div className="space-y-3 pb-10">
            {business.products.map((p) => {
              const soldOut = p.inventory !== null && p.inventory !== undefined && p.inventory <= 0;
              const canQuickAdd = !soldOut && !business.is_paused && p.product_type !== 'custom' && p.link_type === 'fixed';
              return (
                <div
                  key={p.slug}
                  onClick={() => { setSelectedItem(p); setView('detail'); trackStorefrontEvent(slug, 'product_view', p.slug); }}
                  className={`w-full flex items-center gap-4 bg-neutral-950 border rounded-2xl p-4 text-left transition cursor-pointer ${soldOut ? 'border-neutral-900 opacity-50' : 'border-neutral-800 hover:border-violet-500'}`}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-6 h-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-violet-400 font-medium mb-0.5">{typeLabel[p.product_type] || 'Product'}</div>
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    {p.description && <div className="text-xs text-neutral-500 truncate mt-0.5">{p.description}</div>}
                    <div className="text-sm font-mono mt-1.5 mb-2.5">
                      {soldOut ? <span className="text-red-400">Sold out</span> : p.product_type === 'custom' ? 'Custom pricing' : p.link_type === 'fixed' ? fmtNaira(p.amount) : 'Flexible'}
                    </div>
                    {canQuickAdd ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(p, 1); }}
                        className="bg-white text-black text-xs font-semibold rounded-lg px-3.5 py-1.5"
                      >
                        Buy now
                      </button>
                    ) : p.product_type === 'custom' ? (
                      <span className="text-xs text-violet-400 font-medium">Talk to Sales →</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-6 pt-4 border-t border-neutral-900">
          <a href="https://tranxact.co" target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-600 hover:text-neutral-400 transition">Powered by Tranxact</a>
          <div className="mt-1.5">
            <a href="https://tranxact.co/#storefront" target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:text-violet-300 transition">Bring your business to Tranxact →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shown when tapping an item, not straight to checkout. Products/services/
// events with fixed pricing get a quantity picker and Add to Cart. Flexible
// pricing can't have a quantity, so it goes straight to its own checkout.
// Custom (Talk to Sales) items open a chat instead of any checkout at all.
function ProductDetailScreen({ item, business, onBack, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const soldOut = item.inventory !== null && item.inventory !== undefined && item.inventory <= 0;
  const maxQty = item.inventory !== null && item.inventory !== undefined ? item.inventory : 99;
  const typeLabel = { product: 'Product', service: 'Service', event: 'Event', custom: 'Talk to Sales' };

  const talkToSalesLink = () => {
    const msg = encodeURIComponent(`Hi, I'm interested in "${item.title}" from ${business.name}`);
    if (business.contact_phone) return `https://wa.me/${business.contact_phone.replace(/[^0-9]/g, '')}?text=${msg}`;
    if (business.contact_email) return `mailto:${business.contact_email}?subject=${encodeURIComponent(item.title)}&body=${msg}`;
    return `https://wa.me/2347058866702?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-5 py-8">
        <BackHeader title="" onBack={onBack} />
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full aspect-square rounded-2xl object-cover mb-5" />
        ) : (
          <div className="w-full aspect-square rounded-2xl bg-neutral-900 flex items-center justify-center mb-5">
            <Link2 className="w-10 h-10 text-neutral-700" />
          </div>
        )}
        <div className="text-xs text-violet-400 font-medium mb-1">{typeLabel[item.product_type] || 'Product'}</div>
        <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
        {item.description && <p className="text-sm text-neutral-400 mb-4">{item.description}</p>}

        {item.product_type !== 'custom' && (
          <div className="text-2xl font-mono font-bold mb-6">
            {soldOut ? <span className="text-red-400 text-lg">Sold out</span> : item.link_type === 'fixed' ? fmtNaira(item.amount) : 'Pay what you want'}
          </div>
        )}

        {item.product_type === 'custom' ? (
          <a href={talkToSalesLink()} target="_blank" rel="noopener noreferrer">
            <PrimaryButton>Talk to Sales</PrimaryButton>
          </a>
        ) : soldOut ? (
          <PrimaryButton disabled>Sold out</PrimaryButton>
        ) : item.link_type !== 'fixed' ? (
          <a href={`https://app.tranxact.co/pay/${item.slug}`}>
            <PrimaryButton>Continue</PrimaryButton>
          </a>
        ) : (
          <>
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 mb-4">
              <span className="text-sm text-neutral-400">Quantity</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-neutral-900 text-lg">−</button>
                <span className="text-sm w-4 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} className="w-8 h-8 rounded-full bg-neutral-900 text-lg">+</button>
              </div>
            </div>
            <PrimaryButton onClick={() => onAddToCart(item, quantity)}>Add to picks</PrimaryButton>
          </>
        )}
      </div>
    </div>
  );
}

function CreateBusinessScreen({ onCreated }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugStatus, setSlugStatus] = useState(''); // '', 'checking', 'available', 'taken'
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    setLogoUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setLogoUrl(url);
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  useEffect(() => {
    if (slug.length < 3) { setSlugStatus(''); return; }
    let cancelled = false;
    setSlugStatus('checking');
    const t = setTimeout(() => {
      isBusinessSlugAvailable(slug).then((available) => {
        if (!cancelled) setSlugStatus(available ? 'available' : 'taken');
      }).catch(() => { if (!cancelled) setSlugStatus(''); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [slug]);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      const business = await createBusiness({ name, slug, description });
      if (logoUrl) await updateBusiness(business.id, { logo_url: logoUrl });
      onCreated({ ...business, logo_url: logoUrl || null });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = name.trim() && slug.trim().length >= 3 && slugStatus === 'available';

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-2.5 mb-8">
        <LogoMark size={22} />
        <span className="font-bold text-lg">Tranxact Business</span>
      </div>
      <h1 className="text-xl font-bold mb-1">Create your business</h1>
      <p className="text-sm text-neutral-500 mb-8">Sell products, services, or events with your own page.</p>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-neutral-400 mb-2 block">Logo (optional)</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <LogoMark size={22} />
                )}
              </div>
              <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
                {logoUrl ? 'Change' : 'Upload'}
                <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              </label>
            </div>
            {logoError && <p className="text-xs text-red-400 mt-1.5">{logoError}</p>}
          </label>
          <Field label="Business name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaffar Designs" />
          <div>
            <label className="block">
              <span className="text-sm text-neutral-400 mb-2 block">Your link</span>
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <span className="text-sm text-neutral-500 flex-shrink-0">business.tranxact.co/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="yourbusiness"
                  className="bg-transparent outline-none text-white text-sm flex-1 min-w-0"
                />
              </div>
            </label>
            {slugStatus === 'checking' && <p className="text-xs text-neutral-500 mt-1.5">Checking…</p>}
            {slugStatus === 'available' && <p className="text-xs text-emerald-400 mt-1.5">Available</p>}
            {slugStatus === 'taken' && <p className="text-xs text-red-400 mt-1.5">Already taken</p>}
          </div>
          <Field label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do you sell?" />
        </div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
        <PrimaryButton onClick={handleCreate} disabled={!canCreate || loading} className="mt-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create business'}
        </PrimaryButton>
      </div>
  );
}

function AddProductScreen({ business, onBack, onAdded }) {
  const [step, setStep] = useState('choose'); // choose | product | service | event | custom

  if (step === 'choose') {
    const options = [
      { key: 'product', label: 'Product', desc: 'Something physical or digital you sell, with stock', icon: '📦' },
      { key: 'service', label: 'Service', desc: 'What you do for people, priced fixed or flexible', icon: '🛠️' },
      { key: 'event', label: 'Event', desc: 'Ticketed, with one or more price tiers', icon: '🎟️' },
      { key: 'custom', label: 'Talk to Sales', desc: 'Custom pricing, no checkout, just an inquiry', icon: '💬' },
    ];
    return (
      <div className="max-w-sm mx-auto px-5 py-8">
        <BackHeader title="Add to your page" onBack={onBack} />
        <p className="text-sm text-neutral-500 mb-5">What are you adding?</p>
        <div className="space-y-2">
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => setStep(o.key)}
              className="w-full flex items-start gap-3 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3.5 text-left hover:border-violet-500 transition"
            >
              <span className="text-xl flex-shrink-0">{o.icon}</span>
              <div>
                <div className="text-sm font-semibold">{o.label}</div>
                <div className="text-xs text-neutral-500">{o.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'event') {
    return <AddEventForm business={business} onBack={() => setStep('choose')} onAdded={onAdded} />;
  }

  return <AddSimpleItemForm kind={step} business={business} onBack={() => setStep('choose')} onAdded={onAdded} />;
}

// Handles Product, Service, and Talk to Sales — genuinely different in what
// fields they show, not one form pretending to cover all three.
function AddSimpleItemForm({ kind, business, onBack, onAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkType, setLinkType] = useState('fixed');
  const [amount, setAmount] = useState('');
  const [inventory, setInventory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const titles = { product: 'Add a product', service: 'Add a service', custom: 'Talk to Sales item' };
  const namePlaceholders = { product: 'Brand Guide PDF', service: 'Logo Design', custom: 'Custom Enterprise Plan' };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setImageUrl(url);
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleAdd = async () => {
    setError('');
    setLoading(true);
    try {
      await createPaymentLink({
        title, description,
        link_type: kind === 'custom' ? 'flexible' : linkType,
        amount: kind !== 'custom' && linkType === 'fixed' ? Number(amount) : undefined,
        business_id: business.id, product_type: kind,
        image_url: imageUrl || undefined,
        inventory: kind === 'product' && inventory !== '' ? Number(inventory) : undefined,
      });
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = title.trim() && (kind === 'custom' || linkType !== 'fixed' || amount);

  return (
    <div className="max-w-sm mx-auto px-5 py-8">
      <BackHeader title={titles[kind]} onBack={onBack} />
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Photo (optional)</span>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {imageUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              ) : imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-neutral-600" />
              )}
            </div>
            <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
              {imageUrl ? 'Change' : 'Upload'}
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          </div>
          {imageError && <p className="text-xs text-red-400 mt-1.5">{imageError}</p>}
        </label>
        <Field label="Name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={namePlaceholders[kind]} />
        <Field label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === 'custom' ? "What's this about?" : "What's included"} />

        {kind !== 'custom' && (
          <>
            <div>
              <span className="text-sm text-neutral-400 mb-2 block">Pricing</span>
              <TabToggle
                options={[{ value: 'fixed', label: 'Fixed amount' }, { value: 'flexible', label: 'Flexible' }]}
                value={linkType}
                onChange={setLinkType}
              />
            </div>
            {linkType === 'fixed' && <Field label="Amount (NGN)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />}
            {kind === 'product' && (
              <Field label="Stock (optional)" type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="Leave blank if not tracking stock" />
            )}
          </>
        )}
        {kind === 'custom' && (
          <p className="text-xs text-neutral-600 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5">No price is set here. Customers see a "Talk to Sales" button that opens a chat with you directly, instead of a checkout.</p>
        )}
      </div>
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleAdd} disabled={!canSubmit || loading} className="mt-6">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to page'}
      </PrimaryButton>
    </div>
  );
}

// Events are structurally different — no single price, one or more ticket
// tiers, each becoming its own real, checkout-ready payment link tied to
// the same event.
function AddEventForm({ business, onBack, onAdded }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [tiers, setTiers] = useState([{ name: 'General', amount: '', inventory: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setImageUrl(url);
    } catch (err) {
      setImageError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const updateTier = (i, field, value) => {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };
  const addTier = () => setTiers(prev => [...prev, { name: '', amount: '', inventory: '' }]);
  const removeTier = (i) => setTiers(prev => prev.filter((_, idx) => idx !== i));

  const canSubmit = name.trim() && tiers.length > 0 && tiers.every(t => t.name.trim() && t.amount);

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      await createStorefrontEvent({
        business_id: business.id,
        name, description: description || undefined,
        image_url: imageUrl || undefined,
        venue: venue || undefined, location: location || undefined,
        event_date: eventDate || undefined, event_time: eventTime || undefined,
        tiers: tiers.map(t => ({ name: t.name, amount: Number(t.amount), inventory: t.inventory !== '' ? Number(t.inventory) : undefined })),
      });
      onAdded();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-5 py-8">
      <BackHeader title="Add an event" onBack={onBack} />
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Cover image (optional)</span>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {imageUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              ) : imageUrl ? (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-neutral-600" />
              )}
            </div>
            <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
              {imageUrl ? 'Change' : 'Upload'}
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          </div>
          {imageError && <p className="text-xs text-red-400 mt-1.5">{imageError}</p>}
        </label>
        <Field label="Event name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Design Workshop" />
        <Field label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What to expect" />
        <Field label="Venue (optional)" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="The Yard, Lekki" />
        <Field label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date (optional)" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          <Field label="Time (optional)" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-400">Ticket types</span>
            <button onClick={addTier} className="text-xs text-violet-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add type</button>
          </div>
          <div className="space-y-3">
            {tiers.map((tier, i) => (
              <div key={i} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={tier.name}
                    onChange={(e) => updateTier(i, 'name', e.target.value)}
                    placeholder="e.g. VIP"
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  {tiers.length > 1 && (
                    <button onClick={() => removeTier(i)} className="text-neutral-600 p-1"><X className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={tier.amount}
                    onChange={(e) => updateTier(i, 'amount', e.target.value)}
                    placeholder="Price (NGN)"
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  <input
                    type="number"
                    value={tier.inventory}
                    onChange={(e) => updateTier(i, 'inventory', e.target.value)}
                    placeholder="Tickets (optional)"
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleCreate} disabled={!canSubmit || loading} className="mt-6">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create event'}
      </PrimaryButton>
    </div>
  );
}

// Lives as a tab inside WebDashboardApp — no auth of its own, since by the
// time this renders, WebDashboardApp has already confirmed a session. Same
// underlying business/product logic as before, just without the standalone
// login flow that only made sense when this was its own separate app.
// Business identity settings — name, description, logo. If no business
// exists yet (Storefront was never set up), points there first rather than
// showing empty fields with nothing real to save.
// Real orders, created by admin-settle every time a storefront item actually
// sells, cart or single-item. Nothing here is invented — if this is empty,
// nothing has genuinely sold yet.
// Real fulfillment sequence — matches the server-side enforcement exactly,
// so the UI can never offer a move the backend would reject.
const ORDER_NEXT_STATUS = {
  paid: [{ value: 'processing', label: 'Start processing' }, { value: 'cancelled', label: 'Cancel' }],
  processing: [{ value: 'ready', label: 'Mark ready' }, { value: 'cancelled', label: 'Cancel' }],
  ready: [{ value: 'completed', label: 'Mark completed' }, { value: 'cancelled', label: 'Cancel' }],
  completed: [{ value: 'refunded', label: 'Mark refunded' }],
  cancelled: [],
  refunded: [],
};

const ORDER_STATUS_STYLE = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  processing: 'bg-amber-500/15 text-amber-400',
  ready: 'bg-violet-500/15 text-violet-400',
  completed: 'bg-neutral-700/40 text-neutral-300',
  cancelled: 'bg-red-500/15 text-red-400',
  refunded: 'bg-red-500/15 text-red-400',
};

function DashboardOrders({ userId }) {
  const [business, setBusiness] = useState(null); // null = loading, false = none yet
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    getMyBusiness(userId).then(async ({ data }) => {
      setBusiness(data || false);
      if (data) {
        const { data: ord } = await getMyStorefrontOrders(data.id);
        setOrders(ord || []);
      }
    });
  }, [userId]);

  const changeStatus = async (orderId, newStatus) => {
    setError('');
    setUpdatingId(orderId);
    try {
      await updateStorefrontOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const copyTrackingLink = (o) => {
    const url = `https://business.tranxact.co/order/${o.access_token}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(o.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (business === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }
  if (business === false) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Orders</h1>
        <p className="text-sm text-neutral-500">Set up your Business first, then real orders show up here as they come in.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      {error && <p className="text-sm text-red-400 mb-4 max-w-md">{error}</p>}
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-600 py-6 max-w-md">No orders yet. They'll show up here the moment something real sells.</p>
      ) : (
        <div className="space-y-2 max-w-md">
          {orders.map(o => {
            const nextOptions = ORDER_NEXT_STATUS[o.status] || [];
            return (
              <div key={o.id} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-neutral-500">{o.order_number}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${ORDER_STATUS_STYLE[o.status] || 'bg-neutral-700/40 text-neutral-300'}`}>{o.status}</span>
                </div>
                <div className="text-sm font-medium">{o.payment_links?.title || 'Item'}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {fmtNaira(Number(o.payment_links?.amount || 0) * o.quantity)}
                  {o.customer_name && <span> · {o.customer_name}</span>}
                </div>
                {o.customer_contact && (
                  <div className="text-xs text-neutral-600 mt-0.5">{o.customer_contact}</div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {nextOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => changeStatus(o.id, opt.value)}
                      disabled={updatingId === o.id}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${opt.value === 'cancelled' || opt.value === 'refunded' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-white text-black'}`}
                    >
                      {updatingId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : opt.label}
                    </button>
                  ))}
                  {o.access_token && (
                    <button
                      onClick={() => copyTrackingLink(o)}
                      className="rounded-lg px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 text-neutral-400"
                    >
                      {copiedId === o.id ? 'Copied' : 'Copy tracking link'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Real customers, built up automatically from real orders — nothing entered
// manually. Kept minimal on purpose: name, contact, what they've spent,
// how often, nothing more invasive than that.
function DashboardCustomers({ userId }) {
  const [business, setBusiness] = useState(null); // null = loading, false = none yet
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    getMyBusiness(userId).then(async ({ data }) => {
      setBusiness(data || false);
      if (data) {
        const { data: cust } = await getMyStorefrontCustomers(data.id);
        setCustomers(cust || []);
      }
    });
  }, [userId]);

  if (business === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }
  if (business === false) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Customers</h1>
        <p className="text-sm text-neutral-500">Set up your Business first, then real customers show up here as they buy.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      {customers.length === 0 ? (
        <p className="text-sm text-neutral-600 py-6 max-w-md">No customers yet. They'll show up here after a real order comes in.</p>
      ) : (
        <div className="space-y-2 max-w-md">
          {customers.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{c.name || c.contact}</div>
                <div className="text-xs text-neutral-500">{c.order_count} order{c.order_count === 1 ? '' : 's'}</div>
              </div>
              <div className="text-sm font-mono flex-shrink-0">{fmtNaira(c.total_spent)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSettings({ userId }) {
  const [business, setBusiness] = useState(null); // null = loading, false = none yet
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyBusiness(userId).then(({ data }) => {
      setBusiness(data || false);
      if (data) {
        setName(data.name || '');
        setDescription(data.description || '');
        setCategory(data.category || '');
        setLogoUrl(data.logo_url || '');
        setCoverUrl(data.cover_image_url || '');
        setContactPhone(data.contact_phone || '');
        setContactEmail(data.contact_email || '');
        const social = data.social_links || {};
        setInstagram(social.instagram || '');
        setTwitter(social.twitter || '');
        setWhatsapp(social.whatsapp || '');
        setStatus(data.status || 'active');
      }
    });
  }, [userId]);

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setLogoUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setCoverUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await updateBusiness(business.id, {
        name, description, category: category || null,
        logo_url: logoUrl || null, cover_image_url: coverUrl || null,
        contact_phone: contactPhone || null, contact_email: contactEmail || null,
        social_links: { instagram: instagram || undefined, twitter: twitter || undefined, whatsapp: whatsapp || undefined },
        status,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (business === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }

  if (business === false) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-neutral-500">Set up your Business first, then your business details show up here to edit.</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Store status</div>
          <p className="text-xs text-neutral-500 mt-0.5">{status === 'active' ? 'Live: customers can view and buy' : 'Paused: your page shows as temporarily unavailable'}</p>
        </div>
        <button
          onClick={() => setStatus(status === 'active' ? 'paused' : 'active')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}
        >
          {status === 'active' ? 'Active' : 'Paused'}
        </button>
      </div>

      <label className="block mb-5">
        <span className="text-sm text-neutral-400 mb-2 block">Logo</span>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <LogoMark size={22} />
            )}
          </div>
          <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
            {logoUrl ? 'Change' : 'Upload'}
            <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
          </label>
        </div>
      </label>

      <label className="block mb-5">
        <span className="text-sm text-neutral-400 mb-2 block">Cover image</span>
        <div className="w-full h-24 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden mb-2">
          {coverUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
          ) : coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-neutral-600" />
          )}
        </div>
        <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer inline-block">
          {coverUrl ? 'Change' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
        </label>
      </label>

      <Field label="Business name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your business name" />
      <div className="mt-4">
        <span className="text-sm text-neutral-400 mb-2 block">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you sell?"
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500"
        />
      </div>
      <div className="mt-4">
        <Field label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Perfumes, Design, Fashion" />
      </div>

      <div className="mt-6 mb-2 text-sm font-semibold">Contact</div>
      <Field label="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+234..." />
      <div className="mt-4">
        <Field label="Email (optional)" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
      </div>

      <div className="mt-6 mb-2 text-sm font-semibold">Social links</div>
      <Field label="Instagram (optional)" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourbusiness" />
      <div className="mt-4">
        <Field label="X / Twitter (optional)" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@yourbusiness" />
      </div>
      <div className="mt-4">
        <Field label="WhatsApp (optional)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234..." />
      </div>

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleSave} disabled={saving || !name.trim()} className="mt-6">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? 'Saved' : 'Save changes'}
      </PrimaryButton>
    </div>
  );
}

// Every item here is checked against real data, nothing assumed complete.
// Collapses to a single summary line once everything's done, so it doesn't
// linger and clutter the page for an established store.
function StoreSetupChecklist({ business, products, userId, onGoSettings, onGoAdd }) {
  const [fullName, setFullName] = useState(undefined); // undefined = loading
  // Dismissal has to survive a reload — keeping it in memory alone meant a
  // finished checklist reappeared on every single page load.
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(`tx_checklist_dismissed_${userId}`) === '1'; } catch { return false; }
  });

  useEffect(() => {
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle()
      .then(({ data }) => setFullName(data?.full_name || null));
  }, [userId]);

  if (fullName === undefined) return null;
  if (dismissed) return null;

  const items = [
    // Category is optional in practice — a store with a real description is
    // set up. Requiring both meant the checklist could never complete.
    { label: 'Add store information', done: Boolean(business.description), onClick: onGoSettings },
    { label: 'Add your first item', done: products.length > 0, onClick: onGoAdd },
    { label: 'Add your name', done: Boolean(fullName), onClick: () => window.open('https://app.tranxact.co', '_blank') },
    { label: 'Customize your page', done: Boolean(business.logo_url || business.cover_image_url), onClick: onGoSettings },
  ];
  const doneCount = items.filter(i => i.done).length;
  const allDone = doneCount === items.length;

  const dismiss = () => {
    try { localStorage.setItem(`tx_checklist_dismissed_${userId}`, '1'); } catch { /* private mode, no-op */ }
    setDismissed(true);
  };

  // Once genuinely finished, it disappears for good rather than nagging.
  if (allDone) {
    return (
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-6 max-w-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-black" />
          </div>
          <span className="text-sm">Store setup complete</span>
        </div>
        <button onClick={dismiss} className="text-xs text-neutral-500 hover:text-white transition">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-6 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Store setup</span>
        <span className="text-xs text-neutral-500">{doneCount} of {items.length} completed</span>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <button key={i} onClick={it.done ? undefined : it.onClick} className="w-full flex items-center gap-2.5 text-left">
            {it.done ? (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-neutral-700 flex-shrink-0" />
            )}
            <span className={`text-sm ${it.done ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardStorefront({ userId, setTab }) {
  const [business, setBusiness] = useState(null); // null = loading, false = none yet
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('dashboard'); // dashboard | addProduct | editProduct
  const [editingItem, setEditingItem] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
  const [pausing, setPausing] = useState(false);
  const [pauseError, setPauseError] = useState('');

  const loadBusiness = async () => {
    const { data: biz } = await getMyBusiness(userId);
    setBusiness(biz || false);
    if (biz) {
      const { data: prods } = await getMyBusinessProducts(biz.id);
      setProducts(prods || []);
    }
  };

  useEffect(() => { loadBusiness(); }, [userId]);

  const refreshProducts = async () => {
    const { data: prods } = await getMyBusinessProducts(business.id);
    setProducts(prods || []);
  };

  const handleToggleStatus = async (item) => {
    setActionError('');
    setActionLoading(item.id);
    try {
      await setStorefrontItemStatus(item.id, item.status === 'active' ? 'paused' : 'active');
      await refreshProducts();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(null);
      setMenuOpenFor(null);
    }
  };

  const handleDuplicate = async (item) => {
    setActionError('');
    setActionLoading(item.id);
    try {
      await duplicateStorefrontItem(item.id);
      await refreshProducts();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(null);
      setMenuOpenFor(null);
    }
  };

  const handleDelete = async (item) => {
    setActionError('');
    setActionLoading(item.id);
    try {
      await deleteStorefrontItem(item.id);
      await refreshProducts();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(null);
      setMenuOpenFor(null);
      setConfirmDeleteFor(null);
    }
  };

  if (business === null) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>;
  }

  if (business === false) {
    return <CreateBusinessScreen onCreated={(biz) => { setBusiness(biz); setProducts([]); }} />;
  }

  const storefrontUrl = `https://business.tranxact.co/${business.slug}`;

  if (view === 'addProduct') {
    return (
      <AddProductScreen
        business={business}
        onBack={() => setView('dashboard')}
        onAdded={async () => { await refreshProducts(); setView('dashboard'); }}
      />
    );
  }

  if (view === 'editProduct' && editingItem) {
    return (
      <EditItemScreen
        item={editingItem}
        onBack={() => { setView('dashboard'); setEditingItem(null); }}
        onSaved={async () => { await refreshProducts(); setView('dashboard'); setEditingItem(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold">Business</h1>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${business.is_paused ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
          {business.is_paused ? 'Paused' : 'Active'}
        </span>
      </div>
      <p className="text-sm text-neutral-500 mb-4">{business.name}. Sell products, services, or events with a shareable page.</p>
      <div className="flex items-center gap-4 mb-6">
        <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-violet-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          Preview your page
        </a>
        <button
          onClick={async () => {
            setPauseError('');
            setPausing(true);
            try {
              const res = await setStorefrontPaused(!business.is_paused);
              setBusiness({ ...business, is_paused: res.is_paused });
            } catch (e) {
              setPauseError(e.message);
            } finally {
              setPausing(false);
            }
          }}
          disabled={pausing}
          className="text-xs text-neutral-400 hover:text-white transition disabled:opacity-40"
        >
          {pausing ? 'Saving…' : business.is_paused ? 'Resume store' : 'Pause store'}
        </button>
      </div>
      {pauseError && <p className="text-xs text-red-400 mb-4">{pauseError}</p>}
      {business.is_paused && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
          <p className="text-xs text-amber-300">
            Your store is paused. Customers can't place new orders, but existing orders are unaffected and still visible to them.
          </p>
        </div>
      )}

      <StoreSetupChecklist
        business={business}
        products={products}
        userId={userId}
        onGoSettings={() => setTab('settings')}
        onGoAdd={() => setView('addProduct')}
      />

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-4 max-w-md">
        <div className="text-xs text-neutral-500 mb-2">Your page</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-violet-400 font-mono truncate">{storefrontUrl.replace('https://', '')}</span>
          <button
            onClick={() => { navigator.clipboard?.writeText(storefrontUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-xs bg-neutral-800 rounded-lg px-3 py-1.5 flex-shrink-0 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6 max-w-md">
        <button
          onClick={() => { if (navigator.share) navigator.share({ title: business.name, url: storefrontUrl }); else { navigator.clipboard?.writeText(storefrontUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } }}
          className="flex flex-col items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl py-3"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
          <span className="text-[10px] text-neutral-400">Share</span>
        </button>
        <button onClick={() => setQrOpen(true)} className="flex flex-col items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl py-3">
          <QrCode className="w-4 h-4" />
          <span className="text-[10px] text-neutral-400">QR code</span>
        </button>
        <button onClick={() => setTab('settings')} className="flex flex-col items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl py-3">
          <Settings className="w-4 h-4" />
          <span className="text-[10px] text-neutral-400">Settings</span>
        </button>
        <button onClick={() => setTab('analytics')} className="flex flex-col items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl py-3">
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] text-neutral-400">Analytics</span>
        </button>
      </div>

      {qrOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-5" onClick={() => setQrOpen(false)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl p-3 inline-block mb-4"><BrandedQR data={storefrontUrl} size={200} /></div>
            <p className="text-xs text-neutral-500 mb-4 truncate">{storefrontUrl.replace('https://', '')}</p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(storefrontUrl)}`}
              download="storefront-qr.png"
              className="text-xs bg-neutral-800 rounded-lg px-4 py-2 inline-block"
            >
              Download QR
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 max-w-md">
        <h2 className="text-sm font-semibold">Your products</h2>
        <button onClick={() => setView('addProduct')} className="text-xs text-violet-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
      {actionError && <p className="text-xs text-red-400 mb-3 max-w-md">{actionError}</p>}
      {products.length === 0 ? (
        <p className="text-sm text-neutral-600 py-6 text-center max-w-md">Nothing added yet.</p>
      ) : (
        <div className="space-y-2 max-w-md">
          {products.map((p) => (
            <div key={p.id} className="bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-xs text-neutral-500">
                    {p.product_type} · {p.status}
                    {p.inventory !== null && p.inventory !== undefined && (
                      p.inventory > 0
                        ? <span> · {p.inventory} in stock</span>
                        : <span className="text-red-400"> · Sold out</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm font-mono">{p.product_type === 'custom' ? 'Custom' : p.link_type === 'fixed' ? fmtNaira(p.amount) : 'Flexible'}</div>
                  <button onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)} className="p-1 text-neutral-500">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                </div>
              </div>

              {menuOpenFor === p.id && (
                <div className="mt-3 pt-3 border-t border-neutral-900 grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setEditingItem(p); setView('editProduct'); }}
                    className="text-xs bg-neutral-900 rounded-lg py-2 text-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(p)}
                    disabled={actionLoading === p.id}
                    className="text-xs bg-neutral-900 rounded-lg py-2 text-center disabled:opacity-50"
                  >
                    {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : p.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDuplicate(p)}
                    disabled={actionLoading === p.id}
                    className="text-xs bg-neutral-900 rounded-lg py-2 text-center disabled:opacity-50"
                  >
                    Duplicate
                  </button>
                  {confirmDeleteFor === p.id ? (
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={actionLoading === p.id}
                      className="text-xs bg-red-500/20 text-red-400 rounded-lg py-2 text-center disabled:opacity-50"
                    >
                      {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Confirm?'}
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDeleteFor(p.id)} className="text-xs bg-neutral-900 text-red-400 rounded-lg py-2 text-center">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple, focused edit form — title, description, price, image, and stock
// (only for products). Reuses the same update action for every item type.
function EditItemScreen({ item, onBack, onSaved }) {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [amount, setAmount] = useState(item.amount != null ? String(item.amount) : '');
  const [inventory, setInventory] = useState(item.inventory != null ? String(item.inventory) : '');
  const [imageUrl, setImageUrl] = useState(item.image_url || '');
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // §7 — how this item is actually fulfilled. Drives whether checkout asks
  // the customer for a delivery address at all.
  const [fulfillmentType, setFulfillmentType] = useState(item.fulfillment_type || 'none');
  const [fulfillmentInstructions, setFulfillmentInstructions] = useState(item.fulfillment_instructions || '');

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const url = await uploadBusinessAsset(file);
      setImageUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await updateStorefrontItem(item.id, {
        title, description,
        amount: item.link_type === 'fixed' && item.product_type !== 'custom' ? Number(amount) : undefined,
        image_url: imageUrl || null,
        inventory: item.product_type === 'product' ? (inventory !== '' ? Number(inventory) : null) : undefined,
      });
      // Fulfillment lives behind its own ownership-checked function, so it's
      // a separate call rather than folded into the generic item update.
      if (item.slug) {
        await setItemFulfillment(item.slug, fulfillmentType, fulfillmentInstructions);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-5 py-8">
      <BackHeader title="Edit" onBack={onBack} />
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">Photo</span>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {imageUploading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-500" /> : imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-neutral-600" />}
            </div>
            <label className="text-xs bg-neutral-800 rounded-lg px-3 py-2 cursor-pointer">
              Change
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>
          </div>
        </label>
        <Field label="Name" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="block">
          <span className="text-sm text-neutral-400 mb-2 block">How do you fulfil this?</span>
          <select
            value={fulfillmentType}
            onChange={(e) => setFulfillmentType(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white"
          >
            <option value="none">Not specified</option>
            <option value="delivery">Delivery — I'll deliver to the customer</option>
            <option value="pickup">Pickup — customer collects</option>
            <option value="digital">Digital — sent electronically</option>
            <option value="service">Service — performed for the customer</option>
            <option value="event">Event — ticket or entry</option>
          </select>
          <p className="text-[11px] text-neutral-600 mt-1.5">
            {fulfillmentType === 'delivery'
              ? 'Checkout will ask the customer for a delivery address.'
              : 'Checkout will not ask for a delivery address.'}
          </p>
        </label>
        <Field
          label="Fulfilment note (optional)"
          value={fulfillmentInstructions}
          onChange={(e) => setFulfillmentInstructions(e.target.value)}
          placeholder="e.g. Collect at 12 Allen Ave, Mon–Fri 9–5"
        />
        {item.link_type === 'fixed' && item.product_type !== 'custom' && (
          <Field label="Amount (NGN)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        )}
        {item.product_type === 'product' && (
          <Field label="Stock (leave blank for unlimited)" type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} />
        )}
      </div>
      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
      <PrimaryButton onClick={handleSave} disabled={!title.trim() || loading} className="mt-6">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
      </PrimaryButton>
    </div>
  );
}

// The single real entry point. Decides which experience to render based on
// which domain someone's actually on. pay.tranxact.co redirects straight
// into the app — TranxactPay already lives there in full, so the separate
// merchant dashboard has nothing unique left to offer; business.tranxact.co
// is purely a public storefront viewer — no login, no dashboard, just what a
// customer sees when they open a shared link or track a real order;
// everything else gets the normal mobile-first app.
export default function TranxactApp() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // window.Capacitor only exists inside a Capacitor-wrapped native app —
  // never in a normal browser, so this never fires for app./pay./business.
  // tranxact.co today. A native shell has no meaningful hostname to detect
  // from, so it always gets the consumer app specifically, never the web-
  // only dashboard or storefront experiences.
  const isNativeApp = typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
  if (isNativeApp) return <MobileAppRoot />;

  // pay.tranxact.co no longer has its own experience — TranxactPay (create a
  // link, view existing ones, get paid) already lives fully inside the app
  // itself. WebDashboardApp and every Dashboard* screen underneath it are
  // left untouched, just unreachable by normal navigation — nothing here is
  // deleted, only this one routing branch changed.
  if (hostname.startsWith('pay.')) {
    if (typeof window !== 'undefined') {
      window.location.href = `https://app.tranxact.co${pathname}${window.location.search}`;
    }
    return null;
  }

  if (hostname.startsWith('business.')) {
    const parts = pathname.replace(/^\//, '').split('/');
    // A real customer order tracking page, reached by a random access token
    // — never the sequential order number, which would be trivially guessable.
    if (parts[0] === 'order' && parts[1]) {
      return <OrderTrackingScreen token={parts[1]} />;
    }
    return <BusinessStorefrontScreen slug={parts[0]} />;
  }

  return <MobileAppRoot />;
}
