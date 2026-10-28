import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.ts'
import { user } from '../src/db/schema.ts'
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

describe('Audit log — GET /api/admin/audit-logs', () => {
  let admin: Awaited<ReturnType<typeof signUp>>
  let regular: Awaited<ReturnType<typeof signUp>>

  beforeAll(async () => {
    regular = await signUp()
    admin = await signUp()
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.user.id))
    // beberapa aksi agar ada entri
    for (let i = 0; i < 3; i++) {
      await call('/api/notes', { method: 'POST', cookie: regular.cookie, body: json({ title: `audit ${i}` }) })
    }
  })

  test('tanpa login → 401; user biasa → 403 (permission audit:list)', async () => {
    expect((await call('/api/admin/audit-logs')).status).toBe(401)
    const res = await call('/api/admin/audit-logs', { cookie: regular.cookie })
    expect(res.status).toBe(403)
    expect((await readJson(res)).details).toEqual({ audit: ['list'] })
  })

  test('admin: daftar terbaru dulu, DTO sesuai schema shared, filter actorId/action/success', async () => {
    const { auditLogListSchema } = await import('@hono-react-starter/shared/audit')
    const res = await call(`/api/admin/audit-logs?actorId=${regular.user.id}&action=note.`, { cookie: admin.cookie })
    expect(res.status).toBe(200)
    const list = auditLogListSchema.parse(await readData(res))
    expect(list.items.length).toBe(3)
    expect(list.items.every((i) => i.action === 'note.created' && i.actorId === regular.user.id)).toBe(true)
    expect(list.items.every((i) => typeof i.requestId === 'string' && typeof i.ip === 'string')).toBe(true)
    const times = list.items.map((i) => i.at)
    expect([...times].sort().reverse()).toEqual(times)
    expect(list.nextCursor).toBeNull()

    const failedOnly = auditLogListSchema.parse(await readData(await call('/api/admin/audit-logs?success=false&limit=5', { cookie: admin.cookie })))
    expect(failedOnly.items.every((i) => i.success === false)).toBe(true)
  })

  test('paginasi cursor: limit=2 → nextCursor → halaman berikutnya tanpa duplikat', async () => {
    const q = `actorId=${regular.user.id}&action=note.created&limit=2`
    const page1 = (await readData(await call(`/api/admin/audit-logs?${q}`, { cookie: admin.cookie }))) as {
      items: { id: string; at: string }[]
      nextCursor: string | null
    }
    expect(page1.items.length).toBe(2)
    expect(page1.nextCursor).toBe(page1.items[1]!.at)
    const page2 = (await readData(
      await call(`/api/admin/audit-logs?${q}&cursor=${encodeURIComponent(page1.nextCursor!)}`, { cookie: admin.cookie }),
    )) as typeof page1
    expect(page2.items.length).toBe(1)
    expect(page2.nextCursor).toBeNull()
    expect(page1.items.map((i) => i.id)).not.toContain(page2.items[0]!.id)
  })

  test('query tidak valid → 400 VALIDATION_ERROR', async () => {
    const res = await call('/api/admin/audit-logs?limit=0&cursor=kemarin', { cookie: admin.cookie })
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(Object.keys(body.details)).toEqual(expect.arrayContaining(['limit', 'cursor']))
  })
})
