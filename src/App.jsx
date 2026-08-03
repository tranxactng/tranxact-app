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
  const LOGO_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAQQAAADWCAYAAAA3ifyaAABawklEQVR42u29e5xlVXEvXrX26eEhEZDHCAgRR4WMgkTBB0joIaImJibi7UEB0Xj1eq8XHyje/PxdsWeiUQM+g/6In5sroEKwh6joTTAIdoMXEUJ4iiAvgchMmAkwwwwy3WevVb8/9npU1Vr7DAxMz2BWaTPd5+zH2muvqlX1rRfC05uQiAwiWgCAU0455SUH/M4B71984OKX7rjjji/ZddddAQCweCLiUzgKAAQEIn83Iv9ZfntEBCLyfxGEXzdvPOn8vucidQD/nojE9+gHPTc3B/fcc4/duHHjD2+++eYLTjvttIsAYK0xBk477TSzfPlyB5UqbWvCoGkaAAB4139915EX/+AHl69cufJR5xxFckTOOiLnf+ffUfos/BAROX/syB91je464Vrs8/Crc+lvJ8/LKFyPnDhGjNPJscvnofxecS7YfFDP/RWte+QRuu6G6+4866tnnQIAOwAATE1NNXX5VdqmhIExBgDgt7759fM/vWrVqmFYwG3bWmutHQ6H1M61ZIeWrLXknCNrLVnX/e6sIxd+D39bx/4mIpszXzg2MG34u7tHuJ4VzMv/DT/WWqJ4X5sdY61V4+m4PY2VghRSAomNjws668i1lpy14tpc0oXj26GlubkhzW2cs0TUhrm94sc/vuaQQw45vAqFStuamdAAwG5nf+3sn4a9bm5u2Fq250UmbfnuLxlSM10QHElguMT0jqQwYQykf8J19D25ULLOCwKr7qsEgnWWrHVE1oljySZ1gAu0+FzO5c8WjmmtGCOxsYbzW3atubk5R0RzRERXX33NI3/6R3/0agCAiYmJKhQqbV2anp4eAABceOGFF3nenx3OtYUdXjEmMfVa7cSW7dBCUFjN7GlDtS4/RmgBxHZmW9r1SdxXC4Rg7nDtJruWPjcKEFsYe/7D5yIKr3BevH46rm3bIRHRVVdd9dDxxx+/qzEGJicnTV2VlbYKec0APv/ZL/6/XhjMWbaAu53PpZ1cL/6CLZ6bEVKg2KAlZMwvhYB1NhM8/LpxR3dEZLsfYeIztV/iAa471kpB4bh2wE0GK4VDSXMpCR9i55MlIUjTYIiGw2FLRPTDSy75EQCMEVEVCL9BZJ5mY3VHH/2GfY553TEfBwByzjVoMMDn3Q9QjzBxGeJORID+f+Q9Ax68j4g8AgASAiABiWt3iDwBxesAhXNJXBsQgOLXBBSu5VF+ou734DIgCvfy/8XkteBjSI8Tb9zdj3sN+LMWPBDhXt0YIN4PAf0Y/cCxu58xprHWtkf+3u8tOfOLZ74ZEV3FE6pA2BraASIivetd7/jQi1+8eDvnnDXGGIC00BEkQ4cP0HNkYjR23cBImlmQ4rU6ZkHhQXTk0nfqWhAEARce4VpR2nghxgQABY4MQohdH6mTABjOZS5DMXYjHk4INyoIjO5c/y/GIaVnRYLurl4iOAJnLW633Xbu8CMPPw0AtpuYmCDoce9WqgJhiwCJAOAO2G233/rdQw56s9cOTNi6uiUbFnRiRiTIFz8xRkFIO7u+G2emGFGAcWsO8QSJqZJ2EBkfk3bC78evE3ZuLZAcuHhPijs3Y2rPyDqWIOz0nQxMIoqIAClpNEIwFgRlvKmf4fA7IYIxTeOcowMOOGDxRz/60TcgopucnKxaQhUI86sdnPoXn9l/r733+m1nLRpjjKO4d3U8wBiLiMB5ZnHOgQMndmfquKNjT4NChRY7fmQsxjSlIKJobqRrdTwtVfVonig1Pv7uHyb+DgDIzJUgwLQOwrWZOE5KUtGgSUIMEQwaEUTFzSAvAqKmQkEj8nPsXb70jGc8gw466KDjAQCWLVtGlZ2qQJgXmpmZMQAA62d//dqdd34mmaZpA2M4R0CEkkcRmBkhd/DIUISJ4ZnqzYVK0CiS2i5tcoMm35WDZoDBtCiYKJhrIuJe+lnAxHFFDILkfdCbNFwDQcD4nPEZQAo/ErhJDLWM+El4tmRydP8xnfsX99133/2VoVapCoQtTeMAALBo0fN2AgB0zgmVPsJ1YvEmoI+AJLMz04Lb7YFB427Nw4oRMkYNPwZN2q8ZUwoAEEleywunABj22ko81BgY6IiUmT/x3/Ac7NpcKAjhF00SCg8fzbBwMQICckygIIADaBAR2rb9HQBYZIxxTzOQulKBBk8LcdDJA9h+++2tVrUxxvNjXPhIGHdzQhWrz3byeGwQIBQWu0uCxeMEhq31qPKD9ApwjUGDldHbwLQJLrzEGAGE5yI+g1NCApPWEp9HCaaoFQXthaTZkiyg8KzdjTCYFMEM8mPoBFHy5pjG7AAA22kPTqUqELacycCwhGgrRy+jX6yUdkLBMGGhE2MKvvsyNV3Y6f5vZIIGGJYeNQiUgiFoBtzscM5JZmcgqPZkRtMG1X25lkEotAsE7Gx8Zf7wa2bChdRcSbVEJGB1YzVBreHTDda21VyoAmErE2Lc1dICVUg79qvd3MbmzMyFgWBSroqDtJg1MEhIiWGBMvNDaypifIzxRQwBkPSIsPgHIQSoIGT4fHC8gAnLaOZob0nwZkSsEVOchb+Jc1UWVAxhqyAInMENcKd5YmVpuwscXu/sJUbRgUmEuXBhwUYcL0AWawCY4hQ4kwtzAfLUZK72axAQtNCDJGgi8t8jDKIrliQw2kfcm5KezX/qp89ZOWWVqkCYf3VmEIbruo1LqNskQD6xsAHAOeV25K45Soh8SSuIjOyZMmAMkdEDIzOgkrsNOdgZAT91jMYPMubU+AIlkyQKEMqfTZgeyIBG5t0QQoK4lkQsmjF5KYkAyI5wwVaqAmF+RmtyVZgY8MWYNjIVd+tx5mPMr12F8XPNyIrJMs2Ag3lK3Tcci4Cegigo0X8dCRnviShMBTkPEqvIbyFByKgBqehOBj7kpgaLssQKH1QMYVuQXsFVJmxfKOAG2u5XCz9DxxX2UPo+AHoaaOT30YzPg5oD4wuhpe8LlHk6+pi8qLcXzs1Mp8JlKJoKcmDBcxLG3wygaghVQ9g6NDMzAwAAv9640SsKJkXIIGTBRNqVBwBALg/mSSp3GSzMvmfqPjEQkQjKiVGYQpQ103IzJOPlgguPsWZZEGBJELK5CF4T0s/KMBXgKRYpaEknQRGlZ7PWChFSqQqEeaMbr7/RRI6IxixksfwhcCkLxAnIP/RrBWJnj/EGQY4w8yCAdT5Kkvh9DGp1JbEMKYZGFnkY4gC0CeC9KswTKFUlIED/LznKpZvXFAK2IgQRUTYnWWQmKnyj+94BAIwNFtwCAHc5cgZipESlKhC2IK1Zs4YAAB55ZMOPHn54LVprG3Ip8w9Z2rMOBJImQt+uzLULJkhUPDTXMJCDmfq6JH8YE2npAx26ELAI7EKdOWahcQ2UAi5JoxRVyHd1oIK3FCX4aEzKc+BBj12ClQc/jbyG6/yNdN9996wCgNnKSlUgzBstXbrUERF+5StfuvXee+55sGkacNZGx5xPBRTJO8SyDlNwTwpfFolMwkxAFZgDMnsx/m6Yyo1gDEZ3owApRZi0tgGYxEIJ+gn8gQkbowDFqAEwjEJkUDLBEoKXtCzMTZQU4UhCS/HaT6dt0NzcLN56663fBQBYtmxZDVuuoOK8EQHAYMOGDWsefOihcwHgQ2CwRYODpErnajaPHOQ2djGaD9UOnxv2KaMyeuYLmIMuu67NFOSgIUm8Q8URJPOFDyNFBZSKnvQBhrG8Cnt2gyaP3ITcbRkzQ9P3zjSmufH6mx782tfOWeGzUW1lp6ohzBstW7bMTU5Omi984ctn379y5YbBYICE5DqmYDt5zCNggBql7bpYVERjdZgj87H+EU+K0gBlSYxlwUfcJIEynkEcdMzQSAWequ96sD2EPJsz94Rw6JJUfgRG08c0xlrrcGb6ii888MADq2dmZhqo4cuV5l1N8DUVf/CDH76PiMhaO8f7FoQCqXlNxVDS0GW9GYol2H0ZdhfrJaYCq7HuqA3XLRQwjVWPC8VOrayxGMbaV4LdWvkcsocEK81e/Mn7N+girvHvvqKsvI8DEbXD4ZCIaGZm5gYA2MG/k+piqBrC/BMi2unp6cHrX3/MmT/5vz+5xBgzZp0dRoSeBycpTcCgrgcgaypm2zjGiCYwiIDIuy1RrKiGAIVow1TnEQ1m2gZ6rwMvaZZCkQkQDMuG5NcliRNAukbRTKBCpifHRJhpQlg2OwgIrHNgrYO2bdtmMBj88p571px55pknGWMeg17naaVK86MlhL4M2998442X+I1rODs7Z+2Q9TmwshtT7IRk9Q5LqpKx/0hUHSbVsIXySsY2b5DiKO/45GJTFFkpuViKnWk+RLLzVHge3i2qr9S6Y1qIeFYnOznpytNhnLOzQzc7O5wjIrr7rrsfOP30Lx4MUPsyVNpGaHJy0vgyXtuvmFqxYv369eRNiNZaO7QdB9li2XHruuYtsbFJx3Bt25Ybt1gnf1w6hwsE3t9BXIc1PMnG07LvW1tsFCMarOh7BJPClrtPWdYIpmXXbnUzF8vK2Hc/znYNsNrW2ti56corr/zZiUtPfLF/B4O6EittU5qCFwrw8Y9//G2XX3H5rRs2bNCtCUMrsvrzxH4E/fzWW9eee/bZZwDAAoDaxu03mZ7uYBB6l5cDgB0++ZnPjL/isMPevOvOuxzzvOft3zyy/pF9QvlwYnZ4RPojzmAATKohmJIdUQQhJe+AAWQVlV0sLyaMcPWZqg7NviUgERUpS8OxMGhRj0BMQp6mESIjmdciOD1UnhcrodZ9vsMOOzy0fsOG9WvXrr3xvnvv/e773vc/Ll258q5/rd2fq0B4WtDU1FTzlre8xYbKRAAwOOqoowaPPfbYq3BsbIDW0pAYbNa2YAEArHedNw00A6YBt91/BoOBj9QYALRt+n4wgEEDALaBtp2F2bYFAAsA3cbZsOPir3zAg4H4u21bf8tWPFe4YjeO7hxxXLh+OJ/fgt2n9feIz83HyO41QCQiwsFgcNPVV1/9YLidF4aNF7wVQKz09BBuU1NTDRENjKlBc096MrsALjM9PT2o/RurhvC0fy4igqVLl9aFvHkal8OQ8lipUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSo9GfpNrnSDkwAIkwDQ/efpScuXA0w+mfEv9/9OFr9b7r+eZPdYvnx5LXpS6elPIZeBiAzWjkJPapsgIkNExtc9qJNZNYSnlyCYmJhwiKIv0Q4A8FwA8Fn8ADAHsGAB/wBgbm6uO2TBguy64bu+79mR4pp91xl9jXgwzI34Wl6jfF8+7nhed/Imn2/BTjvBhoceehgA/i0uEkRwzjW1snIVCNs8+bRcCwBw8skn/8GJJ5542NiCBX+w6y677Pnggw8+LyxofzBrAYexjkDfxGTdCpjWUWq3Js/Lr8C7L4WK0LrjczqL91fD0eNib5LYf3jTFV13MbZnC3UlfT0IbBrYYfvtH9phhx3u+NnPfrb6nrvv/vbJ73//CgB4lIjMsmXLoNZDqLRNCjMiMt7+Pfqaq6/+0Zo1a6jSU0tt29Jtt91217nfOPd9YeJrOnTVELZFYYCI6L7znYs+f8QRh5+yxx67AwDYtrWEvscZIphQGanbaE2+v/ptlO/Wo/WEXGvo0xZAV0ou7O2idZzuGPs4Xh8KzYD0Y6X7hufkXep8+SQEWUKJHBAAOeccoDEwGDQNAMB1//Ivl57x2c++/YILLlg5NTXVLF26tJoQVSBsdRPB9xxBd+edd567aNGikwDAzs21gIhN16eQRMu21BItdXLipdK6X2SXZyKmbiPGpqgoOruqEwCBQr/TwGi+Q3Rshyb6L3asi6wvIxbeTKwKD75vS2jrBuj7L0qBg4CZfAlj57InlJTrBELX1bkrM++f3R/ryLrBYGABYOy+++677cILL3zNhz/84fs9eFvNh98getoVyxwfHx/sv//+5qqrrj7n4IMPOsk5NySipmkaY0zW3TUxsCxJmL6PHZlSs9fQD0H1ei0IA9ZzATumQjBZTcOsbwIbD28nF2odxkauHgkwZFh/iXAsxXPCvUTz21KfBSaAuntQ7C8Z602yrnKIXQvLpmkQABrn3HCXXXZZuMcee7zhpptu+u473vGORwDAXH755dVFWWn+aXp6egAA8OW/PusU30pg1sVWSqx7U5s6HqUuBuwYJ8utx34NttDFyaZS5xS6OenvnZVdjlzeCUp2ZpKfWXYPUVKdj8/lfROss+JZZLl3KnaMCqXZ4/VivwpKnaasE/0kHKU5btt2SEQ0NTV1KwA8w+M41S1ZaX5pcnLSEJE57rjj9v3Vv96/ioha21rLu6Ckhd/1F0jMw9a3K/QxsInBYus2K4/lTJn6J/i+B7EHgi00cOH9FlSTFCVUSn0dZAMWWxRIzreF4z0WkjBxWa8HzvBcaERhYYl4/7YoTIk64dXS3HA4pE996lPv5YK6UqX5xA4aAICzv3bu14iI5maHQ2dT1yLWY4kcyd3SMrlR6uOYNVAJfRfjjskZ2QnBEwQIb94im7tYIWzEbt3TUanUuSnTFLimY3UPSNbUpaDx8M9IzUEQbKIPJIXxEbVDS7Mb5ywRuauuuuo+AHhm1RJ+c+jp4j5CAHD77bzzroce9tI/AAAyBk1A54lyRB94T0QEcORSW3bRL1FhA/57x1u0F1B/0SeBukhfLCH24ZL+OO5pMHr6RbMEAHAMf4hhCbH/vGjiIDAP33gy/u2fgXed5rfhT2ew423hOYm9Mru5GRtrDDhwB7/k4H0//MEPvgkR3eTkZG3eUgXC/HkWEJE+8NGPvmC//fZ7tnMOTdMYQAQi539S89OOAQstzwmydujd78kLEZq4IKEA/IDFNhFjbC5gSDE8IP/B6HkQx1Bqvd5dKngcAAi9h8JfSzZoDcIOi33ou+dH1qhFPrsPT47eFhBNZ5mk4I1hEcEYA2gMWLKw4w470osOPvgtAIDLli2rwGIVCPNDMzMzBgDAGnPMM5/5TDLGtMj9BDwQMXOr5Rs8hd2VUqemwCxBEJSiEvXnwDwC4XMubJIfIj9HC5PEykHb8H87GR+R3YfHHkTXJPOZssjIEB2pPw/OBuLdozCNJQgDjOMKLkzCF7zwBbtC7QBdBcK80vg4AAAsXvziAfAuaAhsN6NMJQeUjMB3W72rx12aMSYXBDHUF6jYej24+sipcGUoBy5xjYC7GOOxQVipwCdxLWSBUSR3df2c4lyUAjPGSSgBGt2XlEwpiq7JLoGMnHs+ADwHUixUpSoQtrA88P8uWDCg8k4LQIgZQ4k9i/9dCgwkyOz/LrAIBLPE2H+19sPnEOMYsIwNKMxARy+Ka+NoNovaQrhvifkBgDa1efP50PejQmxHRC0Ahm27GwDs4hPLqkCoAmE+TIbu3zb0bnQsBBdSRGD43ZGTCxygAB4WBEPhcwIJxAVtw5GLgkJHCIbdP2IKWhCBFBhhvOEzBw4IPQ6AZbMlPgu38T1LGjTCtChHV0KmFWnhgdglPYHhTgQU80qdStRWVqoCYT5FQpAIwbBW3CWxAc5s2ubW6QJ9n2e7MQWzQarjImPRq9UI2DE05F6HkkDQAGOmIQTmJEyCRqn/wtToewjvuXhcpCIrESnOLxGAdVFAYdUMfnPoaRFQMu6NhtjEFQ3jXSqCbNluHZiVUO7+lFx7xOxk4ZL0u3YK/TXxXsYYwaAobQ5w5KRXg3rCikFqIEWeLgKQSQCN1nwo292FO9NrJMjMgqSVQJfnQGnOyRLAGHsnlapAmG8QwcT26g4QDBAVGMRAnsHYk7QoEo0gJT5hYcPjAsaBAwTsfPYEOegX3IvZ5xLLyMBGhKJHIppAoLQBUO5UYEKNUnpjEBjc/An4CPXET8j5QmFMEM8FwSoQqsmwrRBRZpeH/2WMPSqTGYXOntxvPTs/irgFknY9dK5PnmUZsQ7CzNTg53KUP3otiKSnhChzdYbPxXjRRzOEgCJIJgc3KyJw2mfGgCzeAiEj0x9qDCYRN1kZqmoI8wIqdhjC0A7JY4ppsTOkPcLcyJiVq/4FFD6LN0AEpJL5nR9fxAZUZiPyMkmbMrUJCm7NBN734hEM7EtCBdXY5fdRY+GmCqugFE0Q9o/xk9ulhHdfWOcwrqPllaGqhjCPdOeddy4AGWScRwaW/g27LmGvpkFEnodSVQJeU4EZ1vF4qamQV88BiFwRT6AYNUi9mACWwL2wqyPTYIT3QRoauUs0F2oZ2JpbCHF+w7iIaTOm6eogGDR3AMC9RLTpajKVqobwVNCaNWs6OM/iVXNzc9g0psEoyzCiANGGdv1FQjifQVCXo7rOVGNWkFAyNmZWBpqEJVDYRYlSbQJg5Ryjmt5pI8K04GHVhTgCJF67gIOHBACGVU+i3B3K4iw0dtEFGHX4iw5W4lgLeuzARysSAMCa1Q/8GwCs95tLLZZSNYQtTxMTEw4A4PLLL7v+/l/d/6gxBq11FBYnlnbjGKSUB/5AXNg8r4DKajtC54sv7MCx+lLBnBCMHQqvCAcd5i5ShgdI0wOLag/PxeA4giibFo5FygUNi77MMBYWRRlNL0raUtMgAYBbteqBiwEAQ3h5pSoQtjghIhFR853vfGfVnXfddSWicYBo0fDAJK4+Sx86X/ScganHtdcJChAZhli4bnQpxgQlaRIQN0e0So4g65QlG0gAhUldUWHXlJsGmfcC+80I4EKPoJijoUOcwcci2KElANP84rbbzPe///3vIALNzMxU7aCaDPNHS5cuBQCAf/zHf/rcyw877LU777Izka9XGNH7GG+AKgUaWFRhF8bQuQULNjSxEukB2XeJgdDnKwgffkT+E7gX85awFAaZmyCp3HpB3Tds/LF6KuVGPzLjHxGyUu4ck1TxEE5kPUpgUwc6WWddA01z0y23fO2SSy65g5fCr1Rp3igUSZmZmTmfl/Pi1X5EYRCny5DxIiGh6AerdKQqCWWFS3xBFl6cJN3PqsIorGSZK1U/8j9ExZJpophJVvXIVzRjzxWLmJTuZbtSa6y4lCwWY2WxFWd5tSReO4loOBw6ImpvvvnmDa95zRv3NsbUsuyVtppAQCIyJ5544p63/+L2lUTkhsPhkBx1JdNaR671FZJ4xR9WVSmvXegrBPm6grqsWF81I1GbMAgG11OhiNUudFk9RVusm6jHkddn9I8VhBeVx8mrJ2mBwYWCrMfoij0ahu3QEdHchg2P0rJly94NAOBbvVWqtHVoamqqAQB45ztPeuOtt97qiIja4XA4HA7Jtl0txVgYlFIhUVkejTGSlVth2rlLO3OsOiq2Tb0jE9+0mUDq0xTCeLVgSNeX13NOFUF1rlACTj5L6RnFNXhtSVV+zjmi4dzQElE7NxzSl7505pnQ9caoVZIqbX0Ku9IJJ5zwpttuu+1Ozzd2dna2bYetk8xU3mEDE3BmJbXjFpk3MqhTlRwpL0rKr1kqWqqvoS4lmJlyoZJ95kYIKHLFz3sFlXXUDls3Oztr52bbloho9erV9OlP/9WXvLZW6yhW2vaEwn777bfXN7/5zYt/df/9ogMZEQ3rz5P+8bhBS9dee+3PPvjBD/4xw3KqMKi0bZoPAADvfve7j7rw29+euv6GG/699nh88vTYY4/Rbb/4Rfv97//Dz7/8pS+/EwDGmGZQ6TeUfhO6P3vvXvTD7X7iiSe+5ogjjth9770XgnOEoa4KT9V1zgFY63tXdXKlC7Wz6eP4lf/ehKMSOXBgXArRi99macEOnIPungAATQMAVl7b6VA/ywZh1TgfD1l5CZDPGm/KrmjMAB595BG4+vrr21tuuunSSy+99F4AmDPGwAUXXFD7OVZ6etDExERTQa6nnpqmqSZC1RCe3s80OTnZjPvCrJU2j3yGqVu+fHmtqFypUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlTafHk+kIk5MTJj3vve9WKP/KlV6amhmZgZmZmZg+fLlFp4mkaA4PT09qL37KlXagkzWleI320oZuqKGMDU11Rx33HHWV+9dcOzSY1934AsPfOU+++xzwG677kZdhqHxyXJus4rxG2O67L/NLOUvMxc3/zoArA9iaHnW0+Fp08LRZw6Gf/y4ShmQzrkn1ig1JCWmRdRlbKYZAWNAfabmyrk8CzN8xs5z2TXVp4Vx6w5Y8dl7nrE0znRtVN0kNzE1/FrG9JYSz7p09YzDgBFJrSPndBNjClml4e+maejXj/0aNzy64dqf3fSzO/7mb/7mKgBYCQAwPT09WLJkSbtNCYSvfvWrY+95z3uGALDPGWeccfLRS45+w9777HXQwmfvVdPdKlV6Cmnt2rVwxx23P3L9DTf8ny98+Qufvu2m237mK1i7rWVGoNopERHpf/4/Hz/uT4/947869LBDf9t/ZQGAus0k7YK6K3HaiXydgCBmjdrp4q/smCSeR+6Szh9j1K6ZJLKJ1+6T+HwcJf3GgImfm8Kgitd2/DAH4Ng9HTzuDhjOleettLmL+TRQKMpQ1jB6P1PvBgyA0c8x4h1lUxDerylc37ju2lAel7iWKcxNdoobvXOz8TjDrsOeqbs+X2DqwVw6Lte+/Bgo5y49Jmf9/btk/QEAwG233fboFVdcuew973nXZzvt2W2V1nixHRARGUSEr5711b9888R/+vPddnsWDOfaFhBM0xgT+hwEdZX3DgCQjUB4o9VSb4LYVYj1UhBNWfWxwt5KAyfRd8B/SnmnJkIS7dzjOeFvzLsxheeI3YtQfhY7OBMWxgyxdxtSatEuxlToKBX7KJJsQyebzJE4nndp4h2l5UOy5q16oKW2EWr+Rav5wgKi3CaO4zFg4r0RULaRKzSS0W3m+LvpNiDVckY96ig1VvS7CJ21HGXX4V21S8+VmSGUBBJvISjWBV9vrpt4IgJrLQGCHVswNnCO4Ac/+Mfz3vCGP/ogET3kz3fzLhBCo43Pf/aL537gg+87yTTGDodDNKYx/MG7FoKxU0jsQ4rhRZJsLwZEwPqZpCYoqvNyWNDxhamXHLsIUVrFWqik61FqZtIjrOT1g8AA37yE0ngQgAizXiu8HyMfMxJv9Ezx3NBghcDli6TQgbmXccXxQYCmuQ9jCM/E3lS8ThCOpf6PvONTFKSxm3x6V+FY3hSHiPTQYg/LcHoSlGzhIIR23p0AIeMfgt/PPxP7mxjSINYK618p2+nJZ8x7WBIgmvjueCe8JHTT2MOa1K3xUhNdKZ2EMIm/xoULRI6apmkBYOzvzj//uuNPOOEwf715rUdhgjA4+2/Pfsd/++/vOck0Zs45Z8bGxowxaUEHfiGvFRE5uQjCJGBpLWP8PZoZYjOPPcNAtTEWfRqD3qEbLyfNLnAFZgwcW62h3k34M7jUJRoRgIyQHUQ50JUasfpjMKi46UzXXVQIJoRSezW2YNTCzbUn8gJI6qiEbExsGKlTthI6xDQTRECDqcMVey9h/pAUU1GuVoi+kiaOVvwbmclJkI+YwCemsTtwaXkQ5M8emmQje89sDQH0vDsC2b4vvmfM3gWJexEQZ2wiMGjSOY43BSchzMnzeACqEQFM0yARjQHA3FuPP/6lK1asOAMR3dTU1Lx6H5ply5bBo48++uxjjz32h3su3NNYa5vGGCSU7cYw26ogtTaj0DgVVQd2Uju4Wth8S8lak2G2c2bnIcixFNVGzNVIZIwRni12QOuON8HbEDcNisIRvdBJmoRvuErI5FHav/LnlbsJW1OQWsZhQbVGqTGgEhzY0/kZ5Pyntm8o7tcJhU1tR5jNPybRUXhnxqvVJDaMqFWFNYQQTSXec1KbDVEDxTRX2fORMnniDo/ZpkXozRpK3e3CeDnzZ+8kvoegsaB4z5T136S4FhARDBrfRDjwSDc257oNeuGeex4xtsBc/oEPnPLLqampZsWKFfOiJSAAwKWX/uj03//9JR9xzrUGzYDb1VIlCjZc0I+xYAuqBUUlCJOSSOfrXJkSWqXWTBTt+YJNGc2YKLTkkPkLFVsKjvRPFno1ymuRaLseWyrmTKavRf2+n1KL+MczB8T7NeKmFgI+bjcffy2ZYNM2c2A4oPx9guhdO/JuWIY4Rptx/NmIMrMrW2+l15Ns4rh50OM09TLTmKTwBWIbrcfHyDmw1tmxBQP8yU9+cvkRRxxxtMf35gVLMC9/+VHP2Weffd7lH70B9JKcMEk0tiVE26mg4mJJXQfqxzIxn9jizkjqTYW254iiS7F+obyRKgKX2gXGEysTY8NlqZZi3q1Z/ItJL6DcFk22ZLJFeUt2Afxh/+LSApPK3eIFwMUHgYRlE4VA/ZD8KU0bIjPJSHStRkwt5Pk9k1bD3pXqeh1+IpZAebfuEiPr+IVOGLgci6F8vSXGTWCh3pCoZx6yd0X5eRLsDRhcEAapSzgabKx18MIXHrDkIx/5yBJEdBMTE/NSQNhMTLzxrYsW7b+ra7uREWHUKDl/lEBAQkrmP3uo7KUxHKBvdyopFVRivmjCSCQYC/gDxz6ASXFhK1Jn6hTVGmQLg3rA7NAKHpldFNRvwt49r7QghfpCyjguLcqgZnMbFfX2y9rVU9lzk3V6RnaukA9URtoB/TjYNSNwmdRuvY606SBUbDH3JAQ2CvyCo/0kwO0o6OKmkYSVEJJM+FMwbQSKwTdDjK+JsndCObaUmRpyPclxEBOyzu2++27wspe97CQAgKmpqXnBEAYve9nLDh8bGyPbWgIwcVDkRx0ANmHD+Rbl0WXD7TXCHLijXPXlaDB/QYJpuVuSaypUcDUxb0BYFB0QpWxP5W1ABmAFBuZuVVTqdlT5hGsVxUstuuoEeEUCeEPEkTYdd0dm2ABK5iDXgVvkF390FxNmdnVx96KCwq5NOErvOm4KPiYjeR/68Q3BMFydR+nRIkz8g1rIqQ0jgILEsJ7gQYjvVc+1H6NBIzQw7m7mQj+5ptVa95iT8yaaCe5xLGkzwfSgqFEGYSJXARoigv322+9VAIBN08xLPwzTNPji7r2QQVI6I5ecXJKHk9EIDUHYr0i9WgBnsrhAXFogQavgsQ8Zl4QFZpJNFgQBjynQrqHAPOHfCAyyxS3ur3ajeB5J70n0z2GPucRVVUKxmEA7lkiCaOl15GaSts35XIjdCSEJCTWf6Zk00EllT0gQMAxkTe429Ttg9kzhd9NBt2KXlh6jHCCUHpMee51UTAFCeR2x+dKmRHG9Ub7GwjmOgZ1cGGi4FQG7te58+Dk5JlQjqgmIaBDRLdhuu/333HPPg5xzMB9mg3l0w6PP7ybGYOcCwZInSey8yNRQLuXFzsk1BeyxizUDEeUqHCTMoE/V5Wo037kzO5ekyojKp4zUo4EoZo3aE1NFS8BdZAgqgIZYDnDJF78UxJnKrt7DJlFkVPgIBVcdlQ7OcZwCEMzdh0KosTUQ7pHeaTduR455DfpUpKQmEFEXMuugV6iJ8ISCmRrei9AC9HrEMh4jxjpyzAzPwDw4yYHz859AoE4ZN8L8fcaOOy7Yf//9d5i3OITOVEi7OrLFF00DZo9xoSAWbQmxJigGEGXouA5AQsbwxOUsZviCEFIFYcO/Ly28DMSkpKKHvx24HCVH+QxaWAmgju/QULDDsV846oAhrVWE5+LmBPCgHG6aQAGwxXQdg6bfjEGQpg6lnV4I5oIdHYBMbrYITU3PgzCJMEYRI3C3Lwhhq80OLUSFt0z9r+jNUUK3qDmQXvNlrAgc9WqNMdzKmxsaI0dEMNttN2/RiiYgWTGAj3LUPS66EAFX2IUFYMR3XQUqcttd73AKz1OLGPuFsgLSRDQijvIiUnEcfLfR4cA8qlJcg7jrOmeQzC4dgV4LvEMtRGHqgPSnRy0Iy4u2BPj2MXAfAFwOSyh7ejRWkx2vTClhrQYAkCiZCCS1lrgpMA1Hu8rj2i0IyEwrhR7Gh35Ql3uxiiHVXJPj40QEgxjRcMRu8w2MSLDp9btFBAL6xIvuQaWrLosR4Gq163EporSf+E4gVOiSu5FyW43vGtxdlYXkMiEgzAXCXge20IQwj3vgeAbXCqTLj8rIOaiwZh6WXTItsGBaQAFjYOAknxs+3lJcwkgPD0r350iBgLk6XcxxKGFKfP1wz5Pe1f1x/BqIpYgFhTuNiovgYHEBU9IgaKY54ibiFjT2wwU8Ss0qnZ8C2TD4jxGFZ8k5BzAczp9AME3DjdEcjALJbKXdPLMd2S6mVWFhHxPJMFs/Y4a57uLOinIiiaT7U6iPIamAymBSX4JNVJnRZzGiBPU0IJoBjiwBRsdH9KqjxfAMlP54lEE1GqAtJeNo4YIs5yBLdKI8vqGPqcSCRxnHILCcLEo1R/fDLtkXEJUzF8ut4JtXwXtSMpFK9RBKpi4BbTpIi/L4mOJ5QbgpIZMS5jBuLJhJ/vlPdzRBzzXGROmUfLGFXRLyDEHpmEhSPwt2UW4yHu3WvV8T7w8q8EgH9wSmJ8x3zaSeUnxRwmvAFj45KgoIKqDcYrdFKHoyoteDg2fBtUfYGwyTza3CB2ATO58QSKCClQjK2YA8boAKoJnCQTg2ol2RQtviO7L/3DkX15I0jwreIJIahGBkzDVK6ImP4F6ZwJQ6MSlgeqWNK5sj5bWRGnEIgZfAO9eOSvgSsig5PSvB+zacR4Ew4H7/GO4bE0xUtLFippINKtRv9lL0CwsqoA7wSZl2ZRVfqLURhE5ZdUVvRvCAQM44GTMSlFNhGVZQOqeUTltKfc7VTpImGbKYZ5IJWViKIyilQ5fyPpR6XHyOPnyARm2U5exBrUloLUZmRzL/PuVJYH24RHE+ScccjUho0gEzepPTAlJrISpPh3jWJw95hkIQEkIW8yLVROJTM38CAXyGFvpBYEzZgxRayRccYiftxW5U9hlnLxZ7gmH4zksSQCRg0WbE3H0JUBdeMhLgogdu2G6PqCLSCCWDYR6MlL1MvSsXAFYNIopEJ39/w70oSCIUGVXildo4evzwWWxdGTRUQi8LKlMmjmaCkrdACH4+j4yBtRcivlMqgMNKWOhdOe7+hFmEqo50x764Cr/eCTYh8DRsUajjQX1AN2Ke90HlUhQlU6YxDS1YgPOX/tx6wCL5pHvsbi7ZtTpECULMgTHxFosFU6JbCo2UvkwNTZmMKgWYxQEkYRAy21icH/dPU0omKdnkwlQiHbqcF3MR2EGP3UqgskdDMgt1I4/ONQoRiTmQxwFDmXQmr5uFmOsYDOjxr4uF6UaCaHJscm3omAoe/FMsJoMp3iCaLlAI4w5h9cRCpXmqagn7VF4EVG5boabr3TztQcmDxNcNy7oMFxIbEEJBKwYWf+TNKR9RG56JWMSuI4ePPfLY2LwJhD0XLvyxf5kOHMtPD+gnltU3VOm/JqQThlBO40E5dGzBJokZF3d0WnRl5NB0OfkisQh7djS9w0R3FUT0lhTQ6VihDhyx++sYAh0JqDMQk40JIkFKVI7qcUOJvV0ETZHCsAoVqlh0aYrxL2gFqMJ/o7nr2LMxgIwlN6X5IMCoiZCMDciwkRGBQ2IdGaYFlr0YRW1NeFhQlDzjcj/WVuD5LGEOTFzkAEYJYfX+BWSC/aZTd7CRHq4RLswY6UgurQUiINet4tmNsw/edttt9yEiLF68eItrCoO77rrrvle+8uWA/lUji+AjxLLmTAQuZEWyugJFtw9T07MSWspWE9GORMW039wdZLz7lopqcvAeJG8BqVh4AlPCLDBpIMQ1FF7ZqRTpJpiP+hN3MQ/hJoaldMVKTMqOjAtb4TQcc2CsigCQ4WTItYECaMqLGfWo79zsIBiRDu7zAzDTtRGMYRmICJnaztdJ0khlhmgJGyFh0JPEQHSmXhbzonNWTErOykMgNLiVZYOS2jilVzttKjpHJZDrJsCsXbf2zscee+x+X+90iwcomRtvvGlq3dpHbDNook5PoSRNWNSsogzFCcC4iwjkFHKfrTAzqAxkBQS+V03N/Ovp/vr4kiAhkXSUVDYkVoFJJ2FF5DffvVK9SP8kQlOhaBoR5XlzYq4KWohhsSFpe6JMFc+zUHPVlBCzuYsxJ2orJwRwJPd+CFWUQpETMN1PFq+i3pcjWfMmuHNNKpzC3XU8nJiUMBfgAEJeF7EnryFzf2JZ24SQX8BiZ6hPQ6CCa1fVYdQRvLImJmaJdoApLyjU5Bk0jQMA+uXdv/weAODMzMz8pD+fccZnLrv++htXAwC6Tgyx+aNuQSmJLUOBCz5x0ogus50MFvEJGoGbIJai9ClX8Xv8xY7ZtjlT5bHpSf2lctIM5KXLuCsL0aRoVdTjQ+m6Ud+LNPFQQYnNa1+aeV88SJaK0BMHwbEE4YUhxfQ6toIVtxVrROMFnrElFqWSnBgeATnPFtOns+MKdRN09qXwVJDcAEXsjLofgg6WGuGuFO8eslJz0tRMrklCAksOTGPML35xO37jG9+6CABoZmZmXsKXBwDw6NXX/PSr40uOXGaMaQFgQCDr5YXSXgQSFClihyXXFXHtVtnBPBIP+wWCcyRcRdnC3QR3hB2JRCkcuUWjcgdl2kZw/5k8xZuczB/g5eKoUGuhGItAuT9fBLuU1N4e2zSaSWllZmYKQZe2W3K59iUcUe/6z4vRlnL9pdsXC25KgGIOttb2Sa4BHjsD0jIsAqfR2yPC85UwySo8kfCMkBIWpNZSMm06g5xK8S1KYhs0YMlaAGiu/MmV35ue/qdb57NiUkNE5sgjX335m9507J/stdez97attabpdFYeKRjqDfBCkpAt6hR+SdwM8DNrRiUiIKu/p33mYXMiHsKqAmMeZ4Qaq9ghwckeQaRNFhl7gSLZJsxJli6NqJ0jDO6WKn0p2QpUWHSxvl8hSAhUJcwsg0+UQ4asWjH25E/qWgGIsshZ1OhioFjZ6QSAKWsRYQQGxebXQKax6dwIxBHQBiDICqFYTMcvmkGk7AeAYlQvr72JhaAP4lovsnK2iNC2LY2NjcEvfnH7I6f/1Zl/+Mt77niEiPDyyy+fF9ejWbFiBSIiffOb3/izO++4E5pBg9Zam9liqEwG08nENPmULKRi/Xr2OliFW4yRZyZJeg0MkqwgHF2NSu0TLjkqv7CoDXrbeJQ3jbT5wIrGhJeZwqQxRRiCCjcGOXcRsIzKCgnBpJOguFcGsZzkxRPQQHkbDMkitlzYogBBMbOFqZApyQu2JPdp8KZ4TYz3ZyhVcyKUlZAyzEDGHGRCIAoJaZPz3JVSbkeq3Y0yKYt0KH0qhSfK3DObJNQ2iF4MDXCiLNybenl0bl1HDpxL5f6stTQYDNr169ebb3/779936aXfW/nx004bLF++fN6yHZsVK1YQEZnXve51q/bac8/bfvu5z53YddddTdu2LTgwXHXUOeGUBXqFjC1Z0iwLcxXpzP2+7g5nySsWFctP6WgyHcZcsJfTs6hqTJjiJYqVnJFVedZzEOfKu55MQXNBGBkT0LezZWnmPMJPZYMic8XpEl5YMM9QmRMGjDDgsS9yFHo8QIC9rsNkh/eHcGsBN5IKkaUlL07S8vwnRmoDZkSSWwksR8CyJgGgQukLNnTAXl13TeusHQwG+NhjG5vzzjvvE6eccsqXpqammpNPPtnCPNLAP5ybmppqli5d+q11GzZseO973/v5/fbb74WudeSIrEE0vkpU70tHZUvqyDXe/Uir7XrihRo/iqmxEEo6YoGVPBy8rSi/Zoww68lZSGYElFN/KbddJfOYoiuyzx2rnykHO5PLTRSnUTUcUJlYwlVXmOtsVwbIGrpkcw+4aaFQ+q3n+bJGO5DjHKLwjQbBhYqu1m3RRBuNo/SZoyV4B7WgYtS2lojAGmPM2GDQ3HvvfbNnn33Op5Yvn/yL0C8F5pnEKEP32YMOOug5f/npv/z8Kw59+bF7LlwY3B0OACj2tTNdB8TevoexZ55q7FfqD1hQiGSrwtA/sbs672bsTP81eEO+1Cew+zv2gmSdedM9ebPGUdqavHnqyehYM2Ujvk9XdXJ0BrIJiVPNek1CYVQmzrNodhn7YPo2jfHK4dB0b3m1rNtxPFm9tMczPaEnpTqXv1v5V3x6cSGTzaua/3iiYe9ZXsb4/zjHOnYaV1yaru/ZfDtsoy8qXp9ap+Ir0RG7AQDYsH493HDjjZd97nN/fdp3v7viqq3ZBToTW15TsAAAn5ycfOn4Mcf82e677/6Huz5r1+c9a9fdYDBo+rCsSpUqPQ5yzsHDDz8Mq1evXvPgg/9+yY8u+eF5k5/4xMVeo9kqmsFIZyER+eKxcWBjxx9//Kvf9Kb/tP0LFx8Atm1hdna2U3s6/BEGTQPbDQbQNI23RNqSdRKUJbBcRCrKZsNaaAFgEI5urD+oCf9X14d4f6uuA4WRQbg2G0wz2srK7mXZXITrNU3+TE12rRasfz49nu78wrxZAD5cfe94VtPzFFYNhN1/4EdZPnXAXm3LrjMQ893kr0+9iXyurRocv6xV427inLRsfto4vtIbmm0BwM6y2zdQGlYGsul12cOqYUUP2FktWDb+FrYbDGC77XaEe+65F7514Xnw9bO/fhUArPU8Z5YtWwbzCSA+YZqcnDRENECs+3+lSluCiKiZmppqtpXxPF5Ox4mJCTMxMQETExP1LVaq9CRpxYoVsHTpUgfzXxSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlSpUqVKlSpVqlRpXqiGIEIXkTk+Pm7Gx8c353QaGxuzw+FQR8w+0RSPJ3L8qMjvrUkOAMzMzAysWbOGauBNpaeVMJyammp83kalLTHBXep2neOqIWz7GsEnP/kJZ22XR/LRj370wIV7LXzjkUceudPuz9odnHNpXnR6tU9/9WWxaeXKlXvceOONv/eqV73qkl122WU9AMC6det2Wr/+0Wfst99zHrDWIiIST/PtUq5TZvjGjRvHVq1atef+++9/fzi+qEIQYtMgTU9Pjxtj3FFHHXWFtRabpqFuiG4TaeAyJdeByP71j5YStHlqeDwn/h2q/SA2TUNr/n31s1atXLnf4sWLr7/22mvxuuuuu+Zzn/vcFQCwDkBm0VaqtM0QSyQZnHHGGW//6U9/euWqVataqvSU0vr16+nmm2/+17POOutr++zzrOd0Ao1MXYFVQ9hmKBSeWHrCCS9977v/y+de8YqXj2+//fbh65YXTQEHYH07s1Q3EgsqA4BzzhgzyLbntMOqQipeQ9hkZZhMRem+7FRwBFaaslBERf5dBCx4CTjkN1eDoNScnGe+puIq3fHWUtRW/IcGAOCuu+66f/qKK/7Hu9/5zvN9vn/FFrZRGvxHeVC/ENuLL774VQceeOA/Pfe5z/0t56CdmxuaQdMYMDDQpd2RVUsONflSMXoTy7cZgwBIBgtdR5HXLWOlxjEyIKmmNsH+DrxIqQMUEhChGFe4nlPMKjtfqVJrYUihgLaoFGaAdeVI88CeKW4lmAQWxY5McdTgfImwRYsW7fOcffc9b6fttvt9RPzPvqw4VKFQaWsJAwMA8Hd/t+Lwhx9e+wgR0XDYDq11ZFtL1lpyznW6riNyrvvcWUfOWrLWkXP+x4YfImtd9138sWSdv5aj7jOnfqwj54ico3Suc2SdI+vvRVbeq/u8u268p7guxe/0Z+HHirHn55MLz05sTDYbv7VWnB/mi4jE9a1Nx7Zd8cAhEdHf//3f/28AwOnp6QFUL1elrQEgEhG+64R3PefOO+9a1wmDoQ22rnOJ4QLTZUzEmIkCU5SYjn0urmUd8ft1n1FkOuusvzYpweHE51yAcOaLzGzZGDhTW0dkqSCY2LnOkXM2G3d2PyUI0t9pvpIwTZiCtZaIaNY5R8snl58eTLi6QittFe3gist//A9eGAwDYwaNwFpLrmW7X2lnZ0wSmMy5xGjxM5uEQ2T2wDRMAInjrBWMTUWtwhWElxWMrQUFH08nMGxkfKe0Hi2M+H2sPp49S68WFJ7HP5KfZ0dEc3feeefcUUcdNU5EODEx0dRVWjGEefMoIKL9xCc+/ZpDD33pHwKARTQD2Vm4a+4Ruirrhi+8Qy8v+x5biCHrhhw6MzObnff+K/WJFH0nKNn0CVMgMSYslTanzuUYms/wRjW8RVsaE2adkniJeFFCn5Va570hRCl2RHDOyVZpvE2bf1xjEK21uGjRosFJ7zjpg4g4k3VqqrRV6TfaDRTKvR199Pif7bDjjuScI2NMagvvuS+CibyHIhb6LFLetVc0SaVCn8THs9YJovAIAoT3Fgj31gyaBEhq06I7HwvhBVkny+I4Ysdu0faMil2shXAAUHMDsQM2AoJzANbaBgDo1a9+9ZJDDz30eYhoa+BSFQjzQWiMsQDwzIUL9zw6PS/rXkKqMzNjRNHpV/AAlRu+YEFoMEbvGgyzeyJJDQKZQKDUVzNrWMJayQsGRQTybtKsZTx1LdJ4q7IwPt1NOowrnpvzedYaLVw/ylODXsvJu08PmgGCA/v85z3/mX/8x3+yFABgvlqdV/oPLBAmJiYMEcEJJ7zzlTvttNOzAcDFnuRGqt1B7Y8mg+4qzVvQ+V6Cuq0ab4EuOkABZH8DpEa4ovMzYNbtqq+xa2oFV+hcxTQcLgR430Tdxlw0VC1JVy0ECsJRCpDU7Zj3mUREsK5FYww9b9H+rwcAGB8fd5UVK4awpfEDQET4ryf/N3rWbs8CO2wBjRF9HAlT01JSLeaLQgEkTiD89Ky5KW8FFo516ATDEZLsjq2YM34W2oT7uIfULDsJkkzwaNsfERw5MGC6fobSdsjvg5LRQ59I4s11gybk58iR4wqJanFGMdaBtWbDAw88oHJg1RDmlxbu+SwYGwzAMSAxMYwEA7OmniTBM84MwLu5q/byJbU9mAuxiakHMsW9FXNzhi6Bk1GwBIGEFBlV95UM1yDHzI3A+EyIRW1JBTlFM4p0v0o2B4gxbCtaTLEzd96mfsFgrHJgFQhbCVAIqrcAwlC0Ro9qO2sTHtuw66ak7FjnW3tHswOVWo0Q28OLhraEEkz0O39UxRWjBobk6r0YF+FIFV+bH+E5M49JATcJQkFgLiC7LXNFpzvGCxLCCHjyc10NVKwmw3xTAwnoQh/8H4SBXMHKxi+42jQDaBQfmdpBCvHX3Zbjrl/anQkz4E/b/cGtp5kTS54G5b6MQooBoBqnyMBMFkrNtZkoZJF3RQ+qFKTe2sRG5K9tbU1+rAJhnoklL/nV6ZVa8nYtodzlgNvH3r8PScVPDopkghg0nZ0eEoIoudw4/iAwiHAfyF18XOBw5iSWr+DIiR1fu/7CsQFIzFq4U6YGpO8R888zgDWZVhGsxJR7EabTpUll5ljPtStVgTCvRHxNo1jUmSrNPAt8Z+egHXfbCbAPCwsec1VexDkQ2325h4JdT5yrmLro9lQ7vfi7EOAUtAf+fMBykIgY1hESrYCi0MzG46s0RPUBycd9QFErqVQxhC1ObZs2KBe0AxUwlNnbmGMP2eItBPCYmD4ohYBwUxII0FEIImReAm06FHby3sAnlGBgGVTJcQLHVPsAPqb5wZgGjkxTkHJFCR9MmkJnehhvunlzrqnlEapAmGeand1Y1E8JiGf6FkE3oI4xBJjGbPoA6gXAkGsRqDEHkjhFjPzTXoyCqq6DpzIwD9P1efCSTufWAijDOCj5I+OOTwQkoZYkk3z0Y4eipomMXgkC7+oNgoSAlXAASzX8oJoM8w0qNsEz5usWBJVVofelYKMIHDJXGxcKOqxXBvckhtdCBgvYQmdwd0wVCrSIWARthuiwYQQwZDIBQQo4TSoSZPkKvOZBdFNyKeDnwyACoAFyzlsBcTDKFJG6Q3puLxStrShC1RDmh1asWAEAANdcc93YxtlZaAYNKxOUq8sB3IsaAZD0HKSIG5a3kIQIOQLqai3GvIHkIsSCbZ1ckSWTgSdNceHDBRmFzKHgXQDqXKDOpRgHTKYMTzYCPxXJ8mD6PzNbhAVFzK3qq7xwt2wafxJGSKnACnnNxbnOu3DPvfctqCxYBcK80C233EIAABdcMLVq/SPrfw0sX0iaAEkACD8+Mx+42w+jJuBVaZ4oBdJFx3dEbSpw9T4KAWGHQ5ZkJQKlYkZlegZ+rAGMY+P4BXgm7YBBSJGb2Llm42FR/hgJdJIyZxjGkkBSFrsQTAhHzPwwBACwdt3a/wsAMDMzU8GEKhC2LC1fvpyMMXDRRStuuOeX9/47AGDbttIUD8YEV539bhbVf2Q2MfPzkziGRQrq9GDiwTldaLDOG5BmBXKtWjI/8nuWg42kKZC0E2IgJvGgKxabEc0hgWOQyPWIYk+r/yRinTtXLGCHM5DUpJqxBtc9sg6uv/H6KwEA1qxZU02HKhC2ONFll102AAC8+5e//JZnW0oVQwOWgGKBJ2ZIGYqd2ms846gwZcE8mNRonz9AgD5OgYNxXkk3KBhTpBvrPArSKcusRiKVXHhYBhKhAFYyzQNNEHogzQf1twuZlVwIsTiJGBAlkr0AHFkCgOaGG25Y+5UvfeXHRIS+oUulKhC2LC1ZMm4RkW688fYzHli9em0zaJCICIP6iwpgDDu/R8Y50yd7mNnbcYNEb6tDVMfTro4sTDrhAxiM6nAdJ3dSRJPhBXobja485ULtCqUkE4Yo5RIU4y285hJTs4EE1hKKugqBRMokohSKnfIaugnpHsWAMQhjY2MtAMCNN938/wHAwz71uWoIleZJTSBqAACmplZ8koiote0cL6HmiLKagfpzUUz18ZQQY3UKeXk0cTw52ciAFze1owunWlbfURRJjTUbSYzBUT5uXktR1lWUx/I6kHGcJEuvhbGLR3LEqrZ2H4Valpdddtm6hQsX7klEWIujVA1hXgkRHRGZpUsn/uKHl/zw541pxqy1w+B3F06HgIaz8NukBlBvnIDIdlSlxaLNrzV5DW4CD4Lq7pdMGRRVngxiVhGde0VESAMzN3hMAs+qLOofpT07RG+SzAoNiV15UhZGS8pa6waDgV216oFHL7zwwj9dvXr16hUrVpi+LlWVKm0xmpycNMYYeNGLXvQ7V1111f2+CvBc27YulA/npdgdUbHycNwB+Y7KdmsSFZj9zh2OVxqIqMDc8xMKrmoNItvd+S7uaHTBU1eunDxqPEKLUeeFMvaiQK0q1d62w5aI3IMPPkgf/vBHPgxQKy5X2soUqvu++MUvPvCqn/50hpUHHw5nh7YdtrkWz/ooaCoybfyOiueMInE9ygVPro5v6oKUMfxTTY6kkEwCwNLs3JzbODvXhn4Md99994Yvf+nLS7kZV2kb1Kj/owmFFStWWACAs84666+POeaYdy1atGgHdkjLm5uS9khk+ATApvJzHs8xRb1c/frEsRNf7ZjygidPApCJIGnf9bpesia2cVu3bh1cfdVV0+d+4xsfOP/882/2XZuqV6HStmM+BCDrqKNee+C555595jXXXHP7r371q+HGxzbWLq1PVmuwjh566CG6+eafPfq97/2fH77/lFPeEsTa5ORkNROqhrBtku/1GCp0bP/2t7/9uS9Y9ILfO+wVh+HY2PYAYGPL9qZpsgat1gI0jcZnHVhIRVkKnVsFdQVCwtG8WEgjrl1qy54uos58nMp4uThJk51vrQUn0OfGj7U7NozNt5mnO+64C6//56tXXnDhhf+8Zs2af+vG1MDHPvYxs3z58qoZVNrmtYXGL+ZKT73QNVNTUw3UHo5VQ3i6zcPk5CQCgBkfH6+z8SRpzZo1NDEx4apLsVKlSpUqVapUqVKlSpUqVapUqVKlSpUqVapUqVKlSpUqVapUqVKlSpUq1UjFLU1EhMuWLWvGx8dhfHy8Ru5VmleamZnBmZkZWLZsma2Ro1uRJiYmGiKq2X2VtqnNaVMZp3XBboFJBwBAROtrBjzzz//8z5eMj4/vdffdd//BjtvviI4sWN/URTdkCrWfDUIoLlDs8Oyc64qbhpRMf65RdQpCemHIuzTiL/9fwz+PN/AnGgB2D3lxJ3I5Tc8x4RouPCimMenr6qzOcEz4XLafA1lsItWaj+PRreucc+kpjcmehYgAnPOFdjE9k3NiPsX49OeqjoUBAPRppAYMOPAVqx0An8HSfIhUU/G7K+bR+mcmIMCmaR46+CUH/9NFF1302LXXXns5Ij4MAK3XWrGUfVoFwlNIU1NTMaX6pJNO+r1j33Tsuxe/aPEx++6770LRlr5Spfmjty9evBhWr1699q677rruou9//9uI+JVO9okSABVDeKqFwdKlS+0BB/zu3qefvvzTh/zuISftt+++4WsLANS2NrZnwdhPfkQ1I9b/Qb601GEJMT9WtLBH2SEq6xMZOkaFkvRqdxMVn0rfQfkz3qOhXPkptchA/SUC+65vamTzmJHnInsO1imLd++GYkUs1aUbiyohEELsZaHng98vjEUU5QXoStUTlueIV9NV2pXjzwZdVyzn0kGm6WpR+A8aAIC5uTm47vrrLzv/vPPef+aZZ/58enp6sGTJkrZy8FMsDAAAPnrqqUf8/Jaf3xvKNQ7nhsO5uTkXCri2raW2bVVpdUeW/RtLsLNS7KkcvE1FTm1Xt9Gyoqc2HOds/I6XZQ+/85LyVpWUz8q5W4rj5SXX8/LwvsqirzGZns2KwqzE6k3aQsFX66wqbW/jNeJ4WTl7UbLeObLsOcO9rJ5LcU9ihXRT1Sc5Z+x4G+6R5sVZVb/SpZqWVCjYa/27DO+JvztR9FYUvuVFdp1aH6plQNutNbHGrHXW2ljj8le/+tWjf3v22e8GkAVvq4bwFGkGJ5xwwhtP+9hpFx1w4AEwHA6tMU2Dqns0hN2AtXOLNQ8ZjqAABbnzIuvURCgaqhClk7vdLzWWIbUziz0Ii5u33+Ep0xLSZhb+0EhINxYDvn8kYWz+0rWzoaJWE7o/cQ2KuCaiJio22yGlkYhnkDtr0AqiwkQlPEK2tpfNrLsLpnL9WOSkUN5eqigQm/ZAHK948+nZsTsuNM4xgOD4Q1GAG8I74q31KPXnJBRaCzmA1rZ2wYKxZuPGWfjxj6/4L6997Wv/VzAfavXbJ0GTk5Pm/e9/v3vTm976vNP/6lMrFj1/0U5t27qxsbEG0bef14QoFkLoqES+JwTwvpGMGTizxN4IBYEROy0zBug+8yo6prb1hJS6NaoO07IbFFvw7LaIRvSAQMFEflGTN0WMLlSLDACkYpPc2IoCC6p46CZFTA1Hxsz+99hGjvXmLO6Efi5k30rPeygL1UYBK5oD56YRFvZbAwaCOArnoGqYS6pLVhw379bNOn7HuQAQvUZzm6vr6NU0jXHOugULxtwee+zxJ7vtttstRxxxxC2Tk5ODqiFsPqGvIAw/umzmB0uOPuo1trW2GTRNZAhIDVT0AtE2adc+nmK7Rt5ezqCJ7dUFDoCpPZzYGTH9gih3emHokmSgtKupXYvK+iRvkquaRqZWl+GpUe+4CA5c0hj4Lh41GqnNJK7L7fMMB2Bqja48HcctNA3fx5ML3vBPEAiEuSYCrK04pnuLBjvIdQXtMSK2SQCA85WtgfJ5VqoPMgyGDMS1IDAkhWHwdn7WWtc0DaxaufKB/37yyS/79re//UAtJrj52kGDiPaLnz/zxCOOeNVroIWhMaYhSgzIF3jclf2LduRSP0fnlDAg1h8SeH9a5ZIiKQw437JznXOsYz16FZ4LA6n28j5OcaEjlx3or8s6NbEOVFoLEt2l/Y2ICAypPVSAqMSYrNBVm42PM1nqTCV7WPIdNp7Lu2AT5gAue+4gLFCpTsi6UyHTlRz5dwwEjnXo4v8LQr1bA51LlDB/z+S4YDRs/EyAiWdPYDUxEzJpP938Nk1jbGvdXnvvvdepp556KiK6qiFsvnYAiLj9lT++8vrDX334C9rhEJpmYPguFnbGZK+SQPsJKTOMY3PWUQg927niQsdC9zVuoyt/fObZKGkBJL0WSbOg/HN1r9girnCveC4p/IDtshF7eTwrVI+dep6jsLNzLU6o2dFWEaBJQRvgmk3RIZDfn4KZmDpvIxbee/GZMAlLbiKq9226br9CIAjviT/LtZaasQGtWrnykVM/8pFDqoaweUCiQUR62/Fv+/0XHnjAAQBATTMwxJme0s7IbWxk7dFFu3nCpJJCvguVTI3QbRmwp31ySZBQvji4FiB24LjLgFCH464aQUN5vLB9C4IHidu/IHdM1j1b4ZSZdhC7WJZ2Vf0cXFUnKZxKgGQCPLRpR0WBhAnPS8KBSLp+lVAkpuElYUDZvaR2qBg8dt5Wphx7LhnYlhYMEQA2Bq21tPDZz97lbW874c1VIGwG7bHHHggA8JKX/u6xu+++GznnCINqy1HewsLkjVV5o1Xi9vKIxZ2ZCEHboPJCla3uqYiGB0HAF6eICMydCFHlLkXHc+2AC6J4fWQ7HOVqeBQsapePOzhrW48F5gjAqRakxMFLgoxZw7livgCKGo5+B8RMECG8qSDYM8BXdgNOu38QYHweCZSk67RQTJIpEz7ENTX/0kJD4U4zQWMM7bzLrm+tkYqbQaFU+2GHvmx7ZrJLZxMWACGUQE9QibmqmnsPKNnAHKRUTIpY0FuFWxM3rXITABoUTCxBTKXKU3KDahW8pM5HdVuPWQk7zTh6HNFjwMFSZM5KPz8daIlSZcfcfVliYGTt9AjocZksiArXQGkikVAf5NpIawA9CBlMKW3myXO4q5kZFBl4iey8KJz9nBkfn73ddtsdWgXCZuAH0EUe7rRq1b8d2aG1rhkbDLoXiQiGMNMCoq3Yt9Awj77Tiyqpp5gxfRbvwBiDC4MwBq4mI1e7S7hDYaFHpqT+KD++G2vEHBHBkctMjF4MRPW75FqMcMFBF8/fqdEjBEuf8MQCjiNFvVDB9b3FfJKKElXP5ZxLQooFoaBCkCnu5ADA3suoHpsOnHj+uAYZZoPcbwsAe++1N1WTYTOoaRoCAENEvxXtakp4AQeLSrsLgVdrDQofs7Cd9UIuCJGwqyAklFxfI+AMQgigZMzcFQb9/nQmDIpj5UKrT6IiCvBxpOjV19aYCmwChOsBZLNj+BwTZc/fpyVEz4HwskAGkJY0Ea1RJU1CeTm06abxqJJ5ySxQiW0w4a80lbGxMawawpOgwdjAhhfnCv5xAybtgsEcUDthBhhqd5NyBwpAkEclqh2q17NATPVHFLiCQMEZwBkEWN91SlpLkfm0tsF3R4XEc68DZxyhPSmmjO5QcGK+o+YARmhiwXzR7rl++ZTHBwh8Y4RQ09pVJlwxf28xBoWZZ3xeShtOMkN44FPZLCLIs22rhvBkNAXTYAKHoBDPk5iu5D8XL7SkdiNlQTIlkyB5NsoAo7DJMUfuI2No0Esh7Mj+V/osQ+pLWgdJDICINgmkjtQgUMZ5ZGApKjdogYHiM2EPkMvU7ZKQ4Du2ZszsHMaM0d2oA7CUR4l7YCTYi5k3hwOSUVDFSMYg3CHFuihBVjWEJ0GmMb2Iso7gEwCSQtaLIJzerTC3R8XOySW/yp4TaD+7jw7JTbZq7vrSHgu9kHUAEwLzs2M5ZoFrBoLJ3QhVn6QgKI0PseyHjfaz3om10EXoFVg6VoBrGwIUReUdwQKGUTB7MERw+nuEOhBosBiTwjGqojeEkus4QUJJg4jP5wiMMVUgPCl0EQtIUcxjkWquEBCYq25cdYzqZQi/5UEyCmzii6y02xRV4R7grLQzh50vFPWIOy/IdN6yKy4JqiikIEUGaoGUYSiQq9QcDylGaeqdGcuempJ7tDQXOCr8WYdcU0EQaJyFII+LUEK5pOVpXCMzuSDHRvTYiSdtcUHmAIhcV2CnsvXmk7Wp4Ewo9NO9OBJMmqmmlPABzdQyRS9cD6OgkclFUt0V/ma1MIWHg+8uPfELfLE56hDrGP1GVJCDmDMNYF63AJMWE+MySLlSEXpCsrsxOXIiZiDTJpDNDeVh4yOFpb4flV23IupUeTCEjY9UPJ6/qyjE/H0MGuEJiFWbmJZkWEwGNxn4uxemZBq4vxcPaaCYA1M1hCcjEFpLWiVH79vlarXenTMVPkPOg8q9CaCcFKgnhApk4FwGPCKVUX7uykQsF1wpMBYfE3LMAJVKywC/ctERSHlBMXOPim4/UpmSWrD0hhD0hDOPwi90HAE3keJcajdrjyemZFYEBhYBZCS9EGGNOSqbRrLEXP8cp/w2r3ma7ugqEJ6ExeCcHUhQJ+SlKx//KFODyu4vJdRjRFqmFqqUyaiOAwmfs9ghelT9ku99U5TiH3ITQuMqGcP3MR4S8DJHOlJT7IYKqBP+f82EGW6DxTnCwjyXBFb2mcnB1JRqhXkMCEnzJQi+GC5emk9tymAOCItNomRSidxLAjQGnF9k1WTYLFPBIgBY0zQP+0kmRKnGg05SUaq0ltQ87FbbuRkzhYzIgqsTewKcuCeA29lElIUtj1KjM4wBkaViY5lx+mxiUh4XpuJGzShqU5SBsyWQMboasexRSM/gmWETwi9iDIXcCq4BiJoFqr4BZ0KOKYlcA5YpStGFG54FCp4R6TblqghP4yZW5yEXkGmsBg1Ya2tg0mYQQVefbsNznrP3lf4FOb6sSowf0mATMxDEdRby2xlTGWNyG59SDb6QnMJLCnULErNdImZLkFOah8yRR1ZYQ8cnZLsyYwbNMB3mUHaRCRwheGt8dWQZMRmwkzCnRgiFzCXIvBxalc48BsA1MhyJpQj3H0ncg79Lba6U8JrgAiRWyyLIOqlIEYh6L0o4Zu5GVWoreiTihoKisBXXaIMnAxFg5cqVWAXCZtDMzAwAAFxzzb88lpBaAiDXofHchhaZiSSKm0Twsei1KLo1IFVAEeii9wSohKJYKEWk4HVqaUHlztx3pQhG4bYsGKaYKkAF/RNNbiKlkmrlbEjJDVjanNmcaVMHxM6sBVbckb00plDvDUtAjToPZMwBAZRLwQMUP+tCAAgwaCkUNJUeQ990LkFSgikrt1dAm1CVgSMVf+Ir+QMROQCAubmN11SBsBm0Zs0aAgC4++67Vzz88FrXYINdnwSEUGIiOQxQAodIeZgy5hmGAnknpTL7c0LkHUAookHSlYcaZMa468beBT4STu90IUkmKrqukCRFKD0SzDwBnluhtsCAOwRgk5xL37EChqQESO5nByEw9OcIhbTnULUYDZuL3OUZZG70rOAIcFAJbYQuTyPzfIAUImiStpDqNKrrUpw0H57BXbQ8bZyFSns8A1F6SkSlKBbXjIRERHDLrbdeWQukbCagaIwh59yOP7nyqrtedfgr95zdOIdjYwMEtTuNNDxKqcjKE4GIKYRZLcgsMKdwjK7RWPJElOIRMp89Yh7nX6yTzoq98GAsPUTKQ65jvAC3uUnGDJRCvUlFMuXFVqlchl49r/b1l56xFAzVp0mRxokA8kAtgN5S8HwvQFTJcZlDIwQboVDfsqQrhosgIDjnoBk07v6V97uP/c+PHV41hM3EES677LIBAPz6qp/+9OsAYMYWDCwa9AlL0kwQ4b6sICj2ubaorLrqgiMZ8MhLgrECH7yOQO6X7kHhsQdMU7H4fYZ3BM4E2l7wUHB8ggU9RUAUUQYmMe04hSJjVjk6Cw3nj94np0uhy5g0IYUIlKN4UJmKmnNRJiYhdGtG4DWEqfgLJfBIY1IkQslVTQVddo7k+mLCwQKAue/e+35wzjnn/HMVCJtJS5YscUSEn/3s6Wdce+2/3GuMaZxzlgfBxFfCdhIeX1C0ibUrECgrcqLzCbKEm77ABSyYm307nMoW5Dv1yEAelNwnEoBKuzsV1GrqacSChZLxykzPxiYr4BfnBym5+UrgqWjUhqxSJCXThgomRGeRUG8aOvc66KrXvO6FAHyFaZa/y8yjUyo2480UR0SDwcA99NBD7cUXX/wXRIS1DPuT0BJe9KIXNeecc86jAM0dh7zk4BN22XUXatsWjU96CiWy8zJdlCP7fTZpLJqR7zQll1r2NzJQr1CAhbsiS4zOsxiLblOWTq1zN4Q7blN4qc5iRBVJqcJ++zIN9edpJw7h033Hl8OgS8dqoSzKyWYgcVkA6dLwQjMk+d5Ql4nDlPKRzmGICQ9n17UPmIfBGDMEgAVTF0yd/qEPf+jr4+PjNS7pyVLo2vSt889/67p164iIbNu2bejYE7v0WCs6IxHrDBT/9l2XYqciy7v5kOzq48rdhbp7pu5I8ninuiKl6wUqHmfzDkukukrx7k/hR1yPn++7I8VOUPx6NnVd6uuGJK6TnevycfjzundA2bP3PXOaFBLXE12snCv/sPP1fWSXKjnvXeeo0PvL3ze1gFLvmXVwsqlTVlxrlrpz+TojIr88Z4mIpqenzwOAhoga6FfAKj0RCv3xLrroorcedthh5++1117gnGvb1jbGGOxiCkDmNxTsVd15ie+ejkhoFnLjJNX4GOPvIma+z6umw20h5VBkaq4u/6V2xIQbhEY1JFV64CXqUdX7U30osD84q1TvgbshIda61ZWhiO2oVMRiE46Yg56hGlPJvCu7RBVAnMVmEEuGk8ULOCDrVXwwuqMVj4GjHH8J8+XIeWeRc4PBAAHAXHLJJee/7nWvO4GI0B9L1WR4Cujcc89109PTg9e//vU3OeduWrhw4aF77bXX7k3TIBB0ewWQQYDRsfOUexF4g6ORxTtQ1fR7AvENeeFWTP0Cwv+wUCocR1wDCq7A6CbDou2vrz0KvCzFRvQlRI2qObFJu7AvuEo14h1V5p74g9ITGwfpGHbVyKJUQZuP2adPW6KuD4Mxxtx+++149tlnf+akk056L/kecMuXL6fNnKJKm9IUAGCPc845530vWrz4PS944Qv33HnnnevkVNqq9Otf/xruvffetddff8Plf/u3/+v06enpn3DNoCzGKz0lmMJxxx1nvZTe99RTP/TGQw556Wt32GHH8T322OOZxqDv2kbCVECEQtWepLTmufqZ4s8yLQEAHkfFoZHpgBLuyyoHP+GdlofOApSLBJVqr6HK6SIR8ps/v/w81ChEXl6icLLIzhw1G1gORhz1BH3mRHiWvudgqpIy8XIfE1L2bsg5wnXr1q13rp2+7757Lvn857/0D/fee+89avMS9P8DQlnJETWSnhQAAAAASUVORK5CYII=';
  return (
    <img
      src={`data:image/png;base64,${LOGO_B64}`}
      alt="Tranxact"
      style={{ width: size, height: 'auto', display: 'block' }}
    />
  );
}

// ---------- Auth screens ----------
function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}>
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

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 sm:px-8 pb-28 md:pb-8" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neutral-900 flex justify-around py-2.5 z-40" style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}>
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
  const [screen, setScreen] = useState('splash'); // splash | login | signup | forgot | forgotSent | welcome | app
  const [tab, setTab] = useState('home');
  const [homeView, setHomeView] = useState('main'); // main | fund | receive | send | history
  const [profileView, setProfileView] = useState('main'); // main | referrals | earnings | leaderboard
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [tpOpen, setTpOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const initializedRef = React.useRef(false);

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

  const hasSeenWelcome = (session) =>
    localStorage.getItem('hasSeenWelcome') === 'true' || session?.user?.user_metadata?.hasSeenWelcome === true;

  const handleWelcomeContinue = async () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    try { await supabase.auth.updateUser({ data: { hasSeenWelcome: true } }); } catch { /* best-effort */ }
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
        setScreen('login');
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

  if (screen === 'splash') return <SplashScreen />;

  if (screen === 'login') return <LoginScreen onLogin={() => {}} goSignup={() => setScreen('signup')} goForgot={() => setScreen('forgot')} />;
  if (screen === 'signup') return <SignupScreen onSignup={() => {}} goLogin={() => setScreen('login')} />;
  if (screen === 'forgot') return <ForgotScreen onSent={() => setScreen('forgotSent')} goLogin={() => setScreen('login')} />;
  if (screen === 'forgotSent') return <ForgotSentScreen goLogin={() => setScreen('login')} />;
  if (screen === 'welcome') return <WelcomeScreen onContinue={handleWelcomeContinue} />;

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
