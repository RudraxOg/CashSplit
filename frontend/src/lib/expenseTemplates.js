export function resizeTemplate(template, total) {
  const oldTotal = Number(template.totalAmount ?? template.amount);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(oldTotal) || oldTotal <= 0) throw new Error('Enter an amount greater than zero.');
  const scale = (value) => Math.round(Number(value || 0) * total / oldTotal * 100) / 100;
  const reconcile = (items, key) => {
    if (items?.length) items[0][key] = Math.round((items[0][key] + total - items.reduce((sum, item) => sum + item[key], 0)) * 100) / 100;
    return items;
  };
  const payers = template.payers?.map((p) => ({ ...p, paidAmount: scale(p.paidAmount) }));
  const participants = template.participants?.map((p) => ({ ...p, ...(template.splitType === 'EXACT' ? { amount: scale(p.amount) } : {}), ...(template.splitType === 'ADJUSTMENT' ? { adjustment: scale(p.adjustment) } : {}) }));
  reconcile(payers, 'paidAmount');
  if (template.splitType === 'EXACT') reconcile(participants, 'amount');
  return { ...template, amount: total, totalAmount: total, payers, participants, items: template.items?.map((i) => ({ ...i, price: scale(i.price) })), tax: scale(template.tax), tip: scale(template.tip), discount: scale(template.discount) };
}
