import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signUp({ email, password, username, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, full_name: fullName } },
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
    .select('amount, transaction_id, created_at, transactions(type, status, counterparty, description, crypto_asset)')
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { data: null, error };

  const mapped = (data || []).map(row => ({
    id: row.transaction_id,
    type: row.transactions?.type,
    status: row.transactions?.status,
    amount_ngn: row.amount, // signed, correct from THIS wallet's perspective
    crypto_asset: row.transactions?.crypto_asset,
    counterparty: row.transactions?.counterparty,
    description: row.transactions?.description,
    created_at: row.created_at,
  }));

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
