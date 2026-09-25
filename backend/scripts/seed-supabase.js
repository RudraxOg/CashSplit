/*
 * Idempotent Supabase demo data.
 * Run with: npm run seed:supabase
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.
 */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const seedPassword = process.env.SEED_USER_PASSWORD || 'RoomMateDemo!2026';

const fail = (message) => { throw new Error(message); };
async function checked(promise, label) {
  const { data, error } = await promise;
  if (error) fail(`${label}: ${error.message}`);
  return data;
}

async function ensureSeedUser({ email, name, color }) {
  const users = await checked(supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'list auth users');
  let user = users.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    const created = await checked(supabase.auth.admin.createUser({
      email,
      password: seedPassword,
      email_confirm: true,
      user_metadata: { name },
    }), `create ${email}`);
    user = created.user;
  }
  await checked(supabase.auth.admin.updateUserById(user.id, { password: seedPassword, email_confirm: true, user_metadata: { name } }), `update ${email}`);
  await checked(supabase.from('profiles').upsert({ id: user.id, name, email, color }, { onConflict: 'id' }), `upsert profile ${email}`);
  return user;
}

function equalShares(memberIds, amountMinor) {
  const base = Math.floor(amountMinor / memberIds.length);
  let remainder = amountMinor - base * memberIds.length;
  return memberIds.map((userId) => {
    const owed = base + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    return { user_id: userId, owed_amount_minor: owed, share_value: 1 };
  });
}

async function seedExpense(groupId, members, actorId, input) {
  const existing = await checked(supabase.from('expenses').select('id').eq('group_id', groupId).eq('description', input.description).maybeSingle(), `find expense ${input.description}`);
  if (existing) return existing.id;
  const shares = equalShares(members, input.amountMinor);
  return checked(supabase.rpc('create_expense_bundle', {
    p_expense: {
      group_id: groupId,
      description: input.description,
      total_amount_minor: input.amountMinor,
      currency: 'INR',
      category_id: input.category,
      split_type: 'EQUAL',
      expense_kind: 'NORMAL',
      expense_date: input.date,
      created_by: actorId,
      notes: input.note,
    },
    p_payers: [{ user_id: input.payerId, paid_amount_minor: input.amountMinor }],
    p_shares: shares,
    p_items: [],
    p_history: { changed_by: actorId, action: 'created', snapshot: { source: 'seed' } },
    p_activity: { group_id: groupId, user_id: actorId, kind: 'expense', text: 'Seeded an expense', detail: `${input.description} · ₹${input.amountMinor / 100}` },
  }), `create expense ${input.description}`);
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) fail('Supabase service-role configuration is missing');
  const group = (await checked(supabase.from('groups').select('*').order('created_at').limit(1).maybeSingle(), 'find household'));
  if (!group) fail('No household exists. Sign up once or run the household bootstrap migration first.');

  const seedUsers = [
    { email: 'aman.seed@roommate.test', name: 'Aman', color: '#4D8DDB' },
    { email: 'neha.seed@roommate.test', name: 'Neha', color: '#8B7CF6' },
    { email: 'rohit.seed@roommate.test', name: 'Rohit', color: '#F3A34D' },
  ];
  const createdUsers = await Promise.all(seedUsers.map(ensureSeedUser));
  for (const user of createdUsers) await checked(supabase.from('group_members').upsert({ group_id: group.id, user_id: user.id }), `connect ${user.email}`);

  const memberships = await checked(supabase.from('group_members').select('user_id').eq('group_id', group.id), 'load members');
  const memberIds = memberships.map((entry) => entry.user_id);
  const actorId = memberIds[0];
  const payerIds = [...createdUsers.map((user) => user.id), actorId];

  const expenses = [
    ['Monthly groceries', 685000, 'Groceries', '2026-08-02', 'Weekly supermarket run'],
    ['Electricity bill', 312500, 'Utilities', '2026-08-05', 'August electricity and maintenance'],
    ['Weekend dinner', 245000, 'Food & Dining', '2026-08-09', 'Shared dinner'],
    ['Wi-Fi renewal', 119900, 'Utilities', '2026-08-12', 'House internet'],
    ['Cleaning supplies', 178500, 'Others', '2026-08-16', 'Detergent and floor cleaner'],
    ['Cab to airport', 96000, 'Transport', '2026-08-20', 'Shared ride'],
  ];
  for (let index = 0; index < expenses.length; index += 1) {
    const [description, amountMinor, category, date, note] = expenses[index];
    await seedExpense(group.id, memberIds, actorId, { description, amountMinor, category, date, note, payerId: payerIds[index % payerIds.length] });
  }

  const incomeRows = [
    { source: 'Household refund', amount_minor: 125000, added_by: actorId, income_date: '2026-08-07' },
    { source: 'Shared utility refund', amount_minor: 85000, added_by: payerIds[1], income_date: '2026-08-14' },
  ];
  for (const row of incomeRows) {
    const exists = await checked(supabase.from('incomes').select('id').eq('group_id', group.id).eq('source', row.source).maybeSingle(), `find income ${row.source}`);
    if (!exists) await checked(supabase.from('incomes').insert({ ...row, group_id: group.id, currency: 'INR' }), `create income ${row.source}`);
  }

  const shoppingRows = [
    { name: 'Milk and cereal', priority: 'High', purchased: false },
    { name: 'Dishwasher tablets', priority: 'Medium', purchased: true, purchased_at: '2026-08-18T10:00:00.000Z' },
    { name: 'Toilet paper', priority: 'High', purchased: false },
    { name: 'LED bulb', priority: 'Low', purchased: true, purchased_at: '2026-08-19T10:00:00.000Z' },
  ];
  for (const row of shoppingRows) {
    const exists = await checked(supabase.from('shopping_items').select('id').eq('group_id', group.id).eq('name', row.name).maybeSingle(), `find shopping ${row.name}`);
    if (!exists) await checked(supabase.from('shopping_items').insert({ ...row, group_id: group.id, created_by: actorId }), `create shopping ${row.name}`);
  }

  const chores = [
    ['Deep clean kitchen', payerIds[0], '2026-08-27', 'pending'],
    ['Take out recycling', payerIds[1], '2026-08-26', 'completed'],
    ['Restock pantry', payerIds[2], '2026-08-29', 'upcoming'],
    ['Water balcony plants', actorId, '2026-08-28', 'pending'],
  ];
  for (const [name, assigned_to, due_date, status] of chores) {
    const exists = await checked(supabase.from('chores').select('id').eq('group_id', group.id).eq('name', name).maybeSingle(), `find chore ${name}`);
    if (!exists) await checked(supabase.from('chores').insert({ group_id: group.id, name, assigned_to, due_date, status }), `create chore ${name}`);
  }

  console.log(JSON.stringify({ ok: true, groupId: group.id, seededMembers: createdUsers.map((user) => user.email), expenses: expenses.length, incomes: incomeRows.length, shopping: shoppingRows.length, chores: chores.length }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
