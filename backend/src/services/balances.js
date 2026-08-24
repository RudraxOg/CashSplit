const store = require('../data/store');

const round = (value) => Math.round(value * 100) / 100;
const minor = (value, fallback = false) => Number.isInteger(value) ? value : Math.round(Number(value || 0) * 100);

function membersForGroup(groupId) {
  const group = store.getGroup(groupId);
  return group ? group.memberIds.map((id) => store.MEMBERS.find((member) => member.id === id)).filter(Boolean) : store.MEMBERS;
}

function calculate(groupId = 'g1') {
  const expenses = store.getExpenses().filter((expense) => !expense.deletedAt && (expense.groupId || 'g1') === groupId);
  const settlements = store.getSettlements().filter((settlement) => (settlement.groupId || 'g1') === groupId);
  const pairMap = {};
  const netByCurrency = {};
  const addNet = (userId, amount, currency = 'INR') => {
    netByCurrency[currency] ||= {};
    netByCurrency[currency][userId] = (netByCurrency[currency][userId] || 0) + minor(amount);
  };
  const addPair = (fromUserId, toUserId, amount, currency = 'INR') => {
    if (fromUserId === toUserId || amount <= 0.005) return;
    const key = `${currency}|${fromUserId}|${toUserId}`;
    pairMap[key] = (pairMap[key] || 0) + minor(amount);
  };
  const adjustPair = (fromUserId, toUserId, amount, currency = 'INR') => {
    if (fromUserId === toUserId) return;
    const key = `${currency}|${fromUserId}|${toUserId}`;
    pairMap[key] = (pairMap[key] || 0) + minor(amount);
  };

  for (const expense of expenses) {
    const payers = store.getExpensePayers(expense.id);
    const shares = store.getExpenseShares(expense.id);
    const currency = expense.currency || 'INR';
    payers.forEach((payer) => addNet(payer.userId, payer.paidAmountMinor ?? payer.paidAmount, currency));
    shares.forEach((share) => addNet(share.userId, -(share.owedAmountMinor ?? minor(share.owedAmount)), currency));
    const shareTotal = shares.reduce((sum, share) => sum + Math.abs(share.owedAmountMinor ?? minor(share.owedAmount)), 0);
    if (shareTotal <= 0) continue;
    payers.forEach((payer) => shares.forEach((share) => {
      const owed = Math.round(Math.abs(share.owedAmountMinor ?? minor(share.owedAmount)) / shareTotal * (payer.paidAmountMinor ?? minor(payer.paidAmount)));
      if ((share.owedAmountMinor ?? minor(share.owedAmount)) >= 0) addPair(share.userId, payer.userId, owed, currency);
      else addPair(payer.userId, share.userId, owed, currency);
    }));
  }

  settlements.forEach((settlement) => {
    const settlementMinor = settlement.amountMinor ?? minor(settlement.amount);
    addNet(settlement.fromUserId, settlementMinor, settlement.currency || 'INR');
    addNet(settlement.toUserId, -settlementMinor, settlement.currency || 'INR');
    adjustPair(settlement.fromUserId, settlement.toUserId, -settlementMinor, settlement.currency || 'INR');
  });

  const pairwise = [];
  Object.entries(pairMap).forEach(([key, amount]) => {
    const [currency, fromUserId, toUserId] = key.split('|');
    const reverseKey = `${currency}|${toUserId}|${fromUserId}`;
    if (!pairMap[reverseKey]) {
      pairwise.push({ fromUserId, toUserId, amount: round(amount / 100), amountMinor: amount, currency });
      return;
    }
    const netAmount = round(amount - pairMap[reverseKey]);
    if (netAmount > 0) pairwise.push({ fromUserId, toUserId, amount: round(netAmount / 100), amountMinor: netAmount, currency });
  });
  const uniquePairwise = pairwise.filter((entry, index, all) => !all.some((other, otherIndex) => otherIndex < index && other.currency === entry.currency && other.fromUserId === entry.toUserId && other.toUserId === entry.fromUserId));
  const members = membersForGroup(groupId);
  const name = (id) => members.find((member) => member.id === id)?.name || id;
  const net = netByCurrency.INR || {};
  const netRupees = Object.fromEntries(Object.entries(net).map(([userId, amount]) => [userId, amount / 100]));
  return {
    currency: 'INR', currencies: Object.keys(netByCurrency), netByCurrency,
    net: members.map((member) => ({ userId: member.id, name: member.name, amount: round(netRupees[member.id] || 0), amountMinor: net[member.id] || 0, type: (net[member.id] || 0) >= 0 ? 'gets' : 'owes' })),
    pairwise: uniquePairwise.map((entry) => ({ ...entry, fromName: name(entry.fromUserId), toName: name(entry.toUserId) })),
    netMap: netRupees,
    netMaps: Object.fromEntries(Object.entries(netByCurrency).map(([currency, values]) => [currency, Object.fromEntries(Object.entries(values).map(([userId, amount]) => [userId, amount / 100]))])),
  };
}

module.exports = { calculate };
