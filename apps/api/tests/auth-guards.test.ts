import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createApp } from '../src/app.ts'
import { auth } from '../src/auth.ts'
import { withAuthAudit } from '../src/auth-audit.ts'
import { clearLockout, maskSignUpConflict, readLockout, withSignInLockout } from '../src/auth-guards.ts'
import { db } from '../src/db/index.ts'
import { auditLog } from '../src/db/schema.ts'
import { CLIENT_IP_HEADER, withClientIp } from '../src/middleware/rate-limit.ts'
import { ORIGIN, call, json, readJson, signUp } from './helpers.ts'

const signIn = (email: string, password: string, extra: Record<string, string> = {}) =>
  call('/api/auth/sign-in/email', { method: 'POST', body: json({ email, password }), headers: extra })

describe('Lockout per akun (withSignInLockout)', () => {
  let u: Awaited<ReturnType<typeof signUp>>
  beforeAll(async () => {
    u = await signUp()
  })

  test('5 password salah → 423 ACCOUNT_LOCKED + Retry-After; password benar pun ditolak sampai kunci lepas', async () => {
    for (let i = 0; i < 4; i++) expect((await signIn(u.email, 'salah-salah')).status).toBe(401)
    expect((await readLockout(db, u.email.toLowerCase()))?.failedCount).toBe(4)

    const fifth = await signIn(u.email, 'salah-salah')
    expect(fifth.status).toBe(401)
    const state = await readLockout(db, u.email.toLowerCase())
    expect(state?.failedCount).toBe(0)
    expect(state?.lockedUntil && state.lockedUntil.getTime()).toBeGreaterThan(Date.now())

    const locked = await signIn(u.email.toUpperCase(), u.password) // email tidak peka huruf besar
    expect(locked.status).toBe(423)
    expect(locked.headers.get('retry-after')).toMatch(/^\d+$/)
    const body = await readJson(locked)
    expect(body.code).toBe('ACCOUNT_LOCKED')
    expect(body.details.retryAfter).toBeGreaterThan(0)

    // Tercatat di audit sebagai sign-in gagal dengan status 423
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_in'))
    expect(rows.some((r) => !r.success && (r.metadata as { status?: number })?.status === 423)).toBe(true)

    // Kunci dilepas → masuk berhasil → baris dihapus
    await clearLockout(db, u.email.toLowerCase())
    expect((await signIn(u.email, u.password)).status).toBe(200)
    expect(await readLockout(db, u.email.toLowerCase())).toBeNull()
  })

  test('masuk berhasil mereset hitungan; 403 (banned) dan body tanpa email tidak dihitung', async () => {
    const v = await signUp()
    await signIn(v.email, 'salah-salah')
    await signIn(v.email, 'salah-salah')
    expect((await readLockout(db, v.email.toLowerCase()))?.failedCount).toBe(2)
    expect((await signIn(v.email, v.password)).status).toBe(200)
    expect(await readLockout(db, v.email.toLowerCase())).toBeNull()

    const noEmail = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ password: 'x' }) })
    expect(noEmail.status).toBeGreaterThanOrEqual(400)
    const notJson = await call('/api/auth/sign-in/email', { method: 'POST', body: 'bukan-json', headers: { 'content-type': 'text/plain' } })
    expect(notJson.status).toBeGreaterThanOrEqual(400)
    const brokenJson = await call('/api/auth/sign-in/email', { method: 'POST', body: '{rusak', headers: { 'content-type': 'application/json' } })
    expect(brokenJson.status).toBeGreaterThanOrEqual(400)
  })

  test('cleanupLockouts menghapus baris basi (> 1 hari, tidak terkunci) dan menyisakan yang aktif', async () => {
    const { cleanupLockouts, recordFailure } = await import('../src/auth-guards.ts')
    const { sql } = await import('drizzle-orm')
    const stale = `stale-${Date.now()}@test.local`
    const active = `active-${Date.now()}@test.local`
    await recordFailure(db, stale, { maxAttempts: 5, lockMinutes: 15 })
    await recordFailure(db, active, { maxAttempts: 5, lockMinutes: 15 })
    await db.execute(sql`update sign_in_lockout set updated_at = now() - interval '2 days' where email = ${stale}`)
    await cleanupLockouts(db)
    expect(await readLockout(db, stale)).toBeNull()
    expect((await readLockout(db, active))?.failedCount).toBe(1)
    await clearLockout(db, active)
  })

  test('config: false → passthrough; now() yang disuntik menentukan kedaluwarsa kunci', async () => {
    const passthrough = withSignInLockout(async () => new Response('ok'), { config: false })
    const res = await passthrough(new Request(`${ORIGIN}/api/auth/sign-in/email`, { method: 'POST' }), {} as never)
    expect(await res.text()).toBe('ok')

    const w = await signUp()
    const email = w.email.toLowerCase()
    let calls = 0
    const guarded = withSignInLockout(
      async () => {
        calls += 1
        return new Response(null, { status: 401 })
      },
      { config: { maxAttempts: 2, lockMinutes: 1 }, now: () => new Date() },
    )
    const req = () =>
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: json({ email }),
      })
    const fakeCtx = { json: (body: unknown, status: number, headers: Record<string, string>) => Response.json(body, { status, headers }) }
    expect((await guarded(req(), fakeCtx as never)).status).toBe(401)
    expect((await guarded(req(), fakeCtx as never)).status).toBe(401)
    expect((await guarded(req(), fakeCtx as never)).status).toBe(423)
    expect(calls).toBe(2)

    // Dua menit kemudian: kunci (1 menit) sudah lewat → diteruskan lagi
    const later = withSignInLockout(
      async () => {
        calls += 1
        return new Response(null, { status: 401 })
      },
      { config: { maxAttempts: 2, lockMinutes: 1 }, now: () => new Date(Date.now() + 2 * 60_000) },
    )
    expect((await later(req(), fakeCtx as never)).status).toBe(401)
    expect(calls).toBe(3)
    await clearLockout(db, email)
  })
})

describe('Anti-enumerasi sign-up (maskSignUpConflict)', () => {
  test('email sudah terdaftar → 200 token null (bukan 422); audit mencatat kegagalan asli', async () => {
    const u = await signUp()
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: json({ email: u.email, password: 'password-lain-123', name: 'Penyusup' }),
    })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.token).toBeNull()
    expect(body.user.email).toBe(u.email)
    expect(res.headers.getSetCookie().some((c) => c.includes('session_token='))).toBe(false)

    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_up'))
    const failed = rows.find((r) => !r.success && (r.metadata as { email?: string })?.email === u.email)
    expect((failed?.metadata as { status?: number })?.status).toBe(422)
  })

  test('respons lain diteruskan apa adanya (422 kode lain, bukan JSON, path lain)', async () => {
    const mk = (status: number, body: string | null, path = '/api/auth/sign-up/email', ct = 'application/json') =>
      maskSignUpConflict(async () => new Response(body, { status, headers: { 'content-type': ct } }))({
        req: { method: 'POST', path, raw: new Request(`${ORIGIN}${path}`, { method: 'POST' }) },
      } as never)
    expect((await mk(422, JSON.stringify({ code: 'LAIN' }))).status).toBe(422)
    expect((await mk(422, 'bukan json', '/api/auth/sign-up/email', 'text/plain')).status).toBe(422)
    expect((await mk(422, JSON.stringify({ code: 'USER_ALREADY_EXISTS' }), '/api/auth/sign-in/email')).status).toBe(422)
    expect((await mk(400, JSON.stringify({ code: 'USER_ALREADY_EXISTS' }))).status).toBe(400)
  })

  test('body request bukan JSON → tetap disamarkan dengan email/name null', async () => {
    const masked = maskSignUpConflict(async () =>
      new Response(JSON.stringify({ code: 'USER_ALREADY_EXISTS' }), { status: 422, headers: { 'content-type': 'application/json' } }),
    )
    const path = '/api/auth/sign-up/email'
    const ctx = {
      req: { method: 'POST', path, raw: new Request(`${ORIGIN}${path}`, { method: 'POST', body: '{rusak' }) },
      json: (body: unknown, status: number) => Response.json(body, { status }),
    }
    const res = await masked(ctx as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ token: null, user: { email: null, name: null, emailVerified: false } })
  })
})

describe('IP tepercaya diteruskan ke Better Auth', () => {
  test('TRUST_PROXY nonaktif: header proxy & x-client-ip dari klien diabaikan (audit ip = unknown)', async () => {
    const u = await signUp()
    await signIn(u.email, 'salah-salah', { 'x-forwarded-for': '203.0.113.9', [CLIENT_IP_HEADER]: '198.51.100.1' })
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_in'))
    const row = rows.filter((r) => (r.metadata as { email?: string })?.email === u.email).at(-1)!
    expect(row.ip).toBe('unknown')
    await clearLockout(db, u.email.toLowerCase())
  })

  test('trustProxy: true → ip dari x-forwarded-for dipakai audit & diteruskan ke Better Auth (sesi.ipAddress)', async () => {
    const trusted = createApp({ silent: true, trustProxy: true })
    const u = await signUp()
    const res = await trusted.fetch(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
        body: json({ email: u.email, password: u.password }),
      }),
    )
    expect(res.status).toBe(200)
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_in'))
    const row = rows.filter((r) => r.success && (r.metadata as { email?: string })?.email === u.email).at(-1)!
    expect(row.ip).toBe('203.0.113.7')

    // Better Auth membaca header internal yang kita tulis (withClientIp), bukan header proxy langsung
    const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
    const sessions = await auth.api.listSessions({ headers: new Headers({ Cookie: cookie }) })
    expect(sessions.some((s) => s.ipAddress === '203.0.113.7')).toBe(true)

    const direct = await auth.handler(withClientIp(new Request(`${ORIGIN}/api/auth/get-session`, { headers: { Cookie: cookie } }), '1.2.3.4'))
    expect(direct.status).toBe(200)
    void withAuthAudit
  })
})
