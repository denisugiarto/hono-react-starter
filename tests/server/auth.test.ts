import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../src/server/db/index.ts'
import { user } from '../../src/server/db/schema.ts'
import { call, json, readData, readJson, signUp } from './helpers.ts'

describe('Autentikasi (Better Auth)', () => {
  test('sign-up → sesi via cookie → get-session → sign-out', async () => {
    const u = await signUp()
    expect(u.cookie).toContain('better-auth.session_token')

    const session = await readJson(await call('/api/auth/get-session', { cookie: u.cookie }))
    expect(session.user.email).toBe(u.email)
    expect(session.user.role).toBe('user') // default role dari plugin admin

    const out = await call('/api/auth/sign-out', { method: 'POST', cookie: u.cookie, body: '{}' })
    expect(out.status).toBe(200)

    const after = await call('/api/auth/get-session', { cookie: u.cookie })
    expect(await readJson(after)).toBeNull()
  })

  test('sign-in password salah → 401', async () => {
    const u = await signUp()
    const res = await call('/api/auth/sign-in/email', {
      method: 'POST',
      body: json({ email: u.email, password: 'salah-sekali' }),
    })
    expect(res.status).toBe(401)
  })

  test('sign-up password < 8 karakter ditolak', async () => {
    const res = await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: json({ email: `short-${Date.now()}@test.local`, password: 'pendek', name: 'X' }),
    })
    expect(res.status).toBe(400)
  })

  test('password tidak pernah dikembalikan di respons', async () => {
    const u = await signUp()
    const session = await (await call('/api/auth/get-session', { cookie: u.cookie })).text()
    expect(session).not.toContain(u.password)
  })
})

describe('RBAC — /api/admin/users', () => {
  let regular: Awaited<ReturnType<typeof signUp>>
  let admin: Awaited<ReturnType<typeof signUp>>

  beforeAll(async () => {
    regular = await signUp()
    admin = await signUp()
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.user.id))
  })

  test('tanpa login → 401', async () => {
    const res = await call('/api/admin/users')
    expect(res.status).toBe(401)
  })

  test('user biasa → 403', async () => {
    const res = await call('/api/admin/users', { cookie: regular.cookie })
    expect(res.status).toBe(403)
    expect((await readJson(res)).code).toBe('FORBIDDEN')
  })

  test('admin → 200 + daftar user sesuai DTO shared', async () => {
    const res = await call('/api/admin/users', { cookie: admin.cookie })
    expect(res.status).toBe(200)
    const users = await readData(res)
    expect(Array.isArray(users)).toBe(true)
    const me = users.find((x: { id: string }) => x.id === admin.user.id)
    expect(me.role).toBe('admin')
    expect(typeof me.createdAt).toBe('string')
    expect(me).not.toHaveProperty('password')
  })
})
