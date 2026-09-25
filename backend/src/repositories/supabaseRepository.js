const crypto = require('node:crypto');
const config = require('../config');
const { supabase } = require('../services/supabase');
const { toMinor } = require('../utils/validation');
const { simplifyDebts } = require('../services/simplifyDebts');
const { DEFAULT_MONTHLY_BUDGET, validateMonthlyBudget } = require('../services/monthlyBudget');

const enabled = () => Boolean(supabase);
const amount = (minor) => Number(minor || 0) / 100;
function nextRecurrenceDate(value, rule) {
  if (!value || !rule) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (rule.startsWith('FREQ=DAILY')) date.setUTCDate(date.getUTCDate() + 1);
  else if (rule.startsWith('FREQ=WEEKLY')) date.setUTCDate(date.getUTCDate() + 7);
  else if (rule.startsWith('FREQ=MONTHLY')) date.setUTCMonth(date.getUTCMonth() + 1);
  else if (rule.startsWith('FREQ=YEARLY')) date.setUTCFullYear(date.getUTCFullYear() + 1);
  else return null;
  return date.toISOString().slice(0, 10);
}

function dbError(error, fallback = 'database request failed') {
  if (!error) return null;
  const wrapped = new Error(error.message || fallback);
  wrapped.statusCode = error.code === '23505' ? 409 : error.code === '42501' ? 403 : 500;
  wrapped.cause = error;
  return wrapped;
}

async function query(promise, fallback) {
  const result = await promise;
  const error = dbError(result.error, fallback);
  if (error) throw error;
  return result.data;
}

async function resolveGroupId(groupId = 'g1', actorId) {
  if (!enabled()) return groupId;
  if (!actorId) { const error = new Error('authenticated actor is required'); error.statusCode = 401; throw error; }
  if (groupId !== 'g1') {
    const membership = await query(supabase.from('group_members').select('group_id').eq('group_id', groupId).eq('user_id', actorId).maybeSingle(), 'group lookup failed');
    if (membership) return membership.group_id;
  }
  if (groupId === 'g1') {
    const first = await query(supabase.from('group_members').select('group_id').eq('user_id', actorId).order('joined_at').limit(1).maybeSingle(), 'group lookup failed');
    if (first) return first.group_id;
  }
  const error = new Error('group not found'); error.statusCode = 404; throw error;
}

async function assertMember(groupId, userId) {
  const result = await query(supabase.from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', userId).maybeSingle(), 'membership lookup failed');
  if (!result) { const error = new Error('user is not a member of this group'); error.statusCode = 403; throw error; }
}

function profileRow(row, actorId) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, avatarUrl: row.avatar_url, initials: row.name?.slice(0, 1).toUpperCase(), you: row.id === actorId };
}

function expenseRow(row, payers = [], shares = [], items = [], comments = []) {
  return {
    id: row.id, groupId: row.group_id, description: row.description, note: row.notes || row.description,
    amount: amount(row.total_amount_minor), totalAmount: amount(row.total_amount_minor), totalAmountMinor: row.total_amount_minor,
    currency: row.currency, category: row.category_id || 'Others', categoryId: row.category_id || 'Others',
    splitType: row.split_type, date: row.expense_date, createdBy: row.created_by,
    deletedAt: row.deleted_at, createdAt: row.created_at, updatedAt: row.updated_at,
    reimbursement: row.expense_kind === 'REIMBURSEMENT', hasReceipt: Boolean(row.receipt_image_url), receiptPath: row.receipt_image_url,
    paidBy: payers[0]?.profiles?.name,
    payers: payers.map((item) => ({ id: item.id, userId: item.user_id, paidAmount: amount(item.paid_amount_minor), paidAmountMinor: item.paid_amount_minor })),
    shares: shares.map((item) => ({ id: item.id, userId: item.user_id, owedAmount: amount(item.owed_amount_minor), owedAmountMinor: item.owed_amount_minor, shareValue: item.share_value, percentValue: item.percent_value, adjustmentValue: amount(item.adjustment_value_minor) })),
    participants: shares.map((item) => ({ id: item.id, userId: item.user_id, owedAmount: amount(item.owed_amount_minor), owedAmountMinor: item.owed_amount_minor, shareValue: item.share_value, percentValue: item.percent_value, adjustmentValue: amount(item.adjustment_value_minor), name: item.profiles?.name || item.user_id })),
    items: items.map((item) => ({ id: item.id, name: item.name, price: amount(item.price_minor), priceMinor: item.price_minor })),
    comments: comments.map((item) => ({ id: item.id, userId: item.user_id, text: item.body, createdAt: item.created_at })),
  };
}

async function getExpense(id, actorId) {
  const row = await query(supabase.from('expenses').select('*').eq('id', id).maybeSingle(), 'expense lookup failed');
  if (!row || row.deleted_at) return null;
  if (actorId) await assertMember(row.group_id, actorId);
  const [payers, shares, items, comments] = await Promise.all([
    query(supabase.from('expense_payers').select('*, profiles(name)').eq('expense_id', id), 'expense payers lookup failed'),
    query(supabase.from('expense_shares').select('*, profiles(name)').eq('expense_id', id), 'expense shares lookup failed'),
    query(supabase.from('expense_items').select('*').eq('expense_id', id), 'expense items lookup failed'),
    query(supabase.from('comments').select('*').eq('expense_id', id).order('created_at', { ascending: false }), 'expense comments lookup failed'),
  ]);
  return expenseRow(row, payers, shares, items, comments);
}

async function listExpenses(groupId, actorId) {
  await assertMember(groupId, actorId);
  const rows = await query(supabase.from('expenses').select('*').eq('group_id', groupId).is('deleted_at', null).order('expense_date', { ascending: false }).order('created_at', { ascending: false }), 'expenses lookup failed');
  return Promise.all(rows.map((row) => getExpense(row.id)));
}

async function searchExpenses(groupId, actorId, filters, paging = {}) {
  await assertMember(groupId, actorId);
  const { limit, offset } = require('../utils/pagination').pagination(paging);
  const fields = ['id', filters.payer ? 'expense_payers!inner(user_id)' : '', filters.participant ? 'expense_shares!inner(user_id)' : ''].filter(Boolean).join(',');
  let request = supabase.from('expenses').select(fields).eq('group_id', groupId).is('deleted_at', null);
  if (filters.q) request = request.ilike('description', `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
  if (filters.category) request = request.eq('category_id', filters.category);
  if (filters.from) request = request.gte('expense_date', filters.from);
  if (filters.to) request = request.lte('expense_date', filters.to);
  if (filters.min != null) request = request.gte('total_amount_minor', toMinor(filters.min));
  if (filters.max != null) request = request.lte('total_amount_minor', toMinor(filters.max));
  if (filters.payer) request = request.eq('expense_payers.user_id', filters.payer);
  if (filters.participant) request = request.eq('expense_shares.user_id', filters.participant);
  request = request.order('expense_date', { ascending: false }).order('created_at', { ascending: false }).order('id');
  if (limit) request = request.range(offset, offset + limit);
  const rows = await query(request, 'expense search failed');
  const data = await Promise.all((limit ? rows.slice(0, limit) : rows).map((row) => getExpense(row.id)));
  return limit ? { data, nextOffset: rows.length > limit ? offset + limit : null } : data;
}

async function memberIds(groupId) {
  const rows = await query(supabase.from('group_members').select('user_id').eq('group_id', groupId), 'group member lookup failed');
  return new Set(rows.map((row) => row.user_id));
}

async function assertReferencedMembers(groupId, ids) {
  const allowed = await memberIds(groupId);
  if ([...new Set(ids.filter(Boolean))].some((id) => !allowed.has(id))) {
    const error = new Error('all referenced users must be members of this group'); error.statusCode = 400; throw error;
  }
}

function expenseBundle(expense, data, actorId) {
  return {
    p_expense: expense,
    p_payers: (data.payers || []).map((item) => ({ user_id: item.userId, paid_amount_minor: toMinor(item.paidAmount) })),
    p_shares: (data.shares || []).map((item) => ({ user_id: item.userId, owed_amount_minor: toMinor(item.owedAmount), share_value: item.shareValue ?? '', percent_value: item.percentValue ?? '', adjustment_value_minor: item.adjustmentValue == null ? '' : toMinor(item.adjustmentValue) })),
    p_items: (data.items || []).map((item) => ({ name: item.name, price_minor: toMinor(item.price) })),
    p_history: { changed_by: actorId, action: 'created', snapshot: expense },
    p_activity: { group_id: expense.group_id, user_id: actorId, kind: 'expense', text: 'Added an expense', detail: `${expense.description} · ${expense.currency} ${data.totalAmount}` },

  };
}

async function createExpense(data, actorId) {
  const groupId = await resolveGroupId(data.groupId, actorId);
  await assertMember(groupId, actorId);
  await assertReferencedMembers(groupId, [...(data.payers || []).map((item) => item.userId), ...(data.shares || []).map((item) => item.userId)]);
  const expense = {
    group_id: groupId, description: data.description, total_amount_minor: toMinor(data.totalAmount),
    currency: data.currency || 'INR', category_id: data.categoryId || data.category || 'Others',
    split_type: data.splitType, expense_kind: data.reimbursement ? 'REIMBURSEMENT' : 'NORMAL',
    expense_date: data.date || new Date().toISOString().slice(0, 10), created_by: actorId, notes: data.description,
  };
  const expenseId = await query(supabase.rpc('create_expense_bundle', expenseBundle(expense, data, actorId)), 'expense creation failed');
  return getExpense(expenseId, actorId);
}

async function updateExpense(id, data, actorId) {
  const existing = await query(supabase.from('expenses').select('*').eq('id', id).maybeSingle(), 'expense lookup failed');
  if (!existing || existing.deleted_at) { const error = new Error('expense not found'); error.statusCode = 404; throw error; }
  await assertMember(existing.group_id, actorId);
  await assertReferencedMembers(existing.group_id, [...(data.payers || []).map((item) => item.userId), ...(data.shares || []).map((item) => item.userId)]);
  const expense = { group_id: existing.group_id, description: data.description, total_amount_minor: toMinor(data.totalAmount), currency: data.currency || 'INR', category_id: data.categoryId || data.category || 'Others', split_type: data.splitType, expense_kind: data.reimbursement ? 'REIMBURSEMENT' : 'NORMAL', expense_date: data.date || existing.expense_date, notes: data.description };
  await query(supabase.rpc('update_expense_bundle', {
    p_expense_id: id, p_expense: expense,
    p_payers: (data.payers || []).map((item) => ({ user_id: item.userId, paid_amount_minor: toMinor(item.paidAmount) })),
    p_shares: (data.shares || []).map((item) => ({ user_id: item.userId, owed_amount_minor: toMinor(item.owedAmount), share_value: item.shareValue ?? '', percent_value: item.percentValue ?? '', adjustment_value_minor: item.adjustmentValue == null ? '' : toMinor(item.adjustmentValue) })),
    p_items: (data.items || []).map((item) => ({ name: item.name, price_minor: toMinor(item.price) })),
    p_history: { changed_by: actorId, action: 'updated', snapshot: expense },
  }), 'expense update failed');
  return getExpense(id, actorId);
}

async function deleteExpense(id, actorId) {
  const existing = await query(supabase.from('expenses').select('*').eq('id', id).maybeSingle(), 'expense lookup failed');
  if (!existing || existing.deleted_at) { const error = new Error('expense not found'); error.statusCode = 404; throw error; }
  await assertMember(existing.group_id, actorId);
  const updated = await query(supabase.from('expenses').update({ deleted_at: new Date().toISOString(), version: existing.version + 1 }).eq('id', id).eq('version', existing.version).select('*').single(), 'expense deletion failed');
  await query(supabase.from('expense_history').insert({ expense_id: id, changed_by: actorId, action: 'deleted', snapshot: updated }), 'expense history creation failed');
}

async function getExpenseHistory(id, actorId) {
  const expense = await getExpense(id, actorId); if (!expense) { const error = new Error('expense not found'); error.statusCode = 404; throw error; }
  await assertMember(expense.groupId, actorId);
  return query(supabase.from('expense_history').select('*').eq('expense_id', id).order('created_at', { ascending: false }), 'expense history lookup failed');
}

async function getComments(id, actorId) {
  const expense = await getExpense(id, actorId); if (!expense) { const error = new Error('expense not found'); error.statusCode = 404; throw error; }
  await assertMember(expense.groupId, actorId);
  return query(supabase.from('comments').select('*').eq('expense_id', id).order('created_at', { ascending: false }), 'expense comments lookup failed');
}

async function addComment(id, text, actorId) {
  const expense = await getExpense(id, actorId); if (!expense) { const error = new Error('expense not found'); error.statusCode = 404; throw error; }
  await assertMember(expense.groupId, actorId);
  return query(supabase.from('comments').insert({ expense_id: id, user_id: actorId, body: text }).select('*').single(), 'comment creation failed');
}

async function listChores(groupId, actorId) {
  await assertMember(groupId, actorId);
  return query(supabase.from('chores').select('*, profiles:assigned_to(id,name)').eq('group_id', groupId).is('deleted_at', null).order('due_date'), 'chores lookup failed');
}

async function createChore(data, actorId) {
  const groupId = await resolveGroupId(data.groupId, actorId); await assertMember(groupId, actorId);
  const assignedMembership = await query(supabase.from('group_members').select('profiles(id,name)').eq('group_id', groupId), 'assigned member lookup failed');
  const assigned = assignedMembership.map((item) => item.profiles).find((profile) => profile?.name?.toLowerCase() === String(data.assignedTo).toLowerCase());
  if (!assigned) { const error = new Error('member must be a household member'); error.statusCode = 400; throw error; }
  return query(supabase.from('chores').insert({ group_id: groupId, name: data.name, assigned_to: assigned.id, due_date: data.dueDate, start_time: data.startTime || null, duration_minutes: data.durationMinutes || null, recurrence_rule: data.recurrenceRule || null }).select('*, profiles:assigned_to(id,name)').single(), 'chore creation failed');
}

async function toggleChore(id, actorId) {
  const row = await query(supabase.from('chores').select('*').eq('id', id).maybeSingle(), 'chore lookup failed');
  if (!row) { const error = new Error('chore not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  const completed = row.status !== 'completed';
  const updated = await query(supabase.from('chores').update({ status: completed ? 'completed' : 'pending', completed_at: completed ? new Date().toISOString() : null }).eq('id', id).select('*, profiles:assigned_to(id,name)').single(), 'chore update failed');
  const nextDueDate = completed ? nextRecurrenceDate(row.due_date, row.recurrence_rule) : null;
  if (nextDueDate) {
    const existingNext = await query(supabase.from('chores').select('id').eq('group_id', row.group_id).eq('name', row.name).eq('assigned_to', row.assigned_to).eq('due_date', nextDueDate).is('deleted_at', null).maybeSingle(), 'recurring chore lookup failed');
    if (!existingNext) await query(supabase.from('chores').insert({ group_id: row.group_id, name: row.name, assigned_to: row.assigned_to, due_date: nextDueDate, start_time: row.start_time, duration_minutes: row.duration_minutes, recurrence_rule: row.recurrence_rule, status: 'pending' }), 'recurring chore creation failed');
  }
  return updated;
}

async function updateChore(id, data, actorId) {
  const row = await query(supabase.from('chores').select('*').eq('id', id).maybeSingle(), 'chore lookup failed');
  if (!row) { const error = new Error('chore not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  const assignedMembership = await query(supabase.from('group_members').select('profiles(id,name)').eq('group_id', row.group_id), 'assigned member lookup failed');
  const assigned = assignedMembership.map((item) => item.profiles).find((profile) => profile?.name?.toLowerCase() === String(data.assignedTo).toLowerCase());
  if (!assigned) { const error = new Error('member must be a household member'); error.statusCode = 400; throw error; }
  return query(supabase.from('chores').update({ name: data.name, assigned_to: assigned.id, due_date: data.dueDate, start_time: data.startTime || null, duration_minutes: data.durationMinutes || null, recurrence_rule: data.recurrenceRule || null }).eq('id', id).select('*, profiles:assigned_to(id,name)').single(), 'chore update failed');
}

async function deleteChore(id, actorId) {
  const row = await query(supabase.from('chores').select('group_id').eq('id', id).maybeSingle(), 'chore lookup failed');
  if (!row) { const error = new Error('chore not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  await query(supabase.from('chores').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'chore deletion failed');
}

async function listIncomes(groupId, actorId) {
  await assertMember(groupId, actorId);
  const rows = await query(supabase.from('incomes').select('*').eq('group_id', groupId).is('deleted_at', null).order('income_date', { ascending: false }), 'incomes lookup failed');
  return rows.map((row) => ({ id: row.id, source: row.source, amount: amount(row.amount_minor), amountMinor: row.amount_minor, currency: row.currency, addedBy: row.added_by, incomeType: row.income_type || 'PERSONAL', ownerUserId: (row.income_type || 'PERSONAL') === 'PERSONAL' ? (row.owner_user_id || row.added_by) : null, date: row.income_date }));
}

async function createIncome(data, actorId) {
  const groupId = await resolveGroupId(data.groupId, actorId); await assertMember(groupId, actorId);
  const incomeType = data.incomeType || 'PERSONAL';
  if (!['PERSONAL', 'HOUSEHOLD'].includes(incomeType)) { const error = new Error('incomeType must be PERSONAL or HOUSEHOLD'); error.statusCode = 400; throw error; }
  const ownerUserId = incomeType === 'PERSONAL' ? (data.ownerUserId || actorId) : null;
  if (ownerUserId) {
    const isMember = await query(supabase.from('group_members').select('user_id').eq('group_id', groupId).eq('user_id', ownerUserId).maybeSingle(), 'income owner membership lookup failed');
    if (!isMember) { const error = new Error('Income owner must be a household member'); error.statusCode = 400; throw error; }
  }
  const row = await query(supabase.from('incomes').insert({ group_id: groupId, source: data.source, amount_minor: toMinor(data.amount), currency: data.currency || 'INR', income_type: incomeType, owner_user_id: ownerUserId, added_by: actorId, income_date: data.date || new Date().toISOString().slice(0, 10) }).select('*').single(), 'income creation failed');
  await query(supabase.from('activities').insert({ group_id: groupId, user_id: actorId, kind: 'income', ref_type: 'income', ref_id: row.id, text: 'Added income', detail: `${row.source} · ${row.amount_minor}` }), 'activity creation failed');
  return { id: row.id, source: row.source, amount: amount(row.amount_minor), amountMinor: row.amount_minor, currency: row.currency, addedBy: row.added_by, incomeType: row.income_type, ownerUserId: row.owner_user_id, date: row.income_date };
}

async function updateIncome(id, data, actorId) {
  const row = await query(supabase.from('incomes').select('*').eq('id', id).maybeSingle(), 'income lookup failed');
  if (!row || row.deleted_at) { const error = new Error('income not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  const incomeType = data.incomeType || row.income_type || 'PERSONAL';
  if (!['PERSONAL', 'HOUSEHOLD'].includes(incomeType)) { const error = new Error('incomeType must be PERSONAL or HOUSEHOLD'); error.statusCode = 400; throw error; }
  const ownerUserId = incomeType === 'PERSONAL' ? (data.ownerUserId || row.owner_user_id || actorId) : null;
  if (ownerUserId) {
    const isMember = await query(supabase.from('group_members').select('user_id').eq('group_id', row.group_id).eq('user_id', ownerUserId).maybeSingle(), 'income owner membership lookup failed');
    if (!isMember) { const error = new Error('Income owner must be a household member'); error.statusCode = 400; throw error; }
  }
  const updated = await query(supabase.from('incomes').update({ source: data.source, amount_minor: toMinor(data.amount), income_type: incomeType, owner_user_id: ownerUserId, income_date: data.date || row.income_date }).eq('id', id).select('*').single(), 'income update failed');
  return { id: updated.id, source: updated.source, amount: amount(updated.amount_minor), amountMinor: updated.amount_minor, currency: updated.currency, addedBy: updated.added_by, incomeType: updated.income_type, ownerUserId: updated.owner_user_id, date: updated.income_date };
}

async function deleteIncome(id, actorId) {
  const row = await query(supabase.from('incomes').select('group_id').eq('id', id).maybeSingle(), 'income lookup failed');
  if (!row) { const error = new Error('income not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  await query(supabase.from('incomes').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'income deletion failed');
}

async function listShopping(groupId, actorId) {
  await assertMember(groupId, actorId);
  return query(supabase.from('shopping_items').select('*').eq('group_id', groupId).is('deleted_at', null).order('created_at'), 'shopping lookup failed');
}

async function createShopping(data, actorId) {
  const groupId = await resolveGroupId(data.groupId, actorId); await assertMember(groupId, actorId);
  return query(supabase.from('shopping_items').insert({ group_id: groupId, name: data.name, priority: data.priority || 'Medium', created_by: actorId }).select('*').single(), 'shopping item creation failed');
}

async function toggleShopping(id, actorId) {
  const row = await query(supabase.from('shopping_items').select('*').eq('id', id).maybeSingle(), 'shopping lookup failed');
  if (!row) { const error = new Error('item not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  return query(supabase.from('shopping_items').update({ purchased: !row.purchased, purchased_at: row.purchased ? null : new Date().toISOString() }).eq('id', id).select('*').single(), 'shopping update failed');
}

async function updateShopping(id, data, actorId) {
  const row = await query(supabase.from('shopping_items').select('*').eq('id', id).maybeSingle(), 'shopping lookup failed');
  if (!row) { const error = new Error('item not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  return query(supabase.from('shopping_items').update({ name: data.name, priority: data.priority, purchased: data.purchased }).eq('id', id).select('*').single(), 'shopping update failed');
}

async function purchaseShopping(id, purchaseAmount, actorId) {
  const item = await query(supabase.from('shopping_items').select('*').eq('id', id).maybeSingle(), 'shopping lookup failed');
  if (!item || item.deleted_at) { const error = new Error('item not found'); error.statusCode = 404; throw error; }
  if (item.purchased) { const error = new Error('shopping item is already purchased'); error.statusCode = 409; throw error; }
  const numericAmount = Number(purchaseAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) { const error = new Error('amount must be a positive number'); error.statusCode = 400; throw error; }
  await assertMember(item.group_id, actorId);
  const members = await listMembers(item.group_id, actorId);
  if (!members.length) { const error = new Error('group has no members to split this purchase'); error.statusCode = 400; throw error; }
  const each = Math.floor(toMinor(numericAmount) / members.length);
  const remainder = toMinor(numericAmount) - (each * members.length);
  const shares = members.map((member, index) => ({ userId: member.id, owedAmount: (each + (index === 0 ? remainder : 0)) / 100 }));
  const expense = await createExpense({ groupId: item.group_id, description: item.name, totalAmount: numericAmount, category: 'Groceries', categoryId: 'Groceries', splitType: 'EQUAL', payers: [{ userId: actorId, paidAmount: numericAmount }], shares, items: [] }, actorId);
  try {
    const updated = await query(supabase.from('shopping_items').update({ purchased: true, purchased_at: new Date().toISOString() }).eq('id', id).eq('purchased', false).select('*').single(), 'shopping purchase update failed');
    return { item: updated, expense };
  } catch (error) {
    await deleteExpense(expense.id, actorId);
    throw error;
  }
}

async function deleteShopping(id, actorId) {
  const row = await query(supabase.from('shopping_items').select('group_id').eq('id', id).maybeSingle(), 'shopping lookup failed');
  if (!row) { const error = new Error('item not found'); error.statusCode = 404; throw error; }
  await assertMember(row.group_id, actorId);
  await query(supabase.from('shopping_items').update({ deleted_at: new Date().toISOString() }).eq('id', id), 'shopping deletion failed');
}

async function listActivities(groupId, actorId) {
  await assertMember(groupId, actorId);
  const rows = await query(supabase.from('activities').select('*').eq('group_id', groupId).order('created_at', { ascending: false }), 'activity lookup failed');
  return rows.map((row) => ({ id: row.id, kind: row.kind, text: row.text, detail: row.detail, createdAt: row.created_at, time: row.created_at }));
}

async function getSummary(groupId, actorId) {
  let [expenses, incomes, group] = await Promise.all([listExpenses(groupId, actorId), listIncomes(groupId, actorId), getGroup(groupId, actorId)]);
  expenses = expenses.filter((e) => (e.currency || 'INR') === 'INR');
  incomes = incomes.filter((e) => (e.currency || 'INR') === 'INR' && e.incomeType === 'HOUSEHOLD');
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const now = new Date().toISOString().slice(0, 7);
  const budgetSpent = expenses.filter((item) => String(item.date || '').startsWith(now)).reduce((sum, item) => sum + item.amount, 0);
  const budget = group.monthlyBudget;
  return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, budget, budgetSpent, spentPct: Math.round(budgetSpent / budget * 100), byCategory: expenses.reduce((out, item) => { out[item.category] = (out[item.category] || 0) + item.amount; return out; }, {}) };
}

async function listGroups(actorId) {
  const memberships = await query(
    supabase.from('group_members').select('group_id, groups(*)').eq('user_id', actorId),
    'groups lookup failed'
  );
  return memberships.map(({ groups: row }) => row).filter(Boolean).map((row) => ({
    id: row.id,
    name: row.name,
    simplifyDebts: row.simplify_debts,
    plan: row.plan || 'FREE',
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    maxMembers: row.max_members || 5,
    createdAt: row.created_at,
  }));
}

async function groupsOverview(actorId) {
  const groups = await listGroups(actorId);
  if (!groups.length) return { groups: [], combined: { totalExpenses: 0, totalIncome: 0, groupCount: 0 } };
  const ids = groups.map((group) => group.id);
  const [expenses, memberships] = await Promise.all([
    query(supabase.from('expenses').select('group_id,total_amount_minor').eq('currency', 'INR').in('group_id', ids).is('deleted_at', null), 'group expense totals failed'),
    query(supabase.from('group_members').select('group_id').in('group_id', ids), 'group member totals failed'),
  ]);
  let incomes = [];
  try {
    incomes = await query(supabase.from('incomes').select('group_id,amount_minor').eq('currency', 'INR').eq('income_type', 'HOUSEHOLD').in('group_id', ids).is('deleted_at', null), 'group income totals failed');
  } catch (error) {
    // Keep an older deployment usable while the additive income ownership migration is pending.
    // Treat legacy entries as personal; they must never leak into a shared household total.
    if (!/income_type/i.test(error.message || '')) throw error;
  }
  const expenseTotals = Object.fromEntries(groups.map((group) => [group.id, 0]));
  const incomeTotals = Object.fromEntries(groups.map((group) => [group.id, 0]));
  const memberTotals = Object.fromEntries(groups.map((group) => [group.id, 0]));
  expenses.forEach((row) => { expenseTotals[row.group_id] += Number(row.total_amount_minor || 0) / 100; });
  incomes.forEach((row) => { incomeTotals[row.group_id] += Number(row.amount_minor || 0) / 100; });
  memberships.forEach((row) => { memberTotals[row.group_id] += 1; });
  const enriched = groups.map((group) => ({
    ...group,
    memberCount: memberTotals[group.id] || 0,
    totalExpenses: expenseTotals[group.id] || 0,
    totalIncome: incomeTotals[group.id] || 0,
  }));
  return {
    groups: enriched,
    combined: {
      totalExpenses: enriched.reduce((sum, group) => sum + group.totalExpenses, 0),
      totalIncome: enriched.reduce((sum, group) => sum + group.totalIncome, 0),
      groupCount: enriched.length,
    },
  };
}

async function addGroupMember(groupId, email, actorId) {
  const id = await resolveGroupId(groupId, actorId);
  await assertMember(id, actorId);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const profile = await query(supabase.from('profiles').select('*').ilike('email', normalizedEmail).maybeSingle(), 'member lookup failed');
  if (!profile) { const error = new Error('No RoomMate account exists for that email'); error.statusCode = 404; throw error; }
  const memberCountResult = await supabase.from('group_members').select('user_id', { count: 'exact', head: true }).eq('group_id', id);
  const memberCountError = dbError(memberCountResult.error, 'member count failed');
  if (memberCountError) throw memberCountError;
  const count = memberCountResult.count || 0;
  const group = await query(supabase.from('groups').select('max_members').eq('id', id).single(), 'group lookup failed');
  if (Number(count) >= Number(group.max_members || 5)) { const error = new Error('This group has reached its member limit'); error.statusCode = 409; throw error; }
  await query(supabase.from('group_members').insert({ group_id: id, user_id: profile.id }), 'member add failed');
  return profileRow(profile, actorId);
}

function inviteTokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function inviteOrigin(requestOrigin) {
  if (config.PUBLIC_APP_URL) return new URL(config.PUBLIC_APP_URL).origin;
  const allowed = config.CORS_ORIGINS.map((origin) => { try { return new URL(origin).origin; } catch { return null; } }).filter(Boolean);
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  return allowed.find((origin) => !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|$)/i.test(origin)) || allowed[0] || 'http://localhost:5173';
}

function inviteView(row, token, requestOrigin) {
  const invitePath = token ? `/join/${encodeURIComponent(token)}` : undefined;
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.groups?.name || row.group_name,
    invitedEmail: row.invited_email,
    status: row.status,
    expiresAt: row.expires_at,
    invitePath,
    inviteUrl: invitePath ? new URL(invitePath, inviteOrigin(requestOrigin)).toString() : undefined,
  };
}

async function createGroupInvite(groupId, email, actorId, requestOrigin) {
  const id = await resolveGroupId(groupId, actorId);
  await assertMember(id, actorId);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { const error = new Error('Enter a valid email address'); error.statusCode = 400; throw error; }
  const profile = await query(supabase.from('profiles').select('id').ilike('email', normalizedEmail).maybeSingle(), 'invite profile lookup failed');
  if (profile) {
    const member = await query(supabase.from('group_members').select('user_id').eq('group_id', id).eq('user_id', profile.id).maybeSingle(), 'membership lookup failed');
    if (member) { const error = new Error('This person is already in the group'); error.statusCode = 409; throw error; }
  }
  const pending = await query(supabase.from('group_invites').select('id').eq('group_id', id).ilike('invited_email', normalizedEmail).eq('status', 'pending').maybeSingle(), 'pending invite lookup failed');
  const token = crypto.randomBytes(32).toString('base64url');
  const invitation = {
    invited_by: actorId,
    invited_user_id: profile?.id || null,
    token_hash: inviteTokenHash(token),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  const row = pending
    ? await query(supabase.from('group_invites').update(invitation).eq('id', pending.id).eq('status', 'pending').select('*, groups(name)').single(), 'invite renewal failed')
    : await query(supabase.from('group_invites').insert({ ...invitation, group_id: id, invited_email: normalizedEmail }).select('*, groups(name)').single(), 'invite creation failed');
  return inviteView(row, token, requestOrigin);
}

async function previewGroupInvite(token) {
  const row = await query(supabase.from('group_invites').select('*, groups(id,name)').eq('token_hash', inviteTokenHash(token)).maybeSingle(), 'invite lookup failed');
  if (!row) { const error = new Error('Invitation not found'); error.statusCode = 404; throw error; }
  if (row.status === 'pending' && new Date(row.expires_at) < new Date()) {
    await query(supabase.from('group_invites').update({ status: 'expired' }).eq('id', row.id), 'invite expiry update failed');
    row.status = 'expired';
  }
  return inviteView(row);
}

async function acceptGroupInvite(token, actorId, actorEmail) {
  const hash = inviteTokenHash(token);
  const row = await query(supabase.from('group_invites').select('*, groups(id,name)').eq('token_hash', hash).maybeSingle(), 'invite lookup failed');
  if (!row) { const error = new Error('Invitation not found'); error.statusCode = 404; throw error; }
  if (row.status !== 'pending' || new Date(row.expires_at) < new Date()) { const error = new Error('This invitation has expired or is no longer active'); error.statusCode = 410; throw error; }
  if (String(row.invited_email).toLowerCase() !== String(actorEmail || '').toLowerCase()) { const error = new Error('Sign in with the email address that received this invitation'); error.statusCode = 403; throw error; }
  await query(supabase.from('group_members').upsert({ group_id: row.group_id, user_id: actorId }), 'group membership creation failed');
  const accepted = await query(supabase.from('group_invites').update({ status: 'accepted', invited_user_id: actorId, accepted_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'pending').select('*, groups(id,name)').single(), 'invite acceptance failed');
  return inviteView(accepted);
}

async function declineGroupInvite(token, actorEmail) {
  const row = await query(supabase.from('group_invites').select('*').eq('token_hash', inviteTokenHash(token)).maybeSingle(), 'invite lookup failed');
  if (!row) { const error = new Error('Invitation not found'); error.statusCode = 404; throw error; }
  if (String(row.invited_email).toLowerCase() !== String(actorEmail || '').toLowerCase()) { const error = new Error('This invitation belongs to another email address'); error.statusCode = 403; throw error; }
  await query(supabase.from('group_invites').update({ status: 'declined' }).eq('id', row.id).eq('status', 'pending'), 'invite decline failed');
  return { ok: true };
}

async function createGroup(name, actorId) {
  const trialStartedAt = new Date();
  const trialEndsAt = new Date(trialStartedAt.getTime() + 14 * 86400000);
  const row = await query(supabase.from('groups').insert({ name, simplify_debts: false, plan: 'PLUS', trial_started_at: trialStartedAt.toISOString(), trial_ends_at: trialEndsAt.toISOString(), max_members: 5 }).select('*').single(), 'group creation failed');
  await query(supabase.from('group_members').insert({ group_id: row.id, user_id: actorId }), 'group membership creation failed');
  return { id: row.id, name: row.name, simplifyDebts: row.simplify_debts, monthlyBudget: row.monthly_budget_minor == null ? DEFAULT_MONTHLY_BUDGET : amount(row.monthly_budget_minor), plan: row.plan || 'PLUS', trialStartedAt: row.trial_started_at, trialEndsAt: row.trial_ends_at, maxMembers: row.max_members || 5, memberIds: [actorId], createdAt: row.created_at };
}

async function getGroup(groupId, actorId) {
  const id = await resolveGroupId(groupId, actorId);
  const row = await query(supabase.from('groups').select('*').eq('id', id).single(), 'group lookup failed');
  const members = await query(supabase.from('group_members').select('profiles(*)').eq('group_id', id), 'group members lookup failed');
  return { id: row.id, name: row.name, defaultSplit: row.default_split || null, simplifyDebts: row.simplify_debts, monthlyBudget: row.monthly_budget_minor == null ? DEFAULT_MONTHLY_BUDGET : amount(row.monthly_budget_minor), plan: row.plan || 'FREE', trialStartedAt: row.trial_started_at, trialEndsAt: row.trial_ends_at, maxMembers: row.max_members || 5, memberIds: members.map((item) => item.profiles?.id).filter(Boolean), members: members.map((item) => profileRow(item.profiles, actorId)).filter(Boolean), createdAt: row.created_at };
}

async function listMembers(groupId, actorId) {
  const id = await resolveGroupId(groupId, actorId);
  const rows = await query(supabase.from('group_members').select('profiles(*)').eq('group_id', id), 'members lookup failed');
  return rows.map((item) => profileRow(item.profiles, actorId)).filter(Boolean);
}

async function updateGroupSettings(groupId, patch, actorId) {
  const id = await resolveGroupId(groupId, actorId); await assertMember(id, actorId);
  const update = {};
  if (patch.defaultSplit !== undefined) update.default_split = require('../services/defaultSplits').validateDefaultSplit(patch.defaultSplit, await listMembers(id, actorId));
  if (patch.simplifyDebts !== undefined) update.simplify_debts = patch.simplifyDebts;
  if (patch.monthlyBudget !== undefined) update.monthly_budget_minor = toMinor(validateMonthlyBudget(patch.monthlyBudget));
  if (patch.name !== undefined) { const name = String(patch.name).trim(); if (!name || name.length > 80) { const error = new Error('name must be between 1 and 80 characters'); error.statusCode = 400; throw error; } update.name = name; }
  if (!Object.keys(update).length) { const error = new Error('no supported group settings were supplied'); error.statusCode = 400; throw error; }
  const row = await query(supabase.from('groups').update(update).eq('id', id).select('*').single(), 'group update failed');
  return getGroup(id, actorId);
}

async function calculateBalances(groupId, actorId, currency = 'INR') {
  require('../services/currencies').currencyCode(currency);
  const id = await resolveGroupId(groupId, actorId);
  const [group, expenses, settlements] = await Promise.all([
    getGroup(id, actorId), listExpenses(id, actorId), query(supabase.from('settlements').select('*').eq('group_id', id).order('settled_at'), 'settlements lookup failed'),
  ]);
  return calculateBalancesFromRows(group, expenses, settlements, currency);
}

function calculateBalancesFromRows(group, expenses, settlements, currency = 'INR') {
  expenses = expenses.filter((e) => (e.currency || 'INR') === currency);
  settlements = settlements.filter((e) => (e.currency || 'INR') === currency);
  const net = Object.fromEntries((group.members || []).map((member) => [member.id, 0]));
  const pairMap = {};
  const addNet = (userId, value) => { net[userId] = (net[userId] || 0) + value; };
  const addPair = (from, to, value) => { if (from === to || value <= 0) return; const key = `${from}|${to}`; pairMap[key] = (pairMap[key] || 0) + value; };
  const adjustPair = (from, to, value) => { if (from === to) return; const key = `${from}|${to}`; pairMap[key] = (pairMap[key] || 0) + value; };
  for (const expense of expenses) {
    const shareTotal = expense.shares.reduce((sum, item) => sum + Math.abs(Number(item.owedAmount || 0)), 0);
    expense.payers.forEach((payer) => addNet(payer.userId, Number(payer.paidAmount || 0)));
    expense.shares.forEach((share) => addNet(share.userId, -Number(share.owedAmount || 0)));
    if (!shareTotal) continue;
    if (expense.shares.some((share) => Number(share.owedAmount || 0) < 0)) {
      const expenseNet = {};
      expense.payers.forEach((payer) => { expenseNet[payer.userId] = (expenseNet[payer.userId] || 0) + Number(payer.paidAmount || 0); });
      expense.shares.forEach((share) => { expenseNet[share.userId] = (expenseNet[share.userId] || 0) - Number(share.owedAmount || 0); });
      simplifyDebts(expenseNet).forEach((edge) => addPair(edge.fromUserId, edge.toUserId, edge.amount));
      continue;
    }
    expense.payers.forEach((payer) => expense.shares.forEach((share) => {
      const value = Math.round(Math.abs(Number(share.owedAmount || 0)) / shareTotal * Number(payer.paidAmount || 0) * 100) / 100;
      if (Number(share.owedAmount || 0) >= 0) addPair(share.userId, payer.userId, value);
      else addPair(payer.userId, share.userId, value);
    }));
  }
  settlements.forEach((item) => { const value = amount(item.amount_minor); addNet(item.from_user_id, value); addNet(item.to_user_id, -value); adjustPair(item.from_user_id, item.to_user_id, -value); });
  const pairwise = Object.entries(pairMap).map(([key, value]) => { const [fromUserId, toUserId] = key.split('|'); const reverse = pairMap[`${toUserId}|${fromUserId}`] || 0; const amountValue = Math.round((value - reverse) * 100) / 100; return amountValue > 0 ? { fromUserId, toUserId, amount: amountValue, fromName: group.members.find((m) => m.id === fromUserId)?.name || fromUserId, toName: group.members.find((m) => m.id === toUserId)?.name || toUserId, currency } : null; }).filter(Boolean);
  return { currency, net: group.members.map((member) => ({ userId: member.id, name: member.name, amount: Math.round((net[member.id] || 0) * 100) / 100, type: (net[member.id] || 0) >= 0 ? 'gets' : 'owes' })), pairwise, netMap: net, simplified: simplifyDebts(net).map((entry) => ({ ...entry, fromName: group.members.find((m) => m.id === entry.fromUserId)?.name || entry.fromUserId, toName: group.members.find((m) => m.id === entry.toUserId)?.name || entry.toUserId, currency })) };
}

async function listSettlements(groupId, actorId) {
  const id = await resolveGroupId(groupId, actorId);
  const rows = await query(supabase.from('settlements').select('*').eq('group_id', id).order('settled_at', { ascending: false }), 'settlements lookup failed');
  return rows.map((row) => ({ ...row, amount: amount(row.amount_minor), amountMinor: row.amount_minor, fromUserId: row.from_user_id, toUserId: row.to_user_id, settledAt: row.settled_at }));
}

async function createSettlement(data, actorId) {
  const groupId = await resolveGroupId(data.groupId, actorId); await assertMember(groupId, actorId);
  await assertReferencedMembers(groupId, [data.fromUserId, data.toUserId]);
  const row = await query(supabase.from('settlements').insert({ group_id: groupId, from_user_id: data.fromUserId, to_user_id: data.toUserId, amount_minor: toMinor(data.amount), currency: data.currency || 'INR', method: data.method || 'cash', note: data.note || '' }).select('*').single(), 'settlement creation failed');
  await query(supabase.from('activities').insert({ group_id: groupId, user_id: actorId, kind: 'settle', ref_type: 'settlement', ref_id: row.id, text: 'Recorded a settlement', detail: `${data.amount}` }), 'activity creation failed');
  return { ...row, amount: amount(row.amount_minor), amountMinor: row.amount_minor, fromUserId: row.from_user_id, toUserId: row.to_user_id, settledAt: row.settled_at };
}

module.exports = { expenseBundle, searchExpenses, enabled, resolveGroupId, assertMember, listExpenses, getExpense, createExpense, updateExpense, deleteExpense, getExpenseHistory, getComments, addComment, listChores, createChore, updateChore, toggleChore, deleteChore, listIncomes, createIncome, updateIncome, deleteIncome, listShopping, createShopping, updateShopping, purchaseShopping, toggleShopping, deleteShopping, listActivities, getSummary, listGroups, groupsOverview, addGroupMember, createGroup, createGroupInvite, previewGroupInvite, acceptGroupInvite, declineGroupInvite, getGroup, listMembers, updateGroupSettings, calculateBalances, calculateBalancesFromRows, listSettlements, createSettlement, amount, query, supabase };
