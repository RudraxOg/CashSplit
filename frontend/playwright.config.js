import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5199', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node e2e/server.cjs', url: 'http://127.0.0.1:4399/api/health', reuseExistingServer: false },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort', url: 'http://127.0.0.1:5199', reuseExistingServer: false,
      env: { ROOMMATE_API_TARGET: 'http://127.0.0.1:4399', VITE_API_URL: '/api', VITE_SUPABASE_URL: 'https://roommate-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-anon-key' } },
  ],
});
