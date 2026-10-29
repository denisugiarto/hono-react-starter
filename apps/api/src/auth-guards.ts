import type { Context } from 'hono'
import { sql } from 'drizzle-orm'
import { db as defaultDb } from './db/index.ts'
import { errorBody } from './lib/response.ts'
import { readLockoutConfig, type LockoutConfig } from './env.ts'
import type { AuthHandler } from './auth-audit.ts'
import type { AppEnv } from './types.ts'

/**
 * Pengaman tambahan di depan endpoint Better Auth (dipasang di app.ts):
 *
 * 1. `withSignInLockout` — lockout PER AKUN: setelah N kegagalan berturut-turut
 *    (password salah) email dikunci M menit → 423 ACCOUNT_LOCKED + Retry-After,
 *    tanpa menyentuh Better Auth. Melengkapi rate limit per IP yang bisa dihindari
 *    dengan banyak IP. Berhasil masuk (termasuk lanjut 2FA) mereset hitungan.
 *    Trade-off: penyerang bisa mengunci akun korban sementara (bukan permanen).
 *
 * 2. `maskSignUpConflict` — daftar dengan email yang sudah ada dibalas seperti daftar
 *    yang menunggu verifikasi (200, `token: null`) alih-alih 422 USER_ALREADY_EXISTS,
 *    sehingga keberadaan akun tidak bisa dienumerasi. Audit tetap mencatat kegagalan
 *    aslinya karena pembungkus ini dipasang DI LUAR withAuthAudit.
 */

const SIGN_IN_PATH = '/api/auth/sign-in/email'
const SIGN_UP_PATH = '/api/auth/sign-up/email'

type Db = typeof defaultDb

export type LockoutDeps = {
  config?: LockoutConfig | false
  db?: Db
  now?: () => Date
}

const normalizeEmail = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null

async function emailFromRequest(req: Request): Promise<string | null> {
  if (!req.headers.get('content-type')?.includes('application/json')) return null
  try {
    const body: unknown = await req.clone().json()
    return body && typeof body === 'object' ? normalizeEmail((body as Record<string, unknown>).email) : null
  } catch {
    return null
  }
}

/** Baca status kunci; `null` bila tidak ada baris. */
export async function readLockout(db: Db, email: string): Promise<{ failedCount: number; lockedUntil: Date | null } | null> {
  const rows = await db.execute(sql`select failed_count, locked_until from sign_in_lockout where email = ${email}`)
  const row = rows[0] as { failed_count: number; locked_until: Date | string | null } | undefined
  if (!row) return null
  return { failedCount: Number(row.failed_count), lockedUntil: row.locked_until ? new Date(row.locked_until) : null }
}

/** Catat satu kegagalan; kunci bila mencapai batas. Mengembalikan hitungan setelah ditambah. */
export async function recordFailure(db: Db, email: string, config: LockoutConfig): Promise<{ failedCount: number; locked: boolean }> {
  const rows = await db.execute(sql`
    insert into sign_in_lockout (email, failed_count, locked_until, updated_at)
    values (${email}, 1, null, now())
    on conflict (email) do update set
      failed_count = sign_in_lockout.failed_count + 1,
      updated_at = now()
    returning failed_count
  `)
  const failedCount = Number((rows[0] as { failed_count: number }).failed_count)
  if (failedCount < config.maxAttempts) return { failedCount, locked: false }
  await db.execute(sql`
    update sign_in_lockout
    set locked_until = now() + ${config.lockMinutes}::int * interval '1 minute', failed_count = 0, updated_at = now()
    where email = ${email}
  `)
  return { failedCount, locked: true }
}

export const clearLockout = (db: Db, email: string) => db.execute(sql`delete from sign_in_lockout where email = ${email}`)

/** Hapus baris yang tidak tersentuh > 1 hari (hitungan basi, kunci sudah lama lewat). */
export const cleanupLockouts = (db: Db) =>
  db.execute(sql`delete from sign_in_lockout where updated_at < now() - interval '1 day' and (locked_until is null or locked_until < now())`)

export function withSignInLockout(handler: AuthHandler, deps: LockoutDeps = {}): AuthHandler {
  const config = deps.config ?? readLockoutConfig()
  if (!config) return handler
  const db = deps.db ?? defaultDb
  const now = deps.now ?? (() => new Date())

  return async (req, c) => {
    if (req.method !== 'POST' || new URL(req.url).pathname !== SIGN_IN_PATH) return handler(req, c)
    const email = await emailFromRequest(req)
    if (!email) return handler(req, c)

    const state = await readLockout(db, email)
    if (state?.lockedUntil && state.lockedUntil > now()) {
      const retryAfter = Math.max(1, Math.ceil((state.lockedUntil.getTime() - now().getTime()) / 1000))
      const minutes = Math.ceil(retryAfter / 60)
      return c.json(
        errorBody('ACCOUNT_LOCKED', `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit`, { retryAfter }),
        423,
        { 'Retry-After': String(retryAfter) },
      )
    }

    const res = await handler(req, c)
    if (res.ok) {
      if (state) await clearLockout(db, email)
    } else if (res.status === 401) {
      // 401 = kredensial salah. 403 (banned, belum verifikasi) dan 400 (validasi) tidak dihitung.
      await recordFailure(db, email, config)
      // Bersihkan baris basi sesekali (≈1 % kegagalan); kegagalan bersih-bersih tidak boleh mengganggu respons.
      if (Math.random() < 0.01) {
        try {
          await cleanupLockouts(db)
        } catch {
          // abaikan
        }
      }
    }
    return res
  }
}

type HonoHandler = (c: Context<AppEnv>) => Promise<Response>

export function maskSignUpConflict(handler: HonoHandler): HonoHandler {
  return async (c) => {
    const res = await handler(c)
    if (c.req.method !== 'POST' || c.req.path !== SIGN_UP_PATH || res.status !== 422) return res
    let code: unknown
    try {
      code = ((await res.clone().json()) as { code?: unknown }).code
    } catch {
      return res
    }
    if (code !== 'USER_ALREADY_EXISTS' && code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return res
    const body = await emailFromRequestBody(c)
    // Bentuk sama dengan sign-up yang menunggu verifikasi email (requireEmailVerification):
    // client menampilkan "periksa email Anda" tanpa membocorkan bahwa akun sudah ada.
    return c.json({ token: null, user: { email: body?.email ?? null, name: body?.name ?? null, emailVerified: false } }, 200)
  }
}

async function emailFromRequestBody(c: Context<AppEnv>): Promise<{ email?: string; name?: string } | null> {
  try {
    const body = (await c.req.raw.clone().json()) as Record<string, unknown>
    return {
      email: typeof body.email === 'string' ? body.email : undefined,
      name: typeof body.name === 'string' ? body.name : undefined,
    }
  } catch {
    return null
  }
}
