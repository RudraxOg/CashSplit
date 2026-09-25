// The project file is the source of truth for local development. Without
// override, an old shell-level Supabase key can silently keep the API pointed
// at stale credentials after .env has been updated. Preserve an explicitly
// supplied NODE_ENV so test commands still select the memory adapter.
const runtimeNodeEnv = process.env.NODE_ENV;
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env'), override: true });
if (runtimeNodeEnv) process.env.NODE_ENV = runtimeNodeEnv;
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4317),
  HOST: z.string().default('127.0.0.1'),
  CORS_ORIGIN: z.string().default(''),
  PUBLIC_APP_URL: z.preprocess((value) => value || undefined, z.string().url().optional()),
  AUTH_REQUIRED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SUPABASE_URL: z.preprocess((value) => value || undefined, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  SUPABASE_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  // Integration tests use the deterministic memory adapter and do not send
  // Supabase bearer tokens. Never let a developer's production auth setting
  // prevent the test app from exercising its route behavior.
  // Supabase is a multi-tenant production data source. Never allow its
  // service-role backed API to fall back to a demo identity.
  AUTH_REQUIRED: parsed.data.NODE_ENV !== 'test' && (
    parsed.data.NODE_ENV === 'production' || parsed.data.SUPABASE_ENABLED || parsed.data.AUTH_REQUIRED
  ),
  // Integration tests use the deterministic memory adapter unless a test
  // database is explicitly requested. Production still defaults to Supabase
  // whenever both credentials are present.
  SUPABASE_ENABLED: parsed.data.NODE_ENV !== 'test' && parsed.data.SUPABASE_ENABLED && Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_SERVICE_ROLE_KEY),
};
