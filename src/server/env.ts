/**
 * Validasi environment variables — fail-fast di startup.
 * Mencegah misconfigurasi diam-diam di production.
 */

const nodeEnv = process.env.NODE_ENV ?? 'development'
const isProd = nodeEnv === 'production'
const isTest = nodeEnv === 'test'

function fail(name: string, hint: string): never {
  throw new Error(`[env] ${name} ${hint} — lihat .env.example`)
}

export function envIsProd(): boolean {
  return isProd
}

export function envIsTest(): boolean {
  return isTest
}

export function readDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) return url
  if (isProd) {
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
    if (isProd) fail('BETTER_AUTH_URL', 'wajib diisi di production (origin aplikasi)')
    return `http://localhost:${readPort()}`
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    fail('BETTER_AUTH_URL', `bukan URL valid: "${raw}"`)
  }
  if (isProd && parsed.protocol !== 'https:') {
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
