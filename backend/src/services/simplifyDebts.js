function round(value) { return Math.round(value * 100) / 100; }

function simplifyDebts(net) {
  const debtors = Object.entries(net).filter(([, amount]) => amount < -0.005).map(([userId, amount]) => ({ userId, amount: round(-amount) })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(net).filter(([, amount]) => amount > 0.005).map(([userId, amount]) => ({ userId, amount: round(amount) })).sort((a, b) => b.amount - a.amount);
  const transactions = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = round(Math.min(debtor.amount, creditor.amount));
    if (amount > 0) transactions.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount, currency: 'INR' });
    debtor.amount = round(debtor.amount - amount);
    creditor.amount = round(creditor.amount - amount);
    if (debtor.amount <= 0.005) debtorIndex += 1;
    if (creditor.amount <= 0.005) creditorIndex += 1;
  }
  return transactions;
}

module.exports = { simplifyDebts };
