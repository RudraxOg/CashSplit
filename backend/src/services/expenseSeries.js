const crypto = require('node:crypto');
const { z } = require('zod');
const repository = require('../repositories/supabaseRepository');
const store = require('../data/store');
const { parseBody, expenseSchema, toMinor } = require('../utils/validation');
const { normalizePayload, normalizeSupabasePayload, createExpense } = require('./expenseService');
const memory = new Map();
const occurrences = new Map();
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const schema = z.object({ template: expenseSchema, frequency: z.enum(['WEEKLY','FORTNIGHTLY','MONTHLY','YEARLY']), firstDate: z.iso.date(), timeZone: z.string().max(80).default('Asia/Kolkata') });
function dateInZone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
function nextDate(value, frequency, anchorDay) {
  const date = new Date(`${value}T12:00:00Z`);
  if (frequency === 'WEEKLY' || frequency === 'FORTNIGHTLY') date.setUTCDate(date.getUTCDate() + (frequency === 'WEEKLY' ? 7 : 14));
  else {
    const month = date.getUTCMonth() + (frequency === 'MONTHLY' ? 1 : 12);
    date.setUTCDate(1); date.setUTCMonth(month);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(anchorDay, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
async function authorize(groupId, actorId) {
  if (repository.enabled()) return repository.resolveGroupId(groupId, actorId);
  if (!store.getGroup(groupId)?.memberIds.includes(actorId)) throw fail('group not found', 404);
  return groupId;
}
async function validateTemplate(template, groupId, actorId) {
  const data = parseBody({ ...template, groupId }, expenseSchema);
  if (!repository.enabled()) return normalizePayload(data);
  const normalized = normalizeSupabasePayload(data, actorId);
  const members = await repository.listMembers(groupId, actorId);
  const ids = [...normalized.payers, ...normalized.shares].map((p) => p.userId);
  if (ids.some((id) => !members.some((m) => m.id === id))) throw fail('Recurring expense contains someone who is no longer a household member');
  return normalized;
}
async function list(groupId, actorId) {
  const id = await authorize(groupId, actorId);
  if (repository.enabled()) return repository.query(repository.supabase.from('expense_series').select('*').eq('group_id', id).order('next_date'));
  return [...memory.values()].filter((s) => s.group_id === id);
}
async function create(input, actorId) {
  const data = parseBody(input, schema);
  try { dateInZone(data.timeZone); } catch { throw fail('Invalid time zone'); }
  const groupId = await authorize(data.template.groupId || 'g1', actorId);
  await validateTemplate(data.template, groupId, actorId);
  const row = { group_id: groupId, created_by: actorId, template: { ...data.template, groupId }, frequency: data.frequency, next_date: data.firstDate, time_zone: data.timeZone, anchor_day: Number(data.firstDate.slice(-2)), active: true, version: 1, last_error: null };
  const series = repository.enabled() ? await repository.query(repository.supabase.from('expense_series').insert(row).select('*').single()) : { ...row, id: crypto.randomUUID() };
  if (!repository.enabled()) memory.set(series.id, series);
  return series;
}
async function update(id, input, actorId) {
  const row = repository.enabled() ? await repository.query(repository.supabase.from('expense_series').select('*').eq('id', id).maybeSingle()) : memory.get(id);
  if (!row) throw fail('series not found', 404);
  await authorize(row.group_id, actorId);
  const patch = parseBody(input, z.object({ active: z.boolean().optional(), template: expenseSchema.optional(), version: z.number().int().positive() }));
  if (patch.version !== row.version) throw fail('This schedule changed. Reload before editing.', 409);
  if (patch.template) await validateTemplate(patch.template, row.group_id, actorId);
  const changes = { ...(patch.active !== undefined ? { active: patch.active } : {}), ...(patch.template ? { template: { ...patch.template, groupId: row.group_id } } : {}), version: row.version + 1, last_error: null };
  if (repository.enabled()) return repository.query(repository.supabase.from('expense_series').update(changes).eq('id', id).eq('version', row.version).select('*').single());
  Object.assign(row, changes); return row;
}
async function postOccurrence(series) {
  const due = series.next_date;
  const next = nextDate(due, series.frequency, series.anchor_day);
  const template = { ...series.template, date: due, groupId: series.group_id };
  await authorize(series.group_id, series.created_by);
  const data = await validateTemplate(template, series.group_id, series.created_by);
  if (repository.enabled()) {
    const expense = { group_id: series.group_id, created_by: series.created_by, description: data.description, total_amount_minor: toMinor(data.totalAmount), currency: data.currency || 'INR', category_id: data.categoryId || data.category || 'Others', split_type: data.splitType, expense_kind: data.reimbursement ? 'REIMBURSEMENT' : 'NORMAL', expense_date: due, notes: data.description };
    return repository.query(repository.supabase.rpc('post_expense_occurrence', { p_series_id: series.id, p_date: due, p_next_date: next, p_version: series.version, p_bundle: repository.expenseBundle(expense, data, series.created_by) }));
  }
  const key = `${series.id}:${due}`;
  if (occurrences.has(key)) return occurrences.get(key);
  // Reserve synchronously before awaiting creation; release only on failure.
  occurrences.set(key, 'processing');
  try { const expense = await createExpense(template, series.created_by); occurrences.set(key, expense.id); series.next_date = next; series.last_error = null; return expense.id; }
  catch (error) { occurrences.delete(key); throw error; }
}
let running = false;
async function runDue(now = new Date()) {
  if (running) return { processed: 0 };
  running = true; let processed = 0;
  try {
    const rows = repository.enabled() ? await repository.query(repository.supabase.from('expense_series').select('*').eq('active', true).lte('next_date', new Date(now.getTime() + 86400000).toISOString().slice(0,10)).limit(100)) : [...memory.values()].filter((s) => s.active);
    for (const row of rows) {
      if (row.next_date > dateInZone(row.time_zone, now)) continue;
      try { await postOccurrence(row); processed++; }
      catch (error) {
        const last_error = error.message;
        if (repository.enabled()) await repository.query(repository.supabase.from('expense_series').update({ last_error }).eq('id', row.id));
        else row.last_error = last_error;
      }
    }
    return { processed };
  } finally { running = false; }
}
module.exports = { create, list, update, runDue, nextDate, dateInZone };
