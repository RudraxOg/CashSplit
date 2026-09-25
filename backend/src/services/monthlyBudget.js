const DEFAULT_MONTHLY_BUDGET = 30000;

function validateMonthlyBudget(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1_000_000_000 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) {
    const error = new Error('monthlyBudget must be between 0.01 and 1,000,000,000 with at most two decimal places');
    error.statusCode = 400;
    throw error;
  }
  return amount;
}

module.exports = { DEFAULT_MONTHLY_BUDGET, validateMonthlyBudget };
