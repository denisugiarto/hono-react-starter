/**
 * Pengaturan runtime (app_setting): endpoint admin, SettingsStore, dan efeknya
 * pada Better Auth (requireEmailVerification dibaca per request lewat getter).
 */
import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { desc, eq } from 'drizzle-orm'
import { db, type Db } from '../src/db/index.ts'
import { appSetting, auditLog, user } from '../src/db/schema.ts'
import { SettingsStore, canRequireEmailVerification } from '../src/lib/settings.ts'
import { settings } from '../src/settings.ts'
import { call, json, readData, readJson, signUp } from './helpers.ts'

async function asAdmin() {
  const u = await signUp({ name: 'Admin Settings' })
  await db.update(user).set({ role: 'admin' }).where(eq(user.id, u.user.id))
  return u
}

const patch = (cookie: string, body: unknown) => call('/api/admin/settings', { method: 'PATCH', cookie, body: typeof body === 'string' ? body : json(body) })

afterEach(async () => {
  await db.delete(appSetting)
  settings.invalidate()
})
afterAll(async () => {
  await db.delete(appSetting)
  settings.invalidate()
})

describe('GET/PATCH /api/admin/settings', () => {
  test('tanpa sesi → 401; user biasa → 403', async () => {
    expect((await call('/api/admin/settings')).status).toBe(401)
    const u = await signUp()
    expect((await call('/api/admin/settings', { cookie: u.cookie })).status).toBe(403)
    expect((await patch(u.cookie, { requireEmailVerification: true })).status).toBe(403)
  })

  test('admin: default dari env (false), provider memory, infra siap di luar production', async () => {
    const admin = await asAdmin()
    const view = await readData(await call('/api/admin/settings', { cookie: admin.cookie }))
    expect(view).toEqual({
      requireEmailVerification: false,
      mailProvider: 'memory',
      emailVerificationReady: true,
      updatedAt: null,
      updatedBy: null,
    })
  })

  test('validasi: body bukan JSON / kosong / field asing → 400', async () => {
    const admin = await asAdmin()
    expect((await patch(admin.cookie, '{bukan json')).status).toBe(400)
    expect((await patch(admin.cookie, {})).status).toBe(400)
    const res = await patch(admin.cookie, { asing: true })
    expect(res.status).toBe(400)
    expect((await readJson(res)).code).toBe('VALIDATION_ERROR')
  })

  test('ubah → tersimpan, metadata pelaku terisi, baris audit admin.settings_updated', async () => {
    const admin = await asAdmin()
    const res = await patch(admin.cookie, { requireEmailVerification: true })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.message).toBe('Pengaturan disimpan')
    expect(body.data.requireEmailVerification).toBe(true)
    expect(body.data.updatedBy).toBe(admin.user.id)
    expect(typeof body.data.updatedAt).toBe('string')

    const again = await readData(await call('/api/admin/settings', { cookie: admin.cookie }))
    expect(again.requireEmailVerification).toBe(true)

    const row = (await db.select().from(auditLog).where(eq(auditLog.action, 'admin.settings_updated')).orderBy(desc(auditLog.at)).limit(1))[0]!
    expect(row.actorId).toBe(admin.user.id)
    expect(row.metadata).toEqual({ changes: { requireEmailVerification: true } })
  })

  test('production + provider bukan resend → 409 MAIL_PROVIDER_REQUIRED (mematikan tetap boleh)', async () => {
    const admin = await asAdmin()
    process.env.NODE_ENV = 'production'
    try {
      const res = await patch(admin.cookie, { requireEmailVerification: true })
      expect(res.status).toBe(409)
      expect((await readJson(res)).code).toBe('MAIL_PROVIDER_REQUIRED')
      expect((await patch(admin.cookie, { requireEmailVerification: false })).status).toBe(200)
      const view = await readData(await call('/api/admin/settings', { cookie: admin.cookie }))
      expect(view.emailVerificationReady).toBe(false)
    } finally {
      process.env.NODE_ENV = 'test'
    }
  })

  test('efek runtime: setelah diaktifkan admin, sign-in akun belum terverifikasi → 403 EMAIL_NOT_VERIFIED; dimatikan → sukses', async () => {
    const admin = await asAdmin()
    const u = await signUp({ name: 'Belum Verifikasi' })
    const signIn = () => call('/api/auth/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })

    expect((await signIn()).status).toBe(200)
    expect((await patch(admin.cookie, { requireEmailVerification: true })).status).toBe(200)
    const denied = await signIn()
    expect(denied.status).toBe(403)
    expect((await readJson(denied)).code).toBe('EMAIL_NOT_VERIFIED')

    expect((await patch(admin.cookie, { requireEmailVerification: false })).status).toBe(200)
    expect((await signIn()).status).toBe(200)
  })
})

describe('SettingsStore', () => {
  test('load: kunci asing & nilai tidak valid diabaikan; metadata dari baris terbaru; load paralel berbagi promise', async () => {
    const store = new SettingsStore(db, { defaults: { requireEmailVerification: false } })
    await db.insert(appSetting).values([
      { key: 'requireEmailVerification', value: 'yes', updatedBy: 'x' },
      { key: 'tidakDikenal', value: 1, updatedBy: 'y' },
    ])
    expect(await store.load()).toEqual({ requireEmailVerification: false })
    expect(store.lastUpdate()).toEqual({ updatedAt: null, updatedBy: null })

    await db.update(appSetting).set({ value: true, updatedBy: 'admin-1' }).where(eq(appSetting.key, 'requireEmailVerification'))
    store.invalidate()
    const [a, b] = await Promise.all([store.load(), store.load()])
    expect(a).toBe(b)
    expect(a.requireEmailVerification).toBe(true)
    expect(store.lastUpdate().updatedBy).toBe('admin-1')
    expect(store.current().requireEmailVerification).toBe(true)
  })

  test('update: upsert lalu baca ulang; field undefined dilewati', async () => {
    const store = new SettingsStore(db)
    expect(await store.update({ requireEmailVerification: true }, 'u1')).toEqual({ requireEmailVerification: true })
    expect(await store.update({ requireEmailVerification: undefined }, 'u1')).toEqual({ requireEmailVerification: true })
    expect(await store.update({ requireEmailVerification: false }, 'u2')).toEqual({ requireEmailVerification: false })
    expect(store.lastUpdate().updatedBy).toBe('u2')
    expect((await db.select().from(appSetting)).length).toBe(1)
  })

  test('current: cache kedaluwarsa memicu baca ulang di latar belakang; DB gagal → nilai lama tetap', async () => {
    let calls = 0
    const broken = {
      select: () => {
        calls++
        throw new Error('db down')
      },
    } as unknown as Db
    const store = new SettingsStore(broken, { defaults: { requireEmailVerification: true }, ttlMs: 0 })
    expect(store.current()).toEqual({ requireEmailVerification: true })
    await new Promise((r) => setTimeout(r, 5))
    expect(calls).toBe(1)
    expect(store.current()).toEqual({ requireEmailVerification: true })
    await expect(store.load()).rejects.toThrow('db down')
  })

  test('canRequireEmailVerification', () => {
    expect(canRequireEmailVerification({ isProd: false, mailProvider: 'console' })).toBe(true)
    expect(canRequireEmailVerification({ isProd: true, mailProvider: 'console' })).toBe(false)
    expect(canRequireEmailVerification({ isProd: true, mailProvider: 'resend' })).toBe(true)
  })
})
