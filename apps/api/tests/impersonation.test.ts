/** Impersonasi admin dimatikan: role admin tidak punya permission user:impersonate. */
import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.ts'
import { user } from '../src/db/schema.ts'
import { call, json, signUp } from './helpers.ts'

describe('POST /api/auth/admin/impersonate-user', () => {
  test('admin → 403 (permission impersonate tidak diberikan)', async () => {
    const admin = await signUp({ name: 'Admin' })
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.user.id))
    const target = await signUp({ name: 'Target' })

    const res = await call('/api/auth/admin/impersonate-user', {
      method: 'POST',
      cookie: admin.cookie,
      body: json({ userId: target.user.id }),
    })
    expect(res.status).toBe(403)

    // Aksi admin lain tetap berjalan (permission user:set-role masih ada)
    const ok = await call('/api/auth/admin/set-role', {
      method: 'POST',
      cookie: admin.cookie,
      body: json({ userId: target.user.id, role: 'admin' }),
    })
    expect(ok.status).toBe(200)
  })
})
