const { z } = require('zod');
const { parseBody } = require('../utils/validation');
const schema = z.object({
  q: z.string().trim().max(160).optional(), category: z.string().max(80).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  payer: z.string().max(80).optional(), participant: z.string().max(80).optional(),
  min: z.coerce.number().finite().nonnegative().optional(), max: z.coerce.number().finite().nonnegative().optional(),
}).refine((v) => !v.from || !v.to || v.from <= v.to, 'Start date must precede end date')
  .refine((v) => v.min == null || v.max == null || v.min <= v.max, 'Minimum must not exceed maximum');
function expenseFilters(input) { return parseBody(Object.fromEntries(Object.entries(input).filter(([, value]) => value !== '')), schema); }
function filterExpenses(rows, f) {
  return rows.filter((e) => (!f.q || (e.description || e.note || '').toLowerCase().includes(f.q.toLowerCase()))
    && (!f.category || (e.categoryId || e.category) === f.category)
    && (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to)
    && (f.min == null || Number(e.totalAmount ?? e.amount) >= f.min)
    && (f.max == null || Number(e.totalAmount ?? e.amount) <= f.max)
    && (!f.payer || e.payers.some((p) => p.userId === f.payer))
    && (!f.participant || e.shares.some((p) => p.userId === f.participant)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || String(b.id).localeCompare(String(a.id)));
}
function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function* ledgerCsv(expenses, settlements, members) {
  yield ['Type', 'ID', 'Date', 'Description', 'Currency', 'Cost', ...members.map((m) => `${m.name} (${m.id})`)].map(csvCell).join(',') + '\r\n';
  for (const e of expenses) {
    const impacts = members.map((m) => {
      const paid = e.payers.filter((p) => p.userId === m.id).reduce((s, p) => s + Math.round(p.paidAmount * 100), 0);
      const owed = e.shares.filter((p) => p.userId === m.id).reduce((s, p) => s + Math.round(p.owedAmount * 100), 0);
      return (paid - owed) / 100;
    });
    yield ['Expense', e.id, e.date, e.description || e.note, e.currency || 'INR', e.totalAmount ?? e.amount, ...impacts].map(csvCell).join(',') + '\r\n';
  }
  for (const s of settlements) yield ['Settlement', s.id, s.settledAt, s.note || '', s.currency || 'INR', s.amount,
    ...members.map((m) => m.id === s.fromUserId ? s.amount : m.id === s.toUserId ? -s.amount : 0)].map(csvCell).join(',') + '\r\n';
}
module.exports = { expenseFilters, filterExpenses, ledgerCsv };
