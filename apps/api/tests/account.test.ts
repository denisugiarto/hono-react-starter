/**
 * Alur akun: verifikasi email, reset password, ganti password, 2FA TOTP + backup
 * code, dan jejak audit-nya. Email ditangkap MemoryMailer (MAIL_PROVIDER=memory
 * di tests/setup.ts).
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import { base32 } from '@better-auth/utils/base32'
import { createOTP } from '@better-auth/utils/otp'
import { desc, eq } from 'drizzle-orm'
import { app } from '../src/app.ts'
import { createAuth } from '../src/auth.ts'
import { db } from '../src/db/index.ts'
import { auditLog, user } from '../src/db/schema.ts'
import { MemoryMailer } from '../src/lib/mailer.ts'
import { mailer } from '../src/mailer.ts'
import { call, json, ORIGIN, readJson, signUp } from './helpers.ts'

if (!(mailer instanceof MemoryMailer)) throw new Error('tests/setup.ts harus mengatur MAIL_PROVIDER=memory')
const inbox: MemoryMailer = mailer

/** Panggil app dengan URL absolut (tautan dari email). */
const callUrl = (url: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers)
  headers.set('Origin', ORIGIN)
  return app.fetch(new Request(url, { ...init, headers, redirect: 'manual' }))
}

const cookiesOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .filter((c) => !c.endsWith('='))
    .join('; ')

const urlIn = (text: string) => {
  const m = text.match(/https?:\/\/\S+/)
  if (!m) throw new Error(`tidak ada URL di email:\n${text}`)
  return m[0]
}

const audits = (actorId: string) =>
  db.select().from(auditLog).where(eq(auditLog.actorId, actorId)).orderBy(desc(auditLog.at))

const findUser = async (id: string) => (await db.select().from(user).where(eq(user.id, id)).limit(1))[0]!

describe('Verifikasi email', () => {
  test('sign-up mengirim email berisi tautan → GET tautan → emailVerified + redirect ke callbackURL', async () => {
    inbox.clear()
    const u = await signUp({ name: 'Verif' })
    expect((await findUser(u.user.id)).emailVerified).toBe(false)

    const mail = inbox.last(u.email)!
    expect(mail.subject).toContain('Verifikasi email')
    const url = urlIn(mail.text)
    expect(url).toContain('/api/auth/verify-email?token=')

    const res = await callUrl(url)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/') // callbackURL default
    expect((await findUser(u.user.id)).emailVerified).toBe(true)

    const rows = await audits(u.user.id)
    expect(rows.map((r) => r.action)).toContain('auth.sign_up')
    const verified = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.email_verified')).orderBy(desc(auditLog.at)).limit(1)
    expect(verified[0]!.success).toBe(true)
    expect(verified[0]!.metadata).toEqual({ email: u.email })
  })

  test('callbackURL kustom & token rusak → redirect ?error=', async () => {
    inbox.clear()
    const email = `cb-${Date.now()}@test.local`
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: json({ email, password: 'password123', name: 'CB', callbackURL: `${ORIGIN}/verify-email` }),
    })
    expect(res.status).toBe(200)
    const url = new URL(urlIn(inbox.last(email)!.text))
    expect(url.searchParams.get('callbackURL')).toBe(`${ORIGIN}/verify-email`)

    url.searchParams.set('token', 'bukan-token')
    const bad = await callUrl(url.toString())
    expect(bad.status).toBe(302)
    expect(bad.headers.get('location')).toContain(`${ORIGIN}/verify-email?error=`)
    const failed = await db.select().from(auditLog).where(eq(auditLog.action, 'auth.email_verified')).orderBy(desc(auditLog.at)).limit(1)
    expect(failed[0]!.success).toBe(false)
  })

  test('POST /send-verification-email mengirim ulang; diaudit', async () => {
    inbox.clear()
    const u = await signUp()
    inbox.clear()
    const res = await call('/api/auth/send-verification-email', { method: 'POST', body: json({ email: u.email, callbackURL: '/' }) })
    expect(res.status).toBe(200)
    expect(inbox.last(u.email)).toBeDefined()
    const row = (await db.select().from(auditLog).where(eq(auditLog.action, 'auth.verification_email_sent')).orderBy(desc(auditLog.at)).limit(1))[0]!
    expect(row.metadata).toEqual({ email: u.email })
  })

  test('requireEmailVerification: sign-in sebelum verifikasi → 403, sesudah → sukses', async () => {
    const strictInbox = new MemoryMailer()
    const strict = createAuth({ requireEmailVerification: true, mailer: strictInbox })
    const email = `strict-${Date.now()}@test.local`
    const password = 'password123'
    await strict.api.signUpEmail({ body: { email, password, name: 'Strict' } })
    expect(strictInbox.last(email)).toBeDefined()
    strictInbox.clear()

    const denied = await strict.handler(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        body: json({ email, password }),
      }),
    )
    expect(denied.status).toBe(403)
    expect(((await denied.json()) as { code: string }).code).toBe('EMAIL_NOT_VERIFIED')
    // sendOnSignIn: email verifikasi dikirim ulang saat sign-in ditolak
    const resent = strictInbox.last(email)
    expect(resent).toBeDefined()

    const verify = await strict.handler(new Request(urlIn(resent!.text), { headers: { origin: ORIGIN }, redirect: 'manual' }))
    expect(verify.status).toBe(302)

    const ok = await strict.handler(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGIN },
        body: json({ email, password }),
      }),
    )
    expect(ok.status).toBe(200)
  })
})

describe('Reset & ganti password', () => {
  test('request-password-reset → email → callback redirect ?token → reset-password → login dengan password baru', async () => {
    const u = await signUp()
    inbox.clear()

    // Email tak dikenal: tetap 200 (tidak membocorkan keberadaan akun), tanpa email
    const unknown = await call('/api/auth/request-password-reset', {
      method: 'POST',
      body: json({ email: `tidak-ada-${Date.now()}@test.local`, redirectTo: `${ORIGIN}/reset-password` }),
    })
    expect(unknown.status).toBe(200)
    expect(inbox.sent.length).toBe(0)

    const req = await call('/api/auth/request-password-reset', {
      method: 'POST',
      body: json({ email: u.email, redirectTo: `${ORIGIN}/reset-password` }),
    })
    expect(req.status).toBe(200)
    const mail = inbox.last(u.email)!
    expect(mail.subject).toContain('Atur ulang password')
    const link = urlIn(mail.text)
    expect(link).toContain('/api/auth/reset-password/')

    const redirect = await callUrl(link)
    expect(redirect.status).toBe(302)
    const location = new URL(redirect.headers.get('location')!)
    expect(location.origin + location.pathname).toBe(`${ORIGIN}/reset-password`)
    const token = location.searchParams.get('token')!
    expect(token).toBeTruthy()

    const reset = await call('/api/auth/reset-password', { method: 'POST', body: json({ newPassword: 'baru-sekali-123', token }) })
    expect(reset.status).toBe(200)

    // sesi lama dicabut (revokeSessionsOnPasswordReset)
    expect(await readJson(await call('/api/auth/get-session', { cookie: u.cookie }))).toBeNull()

    const oldPw = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    expect(oldPw.status).toBe(401)
    const newPw = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: 'baru-sekali-123' }) })
    expect(newPw.status).toBe(200)

    // token sekali pakai
    const again = await call('/api/auth/reset-password', { method: 'POST', body: json({ newPassword: 'lagi-lagi-123', token }) })
    expect(again.status).toBe(400)

    const actions = (await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(12)).map((r) => [r.action, r.success])
    expect(actions).toEqual(
      expect.arrayContaining([
        ['auth.password_reset_requested', true],
        ['auth.password_reset_completed', true],
        ['auth.password_reset_completed', false],
        ['auth.sign_in', false],
        ['auth.sign_in', true],
      ]),
    )
  })

  test('reset-password: tautan dengan token tidak valid → redirect ?error=INVALID_TOKEN', async () => {
    const res = await callUrl(`${ORIGIN}/api/auth/reset-password/token-palsu?callbackURL=${encodeURIComponent(`${ORIGIN}/reset-password`)}`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('error=INVALID_TOKEN')
  })

  test('change-password dengan sesi → diaudit dengan pelaku; password lama salah → gagal', async () => {
    const u = await signUp()
    const wrong = await call('/api/auth/change-password', {
      method: 'POST',
      cookie: u.cookie,
      body: json({ currentPassword: 'salah-semua', newPassword: 'password456', revokeOtherSessions: true }),
    })
    expect(wrong.status).toBe(400)
    const ok = await call('/api/auth/change-password', {
      method: 'POST',
      cookie: u.cookie,
      body: json({ currentPassword: u.password, newPassword: 'password456', revokeOtherSessions: true }),
    })
    expect(ok.status).toBe(200)
    const rows = (await audits(u.user.id)).filter((r) => r.action === 'auth.password_changed')
    expect(rows.map((r) => r.success).sort()).toEqual([false, true])
    expect(rows.find((r) => r.success)!.metadata).toEqual({ revokeOtherSessions: true })
    expect(rows.find((r) => r.success)!.actorEmail).toBe(u.email)
  })

  test('sign-in gagal & sign-out tercatat', async () => {
    const u = await signUp()
    await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: 'ngawur-123' }) })
    const failed = (await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_in')).orderBy(desc(auditLog.at)).limit(1))[0]!
    expect(failed.success).toBe(false)
    expect(failed.actorId).toBeNull()
    expect(failed.metadata).toEqual({ email: u.email, status: 401 })

    await call('/api/auth/sign-out', { method: 'POST', cookie: u.cookie, body: '{}' })
    const out = (await audits(u.user.id)).find((r) => r.action === 'auth.sign_out')!
    expect(out.success).toBe(true)
    expect(out.actorEmail).toBe(u.email)
  })
})

describe('2FA (TOTP + backup code)', () => {
  let u: Awaited<ReturnType<typeof signUp>>
  let totp: ReturnType<typeof createOTP>
  let backupCodes: string[]

  beforeAll(async () => {
    u = await signUp({ name: 'Dua Faktor' })
  })

  test('enable {password} → totpURI + backupCodes; belum aktif sampai verify-totp', async () => {
    const wrong = await call('/api/auth/two-factor/enable', { method: 'POST', cookie: u.cookie, body: json({ password: 'salah-123' }) })
    expect(wrong.status).toBe(400)

    const res = await call('/api/auth/two-factor/enable', { method: 'POST', cookie: u.cookie, body: json({ password: u.password }) })
    expect(res.status).toBe(200)
    const body = await readJson<{ totpURI: string; backupCodes: string[] }>(res)
    expect(body.totpURI).toStartWith('otpauth://totp/')
    expect(body.backupCodes.length).toBeGreaterThan(0)
    backupCodes = body.backupCodes

    const uri = new URL(body.totpURI)
    expect(decodeURIComponent(uri.pathname)).toContain('Hono React Starter')
    const secret = new TextDecoder().decode(base32.decode(uri.searchParams.get('secret')!))
    totp = createOTP(secret, { digits: 6, period: 30 })

    // Belum aktif: sign-in masih langsung memberi sesi
    expect((await findUser(u.user.id)).twoFactorEnabled).toBeFalsy()

    const bad = await call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie: u.cookie, body: json({ code: '000000' }) })
    expect(bad.status).toBeGreaterThanOrEqual(400)

    const ok = await call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie: u.cookie, body: json({ code: await totp.totp() }) })
    expect(ok.status).toBe(200)
    expect((await findUser(u.user.id)).twoFactorEnabled).toBe(true)

    const rows = await audits(u.user.id)
    expect(rows.map((r) => [r.action, r.success])).toEqual(
      expect.arrayContaining([
        ['auth.two_factor_enable_requested', false],
        ['auth.two_factor_enable_requested', true],
        ['auth.two_factor_verified', false],
        ['auth.two_factor_verified', true],
      ]),
    )
  })

  test('sign-in → twoFactorRedirect tanpa sesi → verify-totp dengan cookie 2FA → sesi', async () => {
    const signIn = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    expect(signIn.status).toBe(200)
    const body = await readJson(signIn)
    expect(body.twoFactorRedirect).toBe(true)
    expect(body.twoFactorMethods).toEqual(['totp'])
    const pending = cookiesOf(signIn)
    expect(pending).toContain('two_factor')
    expect(pending).not.toContain('session_token')
    expect(await readJson(await call('/api/auth/get-session', { cookie: pending }))).toBeNull()

    const wrong = await call('/api/auth/two-factor/verify-totp', { method: 'POST', cookie: pending, body: json({ code: '123456' }) })
    expect(wrong.status).toBeGreaterThanOrEqual(400)

    const verified = await call('/api/auth/two-factor/verify-totp', {
      method: 'POST',
      cookie: pending,
      body: json({ code: await totp.totp(), trustDevice: true }),
    })
    expect(verified.status).toBe(200)
    const sessionCookie = cookiesOf(verified)
    expect(sessionCookie).toContain('session_token')
    const session = await readJson(await call('/api/auth/get-session', { cookie: sessionCookie }))
    expect(session.user.id).toBe(u.user.id)

    const row = (await audits(u.user.id)).find((r) => r.action === 'auth.two_factor_verified' && r.metadata?.trustDevice === true)!
    expect(row.success).toBe(true)

    const twoFactorRequired = (await db.select().from(auditLog).where(eq(auditLog.action, 'auth.sign_in_two_factor_required')).limit(1))[0]!
    expect(twoFactorRequired.metadata).toEqual({ email: u.email })
  })

  test('backup code: sekali pakai, memberi sesi; disable {password} mematikan 2FA', async () => {
    const signIn = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    const pending = cookiesOf(signIn)
    const code = backupCodes[0]!
    const ok = await call('/api/auth/two-factor/verify-backup-code', { method: 'POST', cookie: pending, body: json({ code }) })
    expect(ok.status).toBe(200)
    const sessionCookie = cookiesOf(ok)
    expect(sessionCookie).toContain('session_token')

    const reuse = await call('/api/auth/two-factor/verify-backup-code', { method: 'POST', cookie: pending, body: json({ code }) })
    expect(reuse.status).toBeGreaterThanOrEqual(400)

    const disable = await call('/api/auth/two-factor/disable', { method: 'POST', cookie: sessionCookie, body: json({ password: u.password }) })
    expect(disable.status).toBe(200)
    expect((await findUser(u.user.id)).twoFactorEnabled).toBe(false)

    const plain = await call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    expect((await readJson(plain)).twoFactorRedirect).toBeUndefined()

    const actions = (await audits(u.user.id)).map((r) => r.action)
    expect(actions).toContain('auth.two_factor_backup_code_used')
    expect(actions).toContain('auth.two_factor_disabled')
  })
})
