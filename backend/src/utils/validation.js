function text(value, field, { max = 120 } = {}) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { error: `${field} is required` };
  }
  const valueTrimmed = value.trim();
  if (valueTrimmed.length > max) {
    return { error: `${field} must be ${max} characters or fewer` };
  }
  return { value: valueTrimmed };
}

function positiveAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount must be a positive number' };
  }
  return { value: amount };
}

function toMinor(value, minorUnits = 2) {
  const factor = 10 ** minorUnits;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('amount must be numeric');
  return Math.round(amount * factor);
}

function integerId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function memberName(value, members) {
  const result = text(value, 'member');
  if (result.error) return result;
  if (!members.some((member) => member.name === result.value)) {
    return { error: 'member must be a household member' };
  }
  return result;
}

const { z } = require('zod');

const expenseParticipantSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().finite().nonnegative().optional(),
  percent: z.coerce.number().finite().nonnegative().optional(),
  shares: z.coerce.number().finite().nonnegative().optional(),
  adjustment: z.coerce.number().finite().optional(),
}).passthrough();
const expenseSchema = z.object({
  groupId: z.string().min(1).optional(),
  description: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().min(1).max(160).optional(),
  totalAmount: z.coerce.number().finite().optional(),
  amount: z.coerce.number().finite().optional(),
  currency: z.enum(require('../services/currencies').CURRENCIES).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().trim().min(1).max(80).optional(),
  splitType: z.enum(['EQUAL', 'SHARES', 'PERCENT', 'EXACT', 'ADJUSTMENT', 'ITEMIZED']).optional(),
  participants: z.array(expenseParticipantSchema).min(1).optional(),
  payers: z.array(z.object({ userId: z.string().min(1), paidAmount: z.coerce.number().finite().nonnegative() }).passthrough()).min(1).optional(),
  items: z.array(z.object({ name: z.string().trim().min(1).max(160), price: z.coerce.number().finite().positive(), participants: z.array(z.object({ userId: z.string().min(1), shares: z.coerce.number().finite().positive().optional() }).passthrough()).min(1) }).passthrough()).optional(),
  tax: z.coerce.number().finite().nonnegative().optional(),
  tip: z.coerce.number().finite().nonnegative().optional(),
  discount: z.coerce.number().finite().nonnegative().optional(),
  reimbursement: z.boolean().optional(),
  reimbursementPayerId: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).passthrough();
const choreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  assignedTo: z.string().trim().min(1).max(80),
  dueDate: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(720).nullable().optional(),
  recurrenceRule: z.string().max(200).nullable().optional(),
  when: z.string().optional(),
  status: z.string().optional(),
}).passthrough().superRefine((data, context) => {
  const hasStart = data.startTime != null;
  const hasDuration = data.durationMinutes != null;
  if (hasStart !== hasDuration) context.addIssue({ code: 'custom', path: ['startTime'], message: 'start time and duration must be set together' });
  if (hasStart && hasDuration) {
    const [hours, minutes] = data.startTime.split(':').map(Number);
    if (hours * 60 + minutes + data.durationMinutes > 1440) context.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'chore must end by midnight' });
  }
});
const settlementSchema = z.object({
  currency: z.enum(require('../services/currencies').CURRENCIES).default('INR'),
  groupId: z.string().min(1).optional(),
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.coerce.number().finite().positive(),
  method: z.string().max(30).optional(),
  note: z.string().max(200).optional(),
});

function parseBody(body, schema) {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  const error = new Error(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'body'} ${issue.message}`).join('; '));
  error.statusCode = 400;
  throw error;
}

module.exports = { text, positiveAmount, toMinor, integerId, memberName, parseBody, expenseSchema, choreSchema, settlementSchema };
