const express = require('express');
const crypto = require('node:crypto');
const repository = require('../repositories/supabaseRepository');
const store = require('../data/store');
const router = express.Router();
const files = new Map();
const bucket = 'expense-receipts';
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
async function expenseFor(id, actorId) {
  if (repository.enabled()) { const expense = await repository.getExpense(id, actorId); if (!expense) throw fail('expense not found', 404); return expense; }
  const expense = store.getExpenseById(Number(id));
  if (!expense || expense.deletedAt || !store.getGroup(expense.groupId)?.memberIds.includes(actorId)) throw fail('expense not found', 404);
  return expense;
}
function receiptType(data) {
  if (data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ['image/png','png'];
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return ['image/jpeg','jpg'];
  if (data.subarray(0,5).toString() === '%PDF-') return ['application/pdf','pdf'];
  throw fail('Upload a JPEG, PNG, or PDF receipt.', 400);
}
router.put('/:id/receipt', express.raw({ type: '*/*', limit: '5mb' }), async (req, res, next) => {
  try {
    const expense = await expenseFor(req.params.id, req.user.id);
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw fail('Choose a receipt file.', 400);
    const [contentType, extension] = receiptType(req.body);
    if (repository.enabled()) {
      const path = `${expense.groupId}/${expense.id}/${crypto.randomUUID()}.${extension}`;
      await repository.query(repository.supabase.storage.from(bucket).upload(path, req.body, { contentType, upsert: false }));
      try { await repository.query(repository.supabase.from('expenses').update({ receipt_image_url: path }).eq('id', expense.id)); }
      catch (error) { await repository.supabase.storage.from(bucket).remove([path]); throw error; }
      if (expense.receiptPath) await repository.supabase.storage.from(bucket).remove([expense.receiptPath]);
    } else {
      if (!files.has(expense.id) && files.size >= 50) throw fail('Demo receipt storage is full.', 409);
      files.set(expense.id, { data: req.body, contentType }); store.updateExpense(expense.id, { hasReceipt: true });
    }
    res.json({ hasReceipt: true });
  } catch (error) { next(error); }
});
router.get('/:id/receipt', async (req, res, next) => {
  try {
    const expense = await expenseFor(req.params.id, req.user.id);
    let file;
    if (repository.enabled()) {
      if (!expense.receiptPath) throw fail('receipt not found', 404);
      const data = await repository.query(repository.supabase.storage.from(bucket).download(expense.receiptPath));
      file = { data: Buffer.from(await data.arrayBuffer()), contentType: data.type };
    } else file = files.get(expense.id);
    if (!file) throw fail('receipt not found', 404);
    res.set('Cache-Control','private, no-store').set('X-Content-Type-Options','nosniff').set('Content-Disposition','attachment; filename="receipt"').type(file.contentType).send(file.data);
  } catch (error) { next(error); }
});
router.delete('/:id/receipt', async (req, res, next) => {
  try {
    const expense = await expenseFor(req.params.id, req.user.id);
    if (repository.enabled()) {
      if (expense.receiptPath) await repository.query(repository.supabase.storage.from(bucket).remove([expense.receiptPath]));
      await repository.query(repository.supabase.from('expenses').update({ receipt_image_url: null }).eq('id', expense.id));
    } else { files.delete(expense.id); store.updateExpense(expense.id, { hasReceipt: false }); }
    res.json({ hasReceipt: false });
  } catch (error) { next(error); }
});
module.exports = router;
