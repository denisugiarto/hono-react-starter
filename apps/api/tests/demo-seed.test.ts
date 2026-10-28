import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.ts'
import { notes, user } from '../src/db/schema.ts'
import { DEMO_ACCOUNTS, DEMO_BACKUP_CODES, DEMO_NOTES, demoAccount, demoTotpCode, demoTotpUri, seedDemo } from '../src/db/demo.ts'
import { call, json, readData, readJson } from './helpers.ts'

const cookiesOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

const signIn = (key: Parameters<typeof demoAccount>[0]) => {
  const a = demoAccount(key)
  return call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: a.email, password: a.password }) })
}

describe('seed demo (akun uji)', () => {
  beforeAll(async () => {
    // Dua kali: harus idempoten (akun tidak dobel, catatan direset)
    await seedDemo()
    const result = await seedDemo()
    expect(Object.keys(result.users).sort()).toEqual(['admin', 'banned', 'totp', 'user'])
  })

  test('semua akun ada satu kali dengan role & status sesuai', async () => {
    for (const a of DEMO_ACCOUNTS) {
      const rows = await db.select().from(user).where(eq(user.email, a.email))
      expect(rows.length, a.email).toBe(1)
      expect(rows[0]!.role).toBe(a.role)
      expect(rows[0]!.emailVerified).toBe(true)
      expect(rows[0]!.banned ?? false).toBe(a.banned ?? false)
      expect(rows[0]!.twoFactorEnabled ?? false).toBe(Boolean(a.totpSecret))
    }
  })

  test('user biasa bisa masuk dan punya catatan contoh', async () => {
    const res = await signIn('user')
    expect(res.status).toBe(200)
    const cookie = cookiesOf(res)
    const list = await readData<{ title: string }[]>(await call('/api/notes', { cookie }))
    expect(list.map((n) => n.title).sort()).toEqual([...DEMO_NOTES.map((n) => n.title)].sort())
    const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, demoAccount('user').email))
    expect((await db.select().from(notes).where(eq(notes.userId, row!.id))).length).toBe(DEMO_NOTES.length)
  })

  test('admin punya akses admin', async () => {
    const cookie = cookiesOf(await signIn('admin'))
    const res = await call('/api/admin/users', { cookie })
    expect(res.status).toBe(200)
  })

  test('akun banned ditolak saat masuk', async () => {
    const res = await signIn('banned')
    expect(res.status).toBeGreaterThanOrEqual(400)
    const body = await readJson(res)
    expect(body.code).toBe('BANNED_USER')
  })

  test('akun totp: sign-in → twoFactorRedirect → verify-totp dengan secret tetap → sesi', async () => {
    const res = await signIn('totp')
    expect(res.status).toBe(200)
    expect((await readJson(res)).twoFactorRedirect).toBe(true)
    const pending = cookiesOf(res)

    const verified = await call('/api/auth/two-factor/verify-totp', {
      method: 'POST',
      cookie: pending,
      body: json({ code: await demoTotpCode() }),
    })
    expect(verified.status).toBe(200)
    const session = await readJson(await call('/api/auth/get-session', { cookie: cookiesOf(verified) }))
    expect(session.user.email).toBe(demoAccount('totp').email)
  })

  test('akun totp: kode cadangan tetap berfungsi, lalu direset oleh seed ulang', async () => {
    const pending = cookiesOf(await signIn('totp'))
    const verified = await call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: pending,
      body: json({ code: DEMO_BACKUP_CODES[0] }),
    })
    expect(verified.status).toBe(200)

    // Kode sudah terpakai
    const reuse = await call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: cookiesOf(await signIn('totp')),
      body: json({ code: DEMO_BACKUP_CODES[0] }),
    })
    expect(reuse.status).toBeGreaterThanOrEqual(400)

    await seedDemo()
    const again = await call('/api/auth/two-factor/verify-backup-code', {
      method: 'POST',
      cookie: cookiesOf(await signIn('totp')),
      body: json({ code: DEMO_BACKUP_CODES[0] }),
    })
    expect(again.status).toBe(200)
  })

  test('demoTotpUri → otpauth URI dengan issuer & email', () => {
    const uri = demoTotpUri('Starter Uji')
    expect(uri).toStartWith('otpauth://totp/')
    expect(decodeURIComponent(uri)).toContain('Starter Uji')
    expect(decodeURIComponent(uri)).toContain(demoAccount('totp').email)
  })
})
