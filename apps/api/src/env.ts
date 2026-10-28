import { LOG_LEVELS, type LogFormat, type LogLevel } from './lib/logger.ts'

/**
 * Validasi environment variables — fail-fast di startup.
 * Mencegah misconfigurasi diam-diam di production.
 * Semua pembacaan dilakukan saat fungsi dipanggil (bukan saat import)
 * agar mudah diuji dan mengikuti env terkini.
 */

function fail(name: string, hint: string): never {
  throw new Error(`[env] ${name} ${hint} — lihat .env.example`)
}

export function envIsProd(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function envIsTest(): boolean {
  return process.env.NODE_ENV === 'test'
}

export function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url
  if (envIsProd()) {
    fail('DATABASE_URL', 'wajib diisi di production')
  }
  // Convenience untuk development lokal
  return 'postgresql://localhost:5432/hono_react_starter'
}

export function readAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    fail('BETTER_AUTH_SECRET', 'wajib diisi (buat: openssl rand -base64 32)')
  }
  if (secret.length < 32) {
    fail('BETTER_AUTH_SECRET', `terlalu pendek (${secret.length} < 32 karakter)`)
  }
  return secret
}

/**
 * Origin publik aplikasi (mis. https://app.example.com).
 * Dipakai Better Auth sebagai baseURL + trusted origin (CSRF) dan untuk
 * menentukan cookie `Secure`. Wajib di production; default localhost di dev.
 */
export function readBaseUrl(): string {
  const raw = process.env.BETTER_AUTH_URL
  if (!raw) {
    if (envIsProd()) fail('BETTER_AUTH_URL', 'wajib diisi di production (origin aplikasi)')
    return `http://localhost:${readPort()}`
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    fail('BETTER_AUTH_URL', `bukan URL valid: "${raw}"`)
  }
  if (envIsProd() && parsed.protocol !== 'https:') {
    fail('BETTER_AUTH_URL', 'harus https:// di production (cookie Secure)')
  }
  return parsed.origin
}

/**
 * Origin tambahan yang dipercaya Better Auth (pemeriksaan CSRF/Origin) selain
 * BETTER_AUTH_URL. TRUSTED_ORIGINS: daftar origin dipisah koma. Default di luar
 * production: http://localhost:5173 — Vite dev server apps/web yang memproxy
 * /api ke sini (ubah bila port Vite diganti). Di production default kosong.
 */
export function readTrustedOrigins(): string[] {
  const raw = process.env.TRUSTED_ORIGINS
  if (raw === undefined) return envIsProd() ? [] : ['http://localhost:5173']
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return new URL(s).origin
      } catch {
        fail('TRUSTED_ORIGINS', `berisi URL tidak valid: "${s}"`)
      }
    })
}

export function readPort(): number {
  const raw = process.env.PORT
  if (!raw) return 3000
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail('PORT', `bukan port valid: "${raw}"`)
  }
  return port
}

export type ApiRateLimitConfig = { max: number; windowSeconds: number }

/**
 * Rate limit API umum (/api/*, di luar /api/auth yang punya limiter sendiri).
 * - API_RATE_LIMIT_MAX: request per jendela per IP (default 100; `0` = nonaktif)
 * - API_RATE_LIMIT_WINDOW: panjang jendela, detik (default 60)
 * Saat NODE_ENV=test nonaktif kecuali API_RATE_LIMIT_MAX diisi eksplisit.
 */
export function readApiRateLimit(): ApiRateLimitConfig | false {
  const rawMax = process.env.API_RATE_LIMIT_MAX
  const rawWindow = process.env.API_RATE_LIMIT_WINDOW
  if (rawMax === undefined && envIsTest()) return false

  const max = rawMax === undefined ? 100 : Number(rawMax)
  if (!Number.isInteger(max) || max < 0) {
    fail('API_RATE_LIMIT_MAX', `harus bilangan bulat ≥ 0: "${rawMax}"`)
  }
  if (max === 0) return false

  const windowSeconds = rawWindow === undefined ? 60 : Number(rawWindow)
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    fail('API_RATE_LIMIT_WINDOW', `harus bilangan bulat ≥ 1 detik: "${rawWindow}"`)
  }
  return { max, windowSeconds }
}

export type AuthRateLimitConfig = { max: number; windowSeconds: number }

/**
 * Rate limit bawaan Better Auth untuk /api/auth/* (proteksi brute-force,
 * per IP per endpoint, store tabel rate_limit).
 * - AUTH_RATE_LIMIT_MAX: request per jendela (default 20; `0` = nonaktif)
 * - AUTH_RATE_LIMIT_WINDOW: panjang jendela, detik (default 60)
 * Saat NODE_ENV=test nonaktif kecuali AUTH_RATE_LIMIT_MAX diisi eksplisit.
 * `/get-session` selalu dikecualikan (lihat auth.ts) karena dipanggil SPA
 * berulang dan tidak bisa dipakai menebak kredensial.
 */
export function readAuthRateLimit(): AuthRateLimitConfig | false {
  const rawMax = process.env.AUTH_RATE_LIMIT_MAX
  const rawWindow = process.env.AUTH_RATE_LIMIT_WINDOW
  if (rawMax === undefined && envIsTest()) return false

  const max = rawMax === undefined ? 20 : Number(rawMax)
  if (!Number.isInteger(max) || max < 0) {
    fail('AUTH_RATE_LIMIT_MAX', `harus bilangan bulat ≥ 0: "${rawMax}"`)
  }
  if (max === 0) return false

  const windowSeconds = rawWindow === undefined ? 60 : Number(rawWindow)
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    fail('AUTH_RATE_LIMIT_WINDOW', `harus bilangan bulat ≥ 1 detik: "${rawWindow}"`)
  }
  return { max, windowSeconds }
}

export type LogConfig = { level: LogLevel; format: LogFormat }

/**
 * Konfigurasi logging.
 * - LOG_LEVEL: debug | info | warn | error | silent
 *   (default: production → info, test → silent, lainnya → debug)
 * - LOG_FORMAT: json | pretty (default: production → json, lainnya → pretty)
 */
export function readLogConfig(): LogConfig {
  const rawLevel = process.env.LOG_LEVEL
  const rawFormat = process.env.LOG_FORMAT

  let level: LogLevel
  if (rawLevel === undefined) level = envIsProd() ? 'info' : envIsTest() ? 'silent' : 'debug'
  else if ((LOG_LEVELS as readonly string[]).includes(rawLevel)) level = rawLevel as LogLevel
  else fail('LOG_LEVEL', `harus salah satu dari ${LOG_LEVELS.join('|')}: "${rawLevel}"`)

  let format: LogFormat
  if (rawFormat === undefined) format = envIsProd() ? 'json' : 'pretty'
  else if (rawFormat === 'json' || rawFormat === 'pretty') format = rawFormat
  else fail('LOG_FORMAT', `harus json|pretty: "${rawFormat}"`)

  return { level, format }
}

export type MailConfig =
  | { provider: 'console' }
  | { provider: 'memory' }
  | { provider: 'resend'; apiKey: string; from: string }

/**
 * Pengiriman email (verifikasi email, reset password).
 * - MAIL_PROVIDER: console | resend | memory
 *   (default: test → memory, lainnya → console = hanya dicatat di log)
 * - MAIL_FROM: alamat pengirim, mis. "Nama <no-reply@example.com>" (wajib untuk resend)
 * - RESEND_API_KEY: kunci API Resend (wajib untuk resend)
 */
export function readMailConfig(): MailConfig {
  const raw = process.env.MAIL_PROVIDER
  const provider = raw ?? (envIsTest() ? 'memory' : 'console')
  if (provider === 'console' || provider === 'memory') return { provider }
  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.MAIL_FROM
    if (!apiKey) fail('RESEND_API_KEY', 'wajib diisi bila MAIL_PROVIDER=resend')
    if (!from) fail('MAIL_FROM', 'wajib diisi bila MAIL_PROVIDER=resend')
    return { provider, apiKey, from }
  }
  fail('MAIL_PROVIDER', `harus console|resend|memory: "${raw}"`)
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  fail(name, `harus true|false: "${raw}"`)
}

/**
 * AUTH_REQUIRE_EMAIL_VERIFICATION (default false): bila true, sign-in dengan
 * email yang belum diverifikasi ditolak (403 EMAIL_NOT_VERIFIED) dan email
 * verifikasi dikirim ulang. Di production wajib ada provider email sungguhan
 * (bukan console) agar pengguna benar-benar bisa memverifikasi.
 */
export function readEmailVerificationRequired(): boolean {
  const required = readBool('AUTH_REQUIRE_EMAIL_VERIFICATION', false)
  if (required && envIsProd() && readMailConfig().provider !== 'resend') {
    fail('AUTH_REQUIRE_EMAIL_VERIFICATION', 'butuh MAIL_PROVIDER=resend di production (email harus benar-benar terkirim)')
  }
  return required
}

/**
 * SERVE_WEB_DIST (default: true di production, false lainnya): sajikan hasil
 * build apps/web (dist) dari server API. Di luar production dipakai E2E dan
 * staging lokal agar satu proses melayani frontend + API tanpa Vite.
 */
export function readServeWebDist(): boolean {
  return readBool('SERVE_WEB_DIST', envIsProd())
}

/**
 * API_DOCS_ENABLED (default: false di production, true lainnya): aktifkan
 * `GET /api/openapi.json` dan halaman `GET /api/docs`. Di production
 * nyalakan secara sadar (mis. staging untuk tester).
 */
export function readApiDocsEnabled(): boolean {
  return readBool('API_DOCS_ENABLED', !envIsProd())
}

/**
 * ALLOW_DEMO_SEED (default false): izinkan `bun run db:seed:demo` di production.
 * Seed demo membuat akun dengan password publik, jadi hanya untuk staging/E2E.
 */
export function readDemoSeedAllowed(): boolean {
  return !envIsProd() || readBool('ALLOW_DEMO_SEED', false)
}

export type CacheConfig = { provider: 'memory' } | { provider: 'redis'; url: string }

/**
 * Cache aplikasi (lihat lib/cache.ts).
 * - CACHE_PROVIDER: memory | redis (default memory — cukup untuk satu instance)
 * - REDIS_URL: wajib bila redis, mis. redis://localhost:6379
 * Multi-instance di production sebaiknya redis agar cache (mis. hasil verifikasi JWT)
 * dibagi; memory tetap benar secara fungsi, hanya kurang efektif.
 */
export function readCacheConfig(): CacheConfig {
  const provider = process.env.CACHE_PROVIDER ?? 'memory'
  if (provider === 'memory') return { provider }
  if (provider === 'redis') {
    const url = process.env.REDIS_URL
    if (!url) fail('REDIS_URL', 'wajib diisi bila CACHE_PROVIDER=redis')
    return { provider, url }
  }
  fail('CACHE_PROVIDER', `harus memory|redis: "${provider}"`)
}

/**
 * AUTH_SESSION_CACHE_SECONDS (default 60; 0 = nonaktif): Better Auth menyimpan
 * salinan sesi+user di cookie bertanda tangan selama N detik, sehingga
 * `getSession` tidak mengakses database pada setiap request. Konsekuensi:
 * perubahan role/ban/pencabutan sesi baru terasa paling lama N detik kemudian —
 * jaga tetap pendek.
 */
export function readSessionCacheSeconds(): number {
  const raw = process.env.AUTH_SESSION_CACHE_SECONDS
  if (raw === undefined) return 60
  const seconds = Number(raw)
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) {
    fail('AUTH_SESSION_CACHE_SECONDS', `harus bilangan bulat 0–3600: "${raw}"`)
  }
  return seconds
}
