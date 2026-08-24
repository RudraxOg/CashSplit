require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  CORS_ORIGIN: z.string().default(''),
  AUTH_REQUIRED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SUPABASE_URL: z.preprocess((value) => value || undefined, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  SUPABASE_ENABLED: Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_SERVICE_ROLE_KEY),
};
