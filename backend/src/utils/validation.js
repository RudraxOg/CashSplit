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

const expenseSchema = z.object({}).passthrough();
const choreSchema = z.object({
  name: z.string().trim().min(1).max(120),
  assignedTo: z.string().trim().min(1).max(80),
  dueDate: z.string().optional(),
  recurrenceRule: z.string().max(200).nullable().optional(),
  when: z.string().optional(),
  status: z.string().optional(),
}).passthrough();
const settlementSchema = z.object({
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
