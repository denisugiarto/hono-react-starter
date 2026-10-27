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
