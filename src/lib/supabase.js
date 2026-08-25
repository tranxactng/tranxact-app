import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp({ email, password, username, fullName, referralCode, businessName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, full_name: fullName, referral_code: referralCode || null, business_name: businessName || null } },
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
    // Direct profiles table lookup is blocked by RLS for anyone but yourself —
    // this RPC is a narrow, deliberate exception that only ever returns
    // usernames (nothing else from the profile row).
    const { data: senderProfiles } = await supabase.rpc('get_usernames_by_ids', { p_ids: [...new Set(needsSenderLookup)] });
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

// Calls the deployed edge function to get (or create) a deposit address for the given asset.
export async function getDepositAddress(assetSymbol, network) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-crypto-address`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ asset: assetSymbol, network }),
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

export async function adminGetCurrentRates() {
  return callAdminFunction('admin-manage-rates', { action: 'get_current' });
}

export async function adminUpdateBaseRate(baseRate) {
  return callAdminFunction('admin-manage-rates', { action: 'update_base_rate', base_rate: baseRate });
}

export async function adminUpdateSpread(symbol, spreadPercentage) {
  return callAdminFunction('admin-manage-rates', { action: 'update_spread', symbol, spread_percentage: spreadPercentage });
}

// Extremely sensitive — returns a real, importable private key controlling
// real funds. The backend re-derives and cross-checks the address before
// ever returning anything; this function itself has no extra gate beyond
// the same admin check every other admin function uses.
export async function adminRevealPrivateKey(username, asset) {
  return callAdminFunction('admin-reveal-private-key', { username, asset });
}

// action: 'check_balance' (read-only, safe) or 'sweep' (broadcasts a real
// transaction). Only ERC20/BEP20 supported so far — Bitcoin needs its own
// implementation, not built yet.
export async function adminSweepEvm(action, username, asset, network) {
  return callAdminFunction('admin-sweep-evm', { action, username, asset, network });
}

// Read-only, safe — checks a real TRX or USDT-TRC20 balance. Sweeping on
// Tron isn't built yet (needs real transaction signing, a separate,
// harder piece than balance-checking).
export async function adminCheckTronBalance(username, asset) {
  return callAdminFunction('admin-check-tron-balance', { username, asset });
}

// Every existing account has a null full_name because the signup trigger
// never read it from metadata (now fixed for new signups) — this is how an
// existing account fills theirs in.
export async function updateFullName(newName) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Name cannot be empty');
  const { error } = await supabase.from('profiles').update({ full_name: trimmed }).eq('id', user.id);
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

export async function createPaymentLink({ title, description, link_type, amount, is_tip, service_type, expected_people, expiry_date, business_id, image_url, product_type, inventory }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ title, description, link_type, amount, is_tip, service_type, expected_people, expiry_date, business_id, image_url, product_type, inventory }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create payment link');
  return data; // { success, id, slug, url }
}

// Ticket tiers are just multiple payment_links sharing one event_id — this
// creates the event and every tier's real, checkout-ready link in one call.
export async function createStorefrontEvent({ business_id, name, description, image_url, venue, location, event_date, event_time, tiers }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-storefront-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ business_id, name, description, image_url, venue, location, event_date, event_time, tiers }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create event');
  return data; // { success, event_id, tiers }
}

async function callManageStorefrontItem(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-storefront-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function updateStorefrontItem(id, updates) {
  return callManageStorefrontItem({ action: 'update', id, ...updates });
}
export async function setStorefrontItemStatus(id, status) {
  return callManageStorefrontItem({ action: 'set_status', id, status });
}
export async function deleteStorefrontItem(id) {
  return callManageStorefrontItem({ action: 'delete', id });
}
export async function duplicateStorefrontItem(id) {
  return callManageStorefrontItem({ action: 'duplicate', id });
}

// ---------- Business platform ----------
// Same backend, same auth as the rest of the app — a business is just a
// profile owned by an existing user_id. Products/services/events reuse
// payment_links entirely (see createPaymentLink above), so checkout, crypto,
// naira, and admin settlement all work identically with zero new payment code.

// Uploads into the user's own folder in the business-assets bucket — RLS
// requires the path's first segment to match auth.uid(), enforced server-side,
// not just trusted client-side. Returns the public URL, ready to store
// directly as logo_url or image_url.
export async function uploadBusinessAsset(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('business-assets').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('business-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function isBusinessSlugAvailable(slug) {
  const { data, error } = await supabase.rpc('is_business_slug_available', { p_slug: slug.trim().toLowerCase() });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function createBusiness({ name, slug, description }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('businesses')
    .insert({ user_id: session.user.id, name: name.trim(), slug: slug.trim().toLowerCase(), description: description || null })
    .select('id, slug, name, description, logo_url')
    .single();
  if (error) throw new Error(error.code === '23505' ? 'That link is already taken' : error.message);
  return data;
}

export async function getMyBusiness(userId) {
  const { data, error } = await supabase.from('businesses').select('*').eq('user_id', userId).maybeSingle();
  return { data, error };
}

export async function updateBusiness(businessId, updates) {
  const { error } = await supabase.from('businesses').update(updates).eq('id', businessId);
  if (error) throw new Error(error.message);
  return true;
}

export async function getMyBusinessProducts(businessId) {
  const { data, error } = await supabase
    .from('payment_links')
    .select('id, slug, title, description, link_type, amount, status, product_type, image_url, inventory, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return { data, error };
}

// Public, no auth required — the actual customer-facing storefront.
export async function getBusinessStorefront(slug) {
  const { data, error } = await supabase.rpc('get_business_storefront', { p_slug: slug.trim().toLowerCase() });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Business not found');
  return data;
}

export async function submitSalesLead({ name, email, message }) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-sales-lead`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, email, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit');
  return data;
}

export async function getDashboardAnalytics() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/dashboard-analytics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: '{}',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load analytics');
  return data;
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
export async function ensureCryptoAddresses(slug) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ensure-crypto-addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to prepare crypto addresses');
  return data.addresses; // { "BTC-BTC": "...", "USDT-TRC20": "...", ... }
}

// Every registered user's wallet includes every supported coin from the
// moment they sign up, not just whatever they've happened to open Receive
// for — this guarantees the full set exists before checkout ever reads it,
// rather than showing only whatever partial set happened to exist already.
export async function getPublicPaymentLink(slug) {
  await ensureCryptoAddresses(slug).catch(() => {}); // best-effort — link may not even use crypto
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

export async function requestWithdrawal({ amount, bank_name, bank_code, account_number, account_name }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/request-withdrawal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ amount, bank_name, bank_code, account_number, account_name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
  return data; // { success, request_id, amount, status }
}

// Real Nigerian bank list from Paystack, with the bank_code each one needs
// for both account resolution and the actual transfer.
export async function listPaystackBanks() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/list-paystack-banks`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load banks');
  return data.banks; // [{ name, code, slug }]
}

// Resolves an account number + bank to the real registered account name —
// this is what replaces any fake/placeholder name in the UI.
export async function resolveBankAccount(accountNumber, bankCode) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-bank-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not resolve account');
  return data; // { account_name, account_number }
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

// Fire-and-forget: notifies admin that a user copied their receive info.
// Never throws — a notification failing should never block the actual copy action.
export async function notifyCopyEvent({ type, asset }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${SUPABASE_URL}/functions/v1/notify-copy-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ type, asset }),
    });
  } catch {
    // silent — this is a best-effort notification, not a user-facing action
  }
}

export async function adminListPendingWithdrawals() {
  return callAdminFunction('admin-manage-withdrawal', { action: 'list_pending' });
}

export async function adminApproveWithdrawal(requestId, note) {
  return callAdminFunction('admin-manage-withdrawal', { action: 'approve', request_id: requestId, note });
}

export async function adminRejectWithdrawal(requestId, note) {
  return callAdminFunction('admin-manage-withdrawal', { action: 'reject', request_id: requestId, note });
}

export async function adminListSalesLeads() {
  return callAdminFunction('admin-lookup', { action: 'list_sales_leads' });
}

export async function adminUpdateLeadStatus(leadId, status) {
  return callAdminFunction('admin-lookup', { action: 'update_lead_status', lead_id: leadId, status });
}

export async function getOrCreateMonnifyAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-monnify-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: '{}',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to set up funding account');
  if (data.type === 'diagnostic') throw new Error(`[${data.stage}] ${data.detail}`);
  return data.account; // { user_id, account_reference, account_number, bank_name, account_name }
}

export async function getMyNotifications(limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUnreadNotificationCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
}

// --- Push notifications ---
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported on this device/browser');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('Push isn\'t configured yet (missing VAPID public key)');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  // Nothing in this app registers a service worker yet — do it here,
  // idempotent if one's already registered.
  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

  const subJson = subscription.toJSON();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/save-push-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save subscription');
  return true;
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    // best-effort — the row still gets cleaned up server-side eventually
    // if the endpoint starts bouncing (404/410 handling in send-push-notification)
  }
}
