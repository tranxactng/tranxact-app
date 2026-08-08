import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp({ email, password, username, fullName, referralCode }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, full_name: fullName, referral_code: referralCode || null } },
  });
  return { data, error };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function requestPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data, error };
}

export async function getWallet(userId) {
  const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  return { data, error };
}

export async function getCryptoAssets() {
  const { data, error } = await supabase
    .from('crypto_assets')
    .select('*')
    .eq('is_active', true)
    .order('is_receivable', { ascending: false });
  return { data, error };
}

export async function getRecentTransactions(userId, limit = 20) {
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (walletErr || !wallet) return { data: [], error: walletErr };

  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, transaction_id, created_at, transactions(type, status, counterparty, description, crypto_asset, user_id)')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: null, error };

  // For a send_user transaction, transactions.counterparty always holds the
  // RECIPIENT's username (set once, from the sender's perspective at send time).
  // That's correct for the sender, but wrong for the recipient viewing the same
  // row — they need to see the SENDER instead. transactions.user_id is always
  // the person who initiated the send, so for rows where I received (amount>0),
  // resolve the initiator's username as the real counterparty.
  const needsSenderLookup = (data || [])
    .filter(row => row.transactions?.type === 'send_user' && Number(row.amount) > 0 && row.transactions?.user_id)
    .map(row => row.transactions.user_id);

  let senderUsernames = {};
  if (needsSenderLookup.length > 0) {
    const { data: senderProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [...new Set(needsSenderLookup)]);
    senderUsernames = Object.fromEntries((senderProfiles || []).map(p => [p.id, p.username]));
  }

  const mapped = (data || []).map(row => {
    const t = row.transactions;
    const received = Number(row.amount) > 0;
    const counterparty = (t?.type === 'send_user' && received)
      ? senderUsernames[t.user_id] || t.counterparty
      : t?.counterparty;
    return {
      id: row.transaction_id,
      type: t?.type,
      status: t?.status,
      amount_ngn: row.amount, // signed, correct from THIS wallet's perspective
      crypto_asset: t?.crypto_asset,
      counterparty,
      direction: received ? 'received' : 'sent',
      description: t?.description,
      created_at: row.created_at,
    };
  });

  return { data: mapped, error: null };
}

// Calls the deployed edge function to send naira to another Tranxact user by username.
export async function sendToUser(username, amount) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/transfer-to-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ username, amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Transfer failed');
  return data; // { success, transaction_id, recipient_username }
}

// Sends one message (plus recent history) to Xact AI. Returns either a plain
// text reply, or a proposal object the UI must show for explicit confirmation
// before any money moves.
export async function askXactAI(message, history = []) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/xact-ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ message, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Xact AI request failed');
  return data; // { type: 'text', text } | { type: 'proposal', action, recipient_username, amount, text }
}

// Calls the deployed edge function to get (or create) a deposit address for the given asset.
export async function getDepositAddress(assetSymbol) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-crypto-address`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ asset: assetSymbol }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get deposit address');
  return data; // { address, derivation_index, asset }
}

async function callAdminFunction(fnName, payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function adminLookupUser(username) {
  return callAdminFunction('admin-lookup', { action: 'lookup_user', username });
}

export async function adminRecentSettlements() {
  return callAdminFunction('admin-lookup', { action: 'recent_settlements' });
}

export async function adminSettle(payload) {
  return callAdminFunction('admin-settle', payload);
}

export async function getReferralEarnings(userId) {
  const { data, error } = await supabase
    .from('referral_earnings')
    .select('amount, status, created_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getReferralLeaderboard(period) {
  const { data, error } = await supabase.rpc('get_referral_leaderboard', { p_period: period });
  return { data, error };
}

export async function withdrawReferralEarnings() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/withdraw-referral-earnings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal failed');
  return data; // { success, transaction_id, amount }
}

export async function changeUsername(newUsername) {
  const { error } = await supabase.rpc('change_username', { p_new_username: newUsername });
  if (error) throw new Error(error.message);
  return true;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return true;
}

export async function setTransactionPin(pin) {
  const { error } = await supabase.rpc('set_transaction_pin', { p_pin: pin });
  if (error) throw new Error(error.message);
  return true;
}

export async function verifyTransactionPin(pin) {
  const { data, error } = await supabase.rpc('verify_transaction_pin', { p_pin: pin });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function updateSpendingLimit(limit) {
  const { error } = await supabase.from('profiles').update({ daily_spending_limit: limit }).eq('id', (await supabase.auth.getUser()).data.user.id);
  if (error) throw new Error(error.message);
  return true;
}

export async function updatePushPreference(enabled) {
  const { error } = await supabase.from('profiles').update({ push_notifications_enabled: enabled }).eq('id', (await supabase.auth.getUser()).data.user.id);
  if (error) throw new Error(error.message);
  return true;
}

export async function createPaymentLink({ title, description, link_type, amount, is_tip }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title, description, link_type, amount, is_tip }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create payment link');
  return data; // { success, id, slug, url }
}

export async function getMyPaymentLinks() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('payment_links')
    .select('id, slug, title, description, link_type, amount, is_tip, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// Public — works without auth, for the checkout page
export async function getPublicPaymentLink(slug) {
  const { data, error } = await supabase.rpc('get_payment_link', { p_slug: slug });
  if (error) throw new Error(error.message);
  return data && data[0] ? data[0] : null;
}

export async function getMyTranxactPayments() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', user.id).maybeSingle();
  if (!wallet) return [];

  const { data, error } = await supabase
    .from('ledger_entries')
    .select('amount, created_at, transactions!inner(type, status, description, payment_link_id, payment_links(title))')
    .eq('wallet_id', wallet.id)
    .eq('transactions.type', 'tranxactpay')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data || []).map(row => ({
    amount: row.amount,
    created_at: row.created_at,
    status: row.transactions.status,
    description: row.transactions.description,
    link_title: row.transactions.payment_links?.title || null,
  }));
}

// Public — no auth required, since a checkout payer often isn't signed in at all.
// Creates a real backend record of the claim; does not confirm or settle anything.
export async function notifyPaymentSent({ slug, method, crypto_asset, claimed_amount }) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-payment-sent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, method, crypto_asset, claimed_amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to record payment notice');
  return data; // { success, notice_id, reference }
}

export async function adminListPaymentNotices() {
  return callAdminFunction('admin-payment-notices', { action: 'list_payment_notices' });
}

export async function adminGetOverviewStats() {
  return callAdminFunction('admin-overview-stats', {});
}

export async function requestWithdrawal({ amount, bank_name, account_number, account_name }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/request-withdrawal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ amount, bank_name, account_number, account_name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
  return data; // { success, request_id, amount }
}

export async function getMyWithdrawals() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('id, amount, bank_name, account_number, account_name, status, admin_note, created_at, processed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
