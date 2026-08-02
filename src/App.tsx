import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Bell, ArrowDownToLine, ArrowUpFromLine, Link2, Smartphone, Wifi, Zap, Tv,
  Trophy, Home, LineChart, Bitcoin, CreditCard, User, ChevronLeft, ChevronRight, Copy, Share2,
  Check, X, QrCode, Plus, Lock, Mail, ArrowLeft, LogOut, ShieldCheck, Settings, Wallet, ArrowRight,
  UserCircle, Users, Landmark, Loader2
} from 'lucide-react';
import {
  supabase, signUp, signIn, requestPasswordReset, signOut,
  getProfile, getWallet, getCryptoAssets, getDepositAddress, getRecentTransactions
} from './lib/supabase.js';

// ---------- Demo data ----------
const ASSETS = [
  { symbol: 'USDT', name: 'Tether', network: 'TRC20', address: 'TXk9Qm2vD8yZp4Rj7Ln3fQ2xVh5tYc9Bwe', price: 1550.2, change: 0.02 },
  { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p8x9z2mk4', price: 150775000, change: 2.4 },
  { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', address: '0x71C7656EC7ab88b098defB751B7401B4B2a1234', price: 5394000, change: -1.2 },
  { symbol: 'SOL', name: 'Solana', network: 'Solana', address: '7xKXtg2CW3ed1qUFysrDDpQ3merWaK4Q3zJvyPq3m', price: 332475, change: 5.1 },
];

const BILLS = [
  { label: 'Airtime', icon: Smartphone },
  { label: 'Data', icon: Wifi },
  { label: 'Electricity', icon: Zap },
  { label: 'TV', icon: Tv },
  { label: 'Betting', icon: Trophy },
];

// Maps a real transactions-table row to what TransactionRow expects to render
function mapTransaction(row) {
  const byType = {
    crypto_deposit: { title: `${row.crypto_asset || 'Crypto'} received`, icon: ArrowDownToLine },
    send_user: { title: `Sent to ${row.counterparty || 'user'}`, icon: ArrowUpFromLine },
    send_bank: { title: 'Bank transfer', icon: ArrowUpFromLine },
    bill_payment: { title: row.description || 'Bill payment', icon: Smartphone },
    fund_bank: { title: 'Wallet funded', icon: ArrowDownToLine },
    referral: { title: 'Referral earning', icon: Users },
    tranxactpay: { title: row.description || 'Payment link', icon: Link2 },
  };
  const meta = byType[row.type] || { title: row.type, icon: Wallet };
  const pending = row.status === 'pending';
  return {
    id: row.id,
    title: meta.title,
    sub: pending ? 'Pending settlement' : (row.counterparty || row.description || ''),
    amount: row.amount_ngn != null ? Number(row.amount_ngn) : 0,
    time: new Date(row.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
    icon: meta.icon,
  };
}

const NAV = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'rates', label: 'Rates', icon: LineChart },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
  { key: 'cards', label: 'Cards', icon: CreditCard },
  { key: 'profile', label: 'Profile', icon: User },
];

const BANKS = ['Access Bank', 'GTBank', 'Zenith Bank', 'UBA', 'First Bank', 'Kuda', 'Opay', 'Moniepoint', 'Wema Bank', 'Fidelity Bank'];

const LEADERBOARD_ALLTIME = [
  { name: '@zainab_k', amount: 240500 },
  { name: '@michael.o', amount: 198200 },
  { name: 'You', amount: 18500 },
  { name: '@fadeke', amount: 12300 },
  { name: '@chuks_b', amount: 9800 },
];
const LEADERBOARD_MONTH = [
  { name: '@michael.o', amount: 42500 },
  { name: 'You', amount: 18500 },
  { name: '@zainab_k', amount: 15200 },
  { name: '@fadeke', amount: 6300 },
  { name: '@chuks_b', amount: 4100 },
];

const fmtNaira = (n) =>
  `₦${Math.abs(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ---------- Small shared UI ----------
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
  return (
    <div className="flex flex-col gap-[3px] justify-center" style={{ width: size }}>
      <div className="h-[3px] rounded-full bg-white" style={{ width: '70%' }} />
      <div className="h-[3px] rounded-full bg-white" style={{ width: '50%' }} />
      <div className="h-[3px] rounded-full bg-white" style={{ width: '100%' }} />
      <div className="h-[3px] rounded-full bg-white" style={{ width: '40%', marginLeft: '30%' }} />
      <div className="h-[3px] rounded-full bg-white" style={{ width: '70%', marginLeft: '30%' }} />
    </div>
  );
}

// ---------- Auth screens ----------
function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <LogoMark size={24} />
          <span className="font-bold text-lg tracking-tight">Tranxact</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-neutral-400 text-sm mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, goSignup, goForgot }) {
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
    <AuthShell title="Welcome back" subtitle="Log in to continue to your wallet.">
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

function SignupScreen({ onSignup, goLogin }) {
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const { data, error: err } = await signUp({ email, password, username: cleanUsername, fullName });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (!data.session) { setNeedsConfirmation(true); return; }
    onSignup();
  };

  if (needsConfirmation) {
    return (
      <AuthShell title="Check your email" subtitle="">
        <p className="text-neutral-400 text-sm mb-8">
          We've sent a confirmation link to {email}. Verify your email, then log in.
        </p>
        <PrimaryButton onClick={goLogin}>Back to login</PrimaryButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Money, simplified — set up your wallet in a minute.">
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

function ForgotScreen({ onSent, goLogin }) {
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
    <AuthShell title="Reset your password" subtitle="Enter the email on your account and we'll send a reset link.">
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
        <div className="font-mono text-3xl sm:text-4xl font-semibold tracking-tight mb-1">
          {visible ? fmtNaira(balance) : '₦ • • • • • •'}
        </div>
        {visible && <div className="text-neutral-500 text-sm mb-5 font-mono">≈ ${(balance / 1550).toFixed(2)}</div>}
        {!visible && <div className="mb-5" />}
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

function ServiceTile({ label, icon: Icon }) {
  return (
    <button className="flex flex-col items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-2xl py-4 hover:bg-neutral-900 transition active:scale-[0.98]">
      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-neutral-400">{label}</span>
    </button>
  );
}

function TransactionRow({ tx }) {
  const positive = tx.amount > 0;
  const Icon = tx.icon;
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-neutral-900 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-neutral-300" />
        </div>
        <div>
          <div className="text-sm font-medium">{tx.title}</div>
          <div className="text-xs text-neutral-500">{tx.sub}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-mono text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {positive ? '+' : '-'}{fmtNaira(tx.amount)}
        </div>
        <div className="text-xs text-neutral-500">{tx.time}</div>
      </div>
    </div>
  );
}

// ---------- Home ----------
function HomeScreen({ balanceVisible, toggleBalance, onFund, onReceive, onSend, onTranxactPay, onSeeAll, displayName = '', balance = 0, transactions = [] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Hi, {displayName} 👋</h1>
          <p className="text-neutral-500 text-sm">Welcome back</p>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center hover:bg-neutral-900 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
          <button className="text-xs text-neutral-500 hover:text-white transition">See all</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {BILLS.map(b => <ServiceTile key={b.label} label={b.label} icon={b.icon} />)}
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
            {transactions.slice(0, 3).map(tx => <TransactionRow key={tx.id} tx={tx} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- History ----------
function HistoryScreen({ onBack, transactions = [] }) {
  return (
    <div>
      <BackHeader title="Transaction History" onBack={onBack} />
      {transactions.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl py-10 text-center">
          <p className="text-sm text-neutral-500">No transactions yet</p>
        </div>
      ) : (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl px-4">
          {transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}
        </div>
      )}
    </div>
  );
}

// ---------- Crypto receive (shared: used by Receive, Fund Wallet, Crypto tab) ----------
function CryptoReceivePanel() {
  const [assets, setAssets] = useState(null); // null = loading
  const [selected, setSelected] = useState(null); // { symbol, name, network }
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

  const openAsset = async (a) => {
    if (!a.is_receivable) return;
    setSelected(a);
    setAddress(null);
    setError('');
    setAddressLoading(true);
    try {
      const result = await getDepositAddress(a.symbol);
      setAddress(result.address);
    } catch (e) {
      setError(e.message);
    } finally {
      setAddressLoading(false);
    }
  };

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-white transition mb-4">
          <ChevronLeft className="w-4 h-4" /> Choose a different coin
        </button>
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
              <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center mb-5">
                <QrCode className="w-24 h-24 text-black" />
              </div>
              <div className="text-xs text-neutral-500 mb-2">{selected.name} · {selected.network} network</div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 w-full text-center font-mono text-xs text-neutral-300 break-all mb-4">
                {address}
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <GhostButton onClick={() => { navigator.clipboard?.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                </GhostButton>
                <GhostButton><Share2 className="w-4 h-4" /> Share</GhostButton>
              </div>
            </>
          )}
        </div>
        {!addressLoading && !error && (
          <p className="text-xs text-neutral-600 text-center mt-4">
            Only send {selected.symbol} on the {selected.network} network to this address. It's converted to naira automatically at the current rate and credited to your wallet.
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
            <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xs">
              {a.symbol.slice(0, 1)}
            </div>
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
        We don't hold crypto — pick a coin, get your address, and whatever lands there is converted to naira and credited to your wallet.
      </p>
      <CryptoReceivePanel />
    </div>
  );
}

// ---------- Fund Wallet ----------
function FundWalletScreen({ onBack, username = '' }) {
  const [mode, setMode] = useState('bank');
  const [copiedField, setCopiedField] = useState(null);

  const ACCOUNT_NUMBER = '6436425418';
  const BANK_NAME = 'Moniepoint';
  const ACCOUNT_NAME = 'Tranxact Technologies Ltd';
  const reference = `TRX-${(username || 'USER').toUpperCase()}`;

  const copy = (field, value) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div>
      <BackHeader title="Fund Wallet" onBack={onBack} />
      <TabToggle
        value={mode}
        onChange={setMode}
        options={[
          { value: 'bank', label: 'Bank Transfer', icon: Landmark },
          { value: 'crypto', label: 'Crypto', icon: Bitcoin },
        ]}
      />

      {mode === 'bank' && (
        <div className="space-y-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Bank Name</div>
              <div className="text-sm font-medium">{BANK_NAME}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Account Number</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-semibold tracking-wide">{ACCOUNT_NUMBER}</span>
                <button onClick={() => copy('account', ACCOUNT_NUMBER)} className="text-neutral-500 hover:text-white transition">
                  {copiedField === 'account' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Account Name</div>
              <div className="text-sm font-medium">{ACCOUNT_NAME}</div>
            </div>
          </div>

          <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-5">
            <div className="text-xs text-violet-300 mb-1">Your reference — required</div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-semibold tracking-wide text-violet-200">{reference}</span>
              <button onClick={() => copy('ref', reference)} className="text-violet-300 hover:text-white transition">
                {copiedField === 'ref' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-violet-300/70 mt-2">
              Paste this exactly into the transfer's narration/remark field. Without it, we can't match your payment to your wallet.
            </p>
          </div>

          <p className="text-xs text-neutral-600 text-center">
            Transfer any amount to this account with your reference included. It's credited to your wallet once confirmed.
          </p>
        </div>
      )}

      {mode === 'crypto' && <CryptoReceivePanel />}
    </div>
  );
}

// ---------- Send (naira only — Tranxact user or bank account) ----------
function SendScreen({ onBack, onDone }) {
  const [mode, setMode] = useState('user');
  const [step, setStep] = useState('form');
  const [username, setUsername] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');

  const resolvedName = accountNumber.length === 10 ? 'ADAEZE C. OKAFOR' : '';
  const recipientLabel = mode === 'user' ? `@${username}` : `${resolvedName || accountNumber} · ${bank}`;
  const canReview = mode === 'user' ? (username && amount) : (accountNumber.length === 10 && amount);

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center text-center pt-10">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-5">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold mb-1">Sent successfully</h2>
        <p className="text-neutral-500 text-sm mb-8">{fmtNaira(Number(amount) || 0)} is on its way to {recipientLabel}.</p>
        <PrimaryButton onClick={onDone}>Done</PrimaryButton>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div>
        <BackHeader title="Confirm" onBack={() => setStep('form')} />
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 mb-6">
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Recipient</span><span>{recipientLabel}</span></div>
          {mode === 'bank' && <div className="flex justify-between text-sm"><span className="text-neutral-500">Bank</span><span>{bank}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Amount</span><span className="font-mono">{fmtNaira(Number(amount) || 0)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-neutral-500">Fee</span><span className="font-mono">₦0.00</span></div>
        </div>
        <PrimaryButton onClick={() => setStep('success')}>Confirm &amp; Send</PrimaryButton>
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
              <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
                <Landmark className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <select
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className="bg-transparent outline-none text-white text-sm w-full appearance-none"
                >
                  {BANKS.map(b => <option key={b} value={b} className="bg-neutral-900">{b}</option>)}
                </select>
              </div>
            </label>
            <Field label="Account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" />
            {resolvedName && <div className="text-sm text-emerald-400 -mt-2">{resolvedName}</div>}
          </>
        )}
        <Field label="Amount" value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00" />
        <PrimaryButton onClick={() => setStep('confirm')} disabled={!canReview} className="mt-2">Review</PrimaryButton>
      </div>
    </div>
  );
}

// ---------- TranxactPay sheet ----------
function TranxactPaySheet({ onClose }) {
  const [view, setView] = useState('menu');
  const [linkAmount, setLinkAmount] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [tipMode, setTipMode] = useState('fixed');
  const [copied, setCopied] = useState(false);
  const slug = 'tranxact.co/pay/david-' + Math.random().toString(36).slice(2, 6);

  const MOCK_LINKS = [
    { name: 'Design consultation', amount: 45000, status: 'Active', views: 12 },
    { name: 'Tip jar', amount: null, status: 'Active', views: 34 },
    { name: 'Studio session', amount: 20000, status: 'Expired', views: 5 },
  ];

  const header = (title, back) => (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {back && (
          <button onClick={back} className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:bg-neutral-800 transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">

        {view === 'menu' && (
          <>
            {header('TranxactPay')}
            <div className="space-y-2">
              <button onClick={() => setView('accept')} className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-800 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><ArrowDownToLine className="w-4 h-4 text-violet-400" /></div>
                  <span className="text-sm font-medium">Accept Payment</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
              <button onClick={() => setView('tip')} className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-800 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><Plus className="w-4 h-4 text-violet-400" /></div>
                  <span className="text-sm font-medium">Tip Me</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
              <button onClick={() => setView('links')} className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-800 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><Link2 className="w-4 h-4 text-violet-400" /></div>
                  <span className="text-sm font-medium">My Links</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          </>
        )}

        {view === 'accept' && (
          <>
            {header('Create Payment Request', () => setView('menu'))}
            <div className="space-y-4">
              <Field label="Amount (optional)" type="number" placeholder="0.00" value={linkAmount} onChange={e => setLinkAmount(e.target.value)} />
              <Field label="Description (optional)" type="text" placeholder="What's this for?" value={linkDesc} onChange={e => setLinkDesc(e.target.value)} />
              <PrimaryButton onClick={() => setView('created')} className="mt-2">Create Link</PrimaryButton>
            </div>
          </>
        )}

        {view === 'tip' && (
          <>
            {header('Tip Me', () => setView('menu'))}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTipMode('fixed')} className={`rounded-xl py-2.5 text-xs font-medium border transition ${tipMode === 'fixed' ? 'bg-white text-black border-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>Fixed amount</button>
                <button onClick={() => setTipMode('open')} className={`rounded-xl py-2.5 text-xs font-medium border transition ${tipMode === 'open' ? 'bg-white text-black border-white' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}>Sender chooses</button>
              </div>
              {tipMode === 'fixed' && <Field label="Amount" type="number" placeholder="0.00" value={linkAmount} onChange={e => setLinkAmount(e.target.value)} />}
              <PrimaryButton onClick={() => setView('created')} className="mt-2">Create Tip Link</PrimaryButton>
            </div>
          </>
        )}

        {view === 'created' && (
          <>
            {header('Payment link created', () => setView('menu'))}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-5">
              <div className="text-violet-400 text-sm font-mono break-all mb-2">{slug}</div>
              {linkAmount && <div className="font-mono text-xl font-semibold mb-1">₦{Number(linkAmount).toLocaleString()}</div>}
              {linkDesc && <div className="text-xs text-neutral-500">{linkDesc}</div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GhostButton onClick={() => { navigator.clipboard?.writeText(slug); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy link'}
              </GhostButton>
              <GhostButton><Share2 className="w-4 h-4" /> Share</GhostButton>
            </div>
          </>
        )}

        {view === 'links' && (
          <>
            {header('My Links', () => setView('menu'))}
            <div className="space-y-2">
              {MOCK_LINKS.map((l, i) => (
                <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{l.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-500'}`}>{l.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-mono">{l.amount ? `₦${l.amount.toLocaleString()}` : 'Open amount'}</span>
                    <span>{l.views} views</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Rates ----------
function RatesScreen() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Rates</h1>
      <p className="text-xs text-neutral-600 mb-6">Updated every 10 minutes</p>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
        {ASSETS.map(a => (
          <div key={a.symbol} className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-mono text-xs">{a.symbol.slice(0, 1)}</div>
              <div>
                <div className="text-sm font-medium">{a.symbol}</div>
                <div className="text-xs text-neutral-500">{a.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">₦{a.price.toLocaleString()}</div>
              <div className={`text-xs font-mono ${a.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {a.change >= 0 ? '↑' : '↓'} {Math.abs(a.change)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Crypto ----------
function CryptoScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Crypto</h1>
        <p className="text-sm text-neutral-500">We don't hold crypto — payments you receive are converted to naira automatically at the current rate.</p>
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
  return (
    <div className="pt-4">
      <h1 className="text-xl font-bold mb-6">Cards</h1>
      <div className="relative max-w-sm mx-auto">
        <div className="relative rounded-3xl p-6 h-48 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-600/20 rounded-full blur-2xl" />
          <div className="flex items-center justify-between relative z-10">
            <LogoMark size={20} />
            <div className="w-9 h-6 rounded-md bg-gradient-to-br from-neutral-400 to-neutral-600" />
          </div>
          <div className="relative z-10">
            <div className="font-mono text-lg tracking-widest mb-3">•••• •••• •••• 4821</div>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>{fullName ? fullName.toUpperCase() : 'YOUR NAME'}</span>
              <span className="font-mono">12/28</span>
            </div>
          </div>
        </div>
        <span className="absolute top-4 right-4 text-[10px] font-semibold bg-white text-black px-2.5 py-1 rounded-full z-10">
          Coming Soon
        </span>
      </div>
      <p className="text-sm text-neutral-500 text-center mt-6 max-w-xs mx-auto">
        Virtual and physical Tranxact cards are on the way.
      </p>
    </div>
  );
}

// ---------- Profile ----------
function ProfileScreen({ onLogout, onOpenReferrals }) {
  const items = [
    { label: 'Account details', icon: UserCircle },
    { label: 'Username', icon: User },
    { label: 'Referrals', icon: Users, onClick: onOpenReferrals },
    { label: 'Verification', icon: ShieldCheck, badge: 'Verified' },
    { label: 'Security', icon: Lock },
    { label: 'Settings', icon: Settings },
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
    </div>
  );
}

// ---------- Referrals ----------
function ReferralsScreen({ onBack, onEarnings, onLeaderboard }) {
  const username = 'david';
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <BackHeader title="Referrals" onBack={onBack} />
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 mb-4 text-center">
        <p className="text-sm text-neutral-500 mb-2">Your referral code</p>
        <div className="font-mono text-2xl font-semibold mb-4">@{username}</div>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton onClick={() => { navigator.clipboard?.writeText(username); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy code'}
          </GhostButton>
          <GhostButton><Share2 className="w-4 h-4" /> Share</GhostButton>
        </div>
      </div>
      <div className="space-y-2">
        <button onClick={onEarnings} className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-4 hover:bg-neutral-900 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center"><Wallet className="w-4 h-4 text-violet-400" /></div>
            <span className="text-sm font-medium">Referral Earnings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-neutral-400">₦18,500.00</span>
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
    </div>
  );
}

function ReferralEarningsScreen({ onBack }) {
  const [withdrawn, setWithdrawn] = useState(false);
  return (
    <div>
      <BackHeader title="Referral Earnings" onBack={onBack} />
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm text-neutral-500 mb-2">Available balance</p>
        <div className="font-mono text-3xl font-semibold mb-5">₦18,500.00</div>
        <PrimaryButton onClick={() => setWithdrawn(true)} disabled={withdrawn}>
          {withdrawn ? <><Check className="w-4 h-4" /> Withdrawn to wallet</> : 'Withdraw to Tranxact Wallet'}
        </PrimaryButton>
      </div>
      <h2 className="text-sm font-semibold mb-2">How it works</h2>
      <p className="text-xs text-neutral-500">
        Earn a share every time someone signs up with your code and transacts. Withdraw anytime to your main wallet balance.
      </p>
    </div>
  );
}

function LeaderboardScreen({ onBack }) {
  const [range, setRange] = useState('all');
  const data = [...(range === 'all' ? LEADERBOARD_ALLTIME : LEADERBOARD_MONTH)].sort((a, b) => b.amount - a.amount);
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
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl divide-y divide-neutral-900">
        {data.map((row, i) => (
          <div key={row.name} className={`flex items-center justify-between px-4 py-3.5 ${row.name === 'You' ? 'bg-violet-500/10' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="w-5 text-sm text-neutral-500 font-mono">{i + 1}</span>
              <span className={`text-sm ${row.name === 'You' ? 'font-semibold text-violet-300' : ''}`}>{row.name}</span>
            </div>
            <span className="font-mono text-sm text-neutral-400">₦{row.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- App shell (nav) ----------
function AppShell({ tab, setTab, children }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-neutral-900 p-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-10">
          <LogoMark size={22} />
          <span className="font-bold tracking-tight">Tranxact</span>
        </div>
        <nav className="space-y-1">
          {NAV.map(n => (
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

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 py-8 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neutral-900 flex justify-around py-2.5 z-40">
        {NAV.map(n => (
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
export default function TranxactApp() {
  const [screen, setScreen] = useState('checking'); // checking | login | signup | forgot | forgotSent | app
  const [tab, setTab] = useState('home');
  const [homeView, setHomeView] = useState('main'); // main | fund | receive | send | history
  const [profileView, setProfileView] = useState('main'); // main | referrals | earnings | leaderboard
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tpOpen, setTpOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const loadUserData = async (userId) => {
    const [{ data: p }, { data: w }, { data: t }] = await Promise.all([
      getProfile(userId),
      getWallet(userId),
      getRecentTransactions(userId),
    ]);
    setProfile(p);
    setWallet(w);
    setTransactions((t || []).map(mapTransaction));
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserData(session.user.id).then(() => setScreen('app'));
      } else {
        setScreen('login');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserData(session.user.id).then(() => setScreen('app'));
      } else {
        setProfile(null);
        setWallet(null);
        setScreen('login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setScreen('login');
  };

  if (screen === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (screen === 'login') return <LoginScreen onLogin={() => {}} goSignup={() => setScreen('signup')} goForgot={() => setScreen('forgot')} />;
  if (screen === 'signup') return <SignupScreen onSignup={() => {}} goLogin={() => setScreen('login')} />;
  if (screen === 'forgot') return <ForgotScreen onSent={() => setScreen('forgotSent')} goLogin={() => setScreen('login')} />;
  if (screen === 'forgotSent') return <ForgotSentScreen goLogin={() => setScreen('login')} />;

  const displayName = profile?.full_name?.split(' ')[0] || profile?.username || '';
  const balance = wallet ? Number(wallet.balance) : 0;

  return (
    <AppShell tab={tab} setTab={(t) => { setTab(t); setHomeView('main'); setProfileView('main'); }}>
      {tab === 'home' && homeView === 'main' && (
        <HomeScreen
          balanceVisible={balanceVisible}
          toggleBalance={() => setBalanceVisible(v => !v)}
          onFund={() => setHomeView('fund')}
          onReceive={() => setHomeView('receive')}
          onSend={() => setHomeView('send')}
          onTranxactPay={() => setTpOpen(true)}
          onSeeAll={() => setHomeView('history')}
          displayName={displayName}
          balance={balance}
          transactions={transactions}
        />
      )}
      {tab === 'home' && homeView === 'fund' && <FundWalletScreen onBack={() => setHomeView('main')} username={profile?.username || ''} />}
      {tab === 'home' && homeView === 'receive' && <ReceiveScreen onBack={() => setHomeView('main')} />}
      {tab === 'home' && homeView === 'send' && <SendScreen onBack={() => setHomeView('main')} onDone={() => setHomeView('main')} />}
      {tab === 'home' && homeView === 'history' && <HistoryScreen onBack={() => setHomeView('main')} transactions={transactions} />}

      {tab === 'rates' && <RatesScreen />}
      {tab === 'crypto' && <CryptoScreen />}
      {tab === 'cards' && <CardsScreen fullName={profile?.full_name || ''} />}

      {tab === 'profile' && profileView === 'main' && (
        <ProfileScreen onLogout={handleLogout} onOpenReferrals={() => setProfileView('referrals')} />
      )}
      {tab === 'profile' && profileView === 'referrals' && (
        <ReferralsScreen
          onBack={() => setProfileView('main')}
          onEarnings={() => setProfileView('earnings')}
          onLeaderboard={() => setProfileView('leaderboard')}
        />
      )}
      {tab === 'profile' && profileView === 'earnings' && <ReferralEarningsScreen onBack={() => setProfileView('referrals')} />}
      {tab === 'profile' && profileView === 'leaderboard' && <LeaderboardScreen onBack={() => setProfileView('referrals')} />}

      {tpOpen && <TranxactPaySheet onClose={() => setTpOpen(false)} />}
    </AppShell>
  );
}
