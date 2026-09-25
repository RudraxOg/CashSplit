const { z } = require('zod');
const { parseBody } = require('../utils/validation');
const { computeSplit, ValidationError } = require('./splitStrategies');
const schema = z.object({
  splitType: z.enum(['EQUAL', 'PERCENT', 'SHARES']),
  participants: z.array(z.object({ userId: z.string().min(1), percent: z.coerce.number().nonnegative().optional(), shares: z.coerce.number().positive().optional() })).min(1).max(100),
});
function validateDefaultSplit(value, members) {
  if (value === null) return null;
  const split = parseBody(value, schema);
  const ids = split.participants.map((p) => p.userId);
  if (new Set(ids).size !== ids.length || ids.some((id) => !members.some((m) => m.id === id))) throw new ValidationError('Default split must contain unique household members');
  computeSplit(split.splitType, 100, split.participants);
  return split;
}
module.exports = { validateDefaultSplit };
