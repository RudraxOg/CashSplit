/**
 * In-memory data store.
 *
 * This is the single "database" layer for the app. It is intentionally a
 * plain module holding arrays in memory, seeded with the same demo data the
 * original component used — so the API behaves identically to the old
 * frontend-only version out of the box.
 *
 * Swapping this for a real database later means: replace the arrays below
 * with queries (Postgres/Prisma, Mongo, SQLite, etc.) and keep every route
 * file's public function signatures the same. Nothing above this layer
 * needs to change.
 */

const MEMBERS = [
  { id: 'krishna', name: 'Krishna', you: true, color: '#16A67A', initials: 'K' },
  { id: 'aman', name: 'Aman', you: false, color: '#4D8DDB', initials: 'A' },
  { id: 'neha', name: 'Neha', you: false, color: '#8B7CF6', initials: 'N' },
  { id: 'rohit', name: 'Rohit', you: false, color: '#F3A34D', initials: 'R' },
];

const GROUPS = [
  {
    id: 'g1',
    name: 'My Household',
    simplifyDebts: true,
    memberIds: MEMBERS.map((member) => member.id),
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

let expenses = [
  { id: 1, category: 'Rent', amount: 7500, paidBy: 'Krishna', date: 'Aug 1', note: 'Monthly rent' },
  { id: 2, category: 'Groceries', amount: 1250, paidBy: 'Aman', date: 'Aug 16', note: 'Weekly groceries' },
  { id: 3, category: 'Groceries', amount: 1990, paidBy: 'Krishna', date: 'Aug 8', note: 'Supermarket run' },
  { id: 4, category: 'Food & Dining', amount: 2850, paidBy: 'Neha', date: 'Aug 12', note: 'Dinner out' },
  { id: 5, category: 'Utilities', amount: 2160, paidBy: 'Rohit', date: 'Aug 3', note: 'Electricity + Wifi' },
  { id: 6, category: 'Transport', amount: 1350, paidBy: 'Aman', date: 'Aug 10', note: 'Cabs & fuel' },
  { id: 7, category: 'Others', amount: 1660, paidBy: 'Krishna', date: 'Aug 14', note: 'Miscellaneous' },
];

let incomes = [
  { id: 1, source: 'Salary', amount: 12000, addedBy: 'Krishna', date: 'Aug 1' },
  { id: 2, source: 'Salary', amount: 7500, addedBy: 'Aman', date: 'Aug 1' },
  { id: 3, source: 'Freelance Work', amount: 5000, addedBy: 'Krishna', date: 'Aug 17' },
];

let chores = [
  { id: 1, name: 'Cooking', assignedTo: 'Aman', status: 'completed', when: 'Today' },
  { id: 2, name: 'Dishes', assignedTo: 'Krishna', status: 'pending', when: 'Today' },
  { id: 3, name: 'Cleaning', assignedTo: 'Neha', status: 'pending', when: 'Today' },
  { id: 4, name: 'Garbage', assignedTo: 'Rohit', status: 'upcoming', when: 'Today' },
  { id: 5, name: 'Grocery Run', assignedTo: 'Krishna', status: 'upcoming', when: 'Friday' },
];

let shopping = [
  { id: 1, name: 'Milk', priority: 'High', purchased: false },
  { id: 2, name: 'Rice', priority: 'High', purchased: false },
  { id: 3, name: 'Cooking Oil', priority: 'Medium', purchased: true },
  { id: 4, name: 'Eggs', priority: 'Medium', purchased: false },
  { id: 5, name: 'Detergent', priority: 'Low', purchased: false },
];

let activity = [
  { id: 1, kind: 'expense', text: 'Aman added an expense', detail: 'Groceries · ₹1,250', time: '2h ago' },
  { id: 2, kind: 'chore', text: 'Neha completed a chore', detail: 'Cleaning', time: '5h ago' },
  { id: 3, kind: 'income', text: 'You added income', detail: 'Freelance Work · ₹5,000', time: '1d ago' },
  { id: 4, kind: 'settle', text: 'Rohit settled up with Aman', detail: 'Paid · ₹890', time: '2d ago' },
];

let balances = [
  { member: 'Krishna', label: 'You', amount: 1250, type: 'gets', settled: false },
  { member: 'Aman', amount: 980, type: 'owes', settled: false },
  { member: 'Neha', amount: 620, type: 'owes', settled: false },
  { member: 'Rohit', amount: 890, type: 'gets', settled: false },
];

let expensePayers = [];
let expenseShares = [];
let expenseItems = [];
let settlements = [];
let expenseHistory = [];
let expenseComments = [];

const MONTHLY = [
  { month: 'Mar', income: 21000, expenses: 16200 },
  { month: 'Apr', income: 22500, expenses: 17800 },
  { month: 'May', income: 23000, expenses: 16900 },
  { month: 'Jun', income: 23800, expenses: 19500 },
  { month: 'Jul', income: 24100, expenses: 18100 },
  { month: 'Aug', income: 24500, expenses: 18760 },
];

const BUDGET = 30000;

let nextId = 1000; // seed ids are small numbers; new records start well above them
function genId() {
  nextId += 1;
  return nextId;
}

function getGroup(groupId = 'g1') {
  return GROUPS.find((group) => group.id === groupId) || null;
}

function getExpenseById(id) {
  return expenses.find((expense) => expense.id === Number(id)) || null;
}

// Backfill the original demo expenses into the normalized ledger collections.
expenses.forEach((expense) => {
  expense.groupId = 'g1';
  expense.description = expense.note;
  expense.totalAmount = expense.amount;
  expense.currency = 'INR';
  expense.splitType = 'EQUAL';
  expense.createdBy = MEMBERS.find((member) => member.name === expense.paidBy)?.id || 'krishna';
  expensePayers.push({ id: genId(), expenseId: expense.id, userId: expense.createdBy, paidAmount: expense.amount });
  const each = Math.round((expense.amount / MEMBERS.length) * 100) / 100;
  MEMBERS.forEach((member, index) => expenseShares.push({
    id: genId(), expenseId: expense.id, userId: member.id,
    owedAmount: index === 0 ? Math.round((expense.amount - each * (MEMBERS.length - 1)) * 100) / 100 : each,
  }));
});

module.exports = {
  MEMBERS,
  GROUPS,
  MONTHLY,
  BUDGET,
  genId,
  // expenses
  getExpenses: () => expenses,
  addExpense: (e) => { expenses = [e, ...expenses]; return e; },
  getExpenseById,
  getGroup,
  getExpensePayers: (expenseId) => expensePayers.filter((payer) => payer.expenseId === Number(expenseId)),
  getExpenseShares: (expenseId) => expenseShares.filter((share) => share.expenseId === Number(expenseId)),
  getExpenseItems: (expenseId) => expenseItems.filter((item) => item.expenseId === Number(expenseId)),
  replaceExpenseLedger: (expenseId, payers, shares, items = []) => {
    expensePayers = expensePayers.filter((payer) => payer.expenseId !== Number(expenseId));
    expenseShares = expenseShares.filter((share) => share.expenseId !== Number(expenseId));
    expenseItems = expenseItems.filter((item) => item.expenseId !== Number(expenseId));
    expensePayers.push(...payers.map((payer) => ({ ...payer, id: genId(), expenseId: Number(expenseId) })));
    expenseShares.push(...shares.map((share) => ({ ...share, id: genId(), expenseId: Number(expenseId) })));
    expenseItems.push(...items.map((item) => ({ ...item, id: genId(), expenseId: Number(expenseId) })));
  },
  addExpenseRecord: (expense, payers, shares, items = []) => {
    expenses = [expense, ...expenses];
    expensePayers.push(...payers.map((payer) => ({ ...payer, id: genId(), expenseId: expense.id })));
    expenseShares.push(...shares.map((share) => ({ ...share, id: genId(), expenseId: expense.id })));
    expenseItems.push(...items.map((item) => ({ ...item, id: genId(), expenseId: expense.id })));
    return expense;
  },
  updateExpense: (id, patch) => {
    let updated = null;
    expenses = expenses.map((expense) => {
      if (expense.id !== Number(id)) return expense;
      updated = { ...expense, ...patch };
      return updated;
    });
    return updated;
  },
  addExpenseHistory: (entry) => { expenseHistory = [entry, ...expenseHistory]; return entry; },
  getExpenseHistory: (expenseId) => expenseHistory.filter((entry) => entry.expenseId === Number(expenseId)),
  addComment: (comment) => { expenseComments = [comment, ...expenseComments]; return comment; },
  getComments: (expenseId) => expenseComments.filter((comment) => comment.expenseId === Number(expenseId)),
  // incomes
  getIncomes: () => incomes,
  addIncome: (i) => { incomes = [i, ...incomes]; return i; },
  // chores
  getChores: () => chores,
  addChore: (c) => { chores = [c, ...chores]; return c; },
  updateChore: (id, patch) => {
    let updated = null;
    chores = chores.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...patch };
      return updated;
    });
    return updated;
  },
  deleteChore: (id) => { chores = chores.filter((c) => c.id !== id); },
  // shopping
  getShopping: () => shopping,
  addShoppingItem: (item) => { shopping = [...shopping, item]; return item; },
  updateShoppingItem: (id, patch) => {
    let updated = null;
    shopping = shopping.map((i) => {
      if (i.id !== id) return i;
      updated = { ...i, ...patch };
      return updated;
    });
    return updated;
  },
  deleteShoppingItem: (id) => { shopping = shopping.filter((i) => i.id !== id); },
  // activity
  getActivity: () => activity,
  addActivity: (a) => { activity = [a, ...activity]; return a; },
  // balances
  getBalances: () => balances,
  settleBalances: () => { balances = balances.map((b) => ({ ...b, settled: true })); return balances; },
  getSettlements: () => settlements,
  addSettlement: (settlement) => { settlements = [settlement, ...settlements]; return settlement; },
};
