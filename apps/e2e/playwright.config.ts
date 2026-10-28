import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

/**
 * E2E: Playwright menjalankan `apps/api` dalam mode "serve dist" (SERVE_WEB_DIST=true)
 * sehingga satu proses melayani frontend hasil build + API di satu origin, persis
 * seperti production, tetapi lewat http://localhost (NODE_ENV bukan production).
 *
 * Env dibaca dari process.env lalu apps/api/.env (tanpa menimpa) — sama seperti
 * `bun test` di apps/api — sehingga BETTER_AUTH_SECRET & database konsisten dengan
 * suite API (kunci JWKS di DB dienkripsi dengan secret itu).
 * Database: E2E_DATABASE_URL → TEST_DATABASE_URL → DATABASE_URL dengan akhiran `_test`.
 * Server menjalankan migrasi + seed demo (akun di packages/shared/src/demo.ts) saat start.
 *
 *   bunx nx e2e e2e          # build web (bila perlu) lalu jalankan
 *   bun run e2e:ui           # mode interaktif (cwd apps/e2e)
 */
const API_DIR = path.resolve(import.meta.dirname, '../api')

/** Parser .env minimal (KEY=VALUE, komentar #, kutip opsional); env yang sudah ada menang. */
function loadDotenv(file: string): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) }
  if (!fs.existsSync(file)) return env
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (env[key] === undefined && value !== '') env[key] = value
  }
  return env
}

const env = loadDotenv(path.join(API_DIR, '.env'))
const PORT = Number(env.E2E_PORT ?? 3199)
const baseURL = `http://localhost:${PORT}`
const isCI = Boolean(env.CI)

function deriveTestUrl(url: string | undefined): string {
  const parsed = new URL(url ?? 'postgresql://localhost:5432/hono_react_starter')
  const dbName = parsed.pathname.replace(/^\//, '') || 'hono_react_starter'
  parsed.pathname = `/${dbName.endsWith('_test') ? dbName : `${dbName}_test`}`
  return parsed.toString()
}

const databaseUrl = env.E2E_DATABASE_URL ?? env.TEST_DATABASE_URL ?? deriveTestUrl(env.DATABASE_URL)
// Default sama dengan apps/api/tests/setup.ts agar kunci JWKS di DB test bisa didekripsi.
const authSecret = env.BETTER_AUTH_SECRET ?? 'test-secret-test-secret-test-secret-123456'

export default defineConfig({
  testDir: './tests',
  // Akun demo dipakai bersama antar file → jalankan berurutan agar deterministik.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'id-ID',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run start:e2e',
    cwd: API_DIR,
    url: `${baseURL}/api/health/ready`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'development',
      PORT: String(PORT),
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: authSecret,
      BETTER_AUTH_URL: baseURL,
      TRUSTED_ORIGINS: baseURL,
      SERVE_WEB_DIST: 'true',
      API_DOCS_ENABLED: 'true',
      // Semua test datang dari satu IP: matikan limiter (aturan bawaan Better Auth
      // untuk sign-in adalah 3 request / 10 detik). Limiter diuji di apps/api/tests.
      API_RATE_LIMIT_MAX: '0',
      AUTH_RATE_LIMIT_MAX: '0',
      MAIL_PROVIDER: 'console',
      LOG_LEVEL: 'warn',
      LOG_FORMAT: 'pretty',
    },
  },
})
