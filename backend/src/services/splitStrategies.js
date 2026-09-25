class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

const cents = (value) => Math.round(Number(value) * 100);
const money = (valueInCents) => Number(valueInCents) / 100;

function fixRoundingRemainder(shares, totalAmount) {
  if (!shares.length) throw new ValidationError('At least one participant is required');
  const diff = cents(totalAmount) - shares.reduce((sum, share) => sum + cents(share.owedAmount), 0);
  if (diff) shares[0].owedAmount = money(cents(shares[0].owedAmount) + diff);
  return shares;
}

function numberInput(value, field, { min = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) throw new ValidationError(`${field} must be a valid number`);
  return number;
}

const strategies = {
  EQUAL(totalAmount, participants) {
    if (!participants.length) throw new ValidationError('At least one participant is required');
    const each = money(Math.floor(cents(totalAmount) / participants.length));
    return fixRoundingRemainder(participants.map((p) => ({ userId: p.userId, owedAmount: each })), totalAmount);
  },

  EXACT(totalAmount, participants) {
    const shares = participants.map((p) => ({ userId: p.userId, owedAmount: money(cents(numberInput(p.amount, 'amount'))) }));
    if (shares.reduce((sum, share) => sum + cents(share.owedAmount), 0) !== cents(totalAmount)) {
      throw new ValidationError(`Exact amounts must add up to the total (${money(cents(totalAmount))})`);
    }
    return shares;
  },

  PERCENT(totalAmount, participants) {
    const totalPercent = participants.reduce((sum, p) => sum + numberInput(p.percent, 'percent'), 0);
    if (Math.abs(totalPercent - 100) > 0.001) throw new ValidationError(`Percentages must sum to 100 (got ${money(cents(totalPercent))})`);
    return fixRoundingRemainder(participants.map((p) => ({
      userId: p.userId,
      owedAmount: money(cents(totalAmount * Number(p.percent) / 100)),
      percentValue: Number(p.percent),
    })), totalAmount);
  },

  SHARES(totalAmount, participants) {
    const totalShares = participants.reduce((sum, p) => sum + numberInput(p.shares, 'shares'), 0);
    if (totalShares <= 0) throw new ValidationError('Total shares must be greater than 0');
    return fixRoundingRemainder(participants.map((p) => ({
      userId: p.userId,
      owedAmount: money(cents(totalAmount * Number(p.shares) / totalShares)),
      shareValue: Number(p.shares),
    })), totalAmount);
  },

  ADJUSTMENT(totalAmount, participants) {
    const adjustments = participants.map((p) => numberInput(p.adjustment || 0, 'adjustment', { min: -Number(totalAmount) }));
    const remainder = cents(totalAmount) - adjustments.reduce((sum, value) => sum + cents(value), 0);
    if (remainder < 0) throw new ValidationError('Adjustments cannot exceed the total expense amount');
    const each = remainder / participants.length;
    return fixRoundingRemainder(participants.map((p, index) => ({
      userId: p.userId,
      owedAmount: money(Math.round(each) + cents(adjustments[index])),
      adjustmentValue: adjustments[index],
    })), totalAmount);
  },

  ITEMIZED(totalAmount, { items = [], tax = 0, tip = 0, discount = 0 }) {
    if (!items.length) throw new ValidationError('At least one item is required');
    const subtotal = items.reduce((sum, item) => sum + cents(numberInput(item.price, 'item price', { min: 0.01 })), 0);
    const additions = cents(numberInput(tax, 'tax')) + cents(numberInput(tip, 'tip')) - cents(numberInput(discount, 'discount'));
    if (subtotal + additions <= 0) throw new ValidationError('Itemized total must be greater than zero');
    const factor = cents(totalAmount) / (subtotal + additions);
    const totals = {};
    for (const item of items) {
      const itemParticipants = item.participants || [];
      const lineShares = strategies.SHARES(money(cents(item.price)), itemParticipants.map((p) => ({ userId: p.userId, shares: p.shares ?? 1 })));
      lineShares.forEach((share) => { totals[share.userId] = (totals[share.userId] || 0) + Math.round(cents(share.owedAmount) * factor); });
    }
    return fixRoundingRemainder(Object.entries(totals).map(([userId, owedAmount]) => ({ userId, owedAmount: money(owedAmount) })), totalAmount);
  },
};

function computeSplit(splitType, totalAmount, input) {
  const total = numberInput(totalAmount, 'totalAmount', { min: 0.01 });
  const strategy = strategies[splitType];
  if (!strategy) throw new ValidationError(`Unknown split type: ${splitType}`);
  return strategy(total, input);
}

function applyReimbursement(shares, payerId) {
  const total = shares.reduce((sum, share) => sum + cents(share.owedAmount), 0);
  const others = shares.reduce((sum, share) => sum + (share.userId === payerId ? 0 : cents(share.owedAmount)), 0);
  const reversed = shares.map((share) => ({ ...share, owedAmount: share.userId === payerId ? money(total + others) : -share.owedAmount }));
  if (!reversed.some((share) => share.userId === payerId)) reversed.push({ userId: payerId, owedAmount: money(total + others) });
  return reversed;
}

module.exports = { computeSplit, applyReimbursement, fixRoundingRemainder, ValidationError };
