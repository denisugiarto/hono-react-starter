import { describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createAuth } from '../src/auth.ts'
import { db } from '../src/db/index.ts'
import { user } from '../src/db/schema.ts'
import { ORIGIN, json, signUp } from './helpers.ts'

const cookieNames = (res: Response) => res.headers.getSetCookie().map((c) => c.split('=')[0]!)
const cookieHeader = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

const request = (handler: (req: Request) => Promise<Response>, path: string, init: RequestInit & { cookie?: string } = {}) => {
  const { cookie, ...rest } = init
  const headers = new Headers({ Origin: ORIGIN, 'Content-Type': 'application/json' })
  if (cookie) headers.set('Cookie', cookie)
  return handler(new Request(`${ORIGIN}/api/auth${path}`, { ...rest, headers }))
}

/**
 * Cookie cache sesi (AUTH_SESSION_CACHE_SECONDS). Instance `auth` utama berjalan
 * dengan 0 saat test (lihat tests/setup.ts); di sini dipakai instance sendiri.
 */
describe('Cookie cache sesi', () => {
  test('aktif: sign-in memberi cookie session_data; get-session memakainya (perubahan DB belum terlihat)', async () => {
    const cachedAuth = createAuth({ sessionCacheSeconds: 60 })
    const u = await signUp()
    const res = await request(cachedAuth.handler, '/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    expect(res.status).toBe(200)
    expect(cookieNames(res)).toEqual(expect.arrayContaining(['better-auth.session_token', 'better-auth.session_data']))
    const cookie = cookieHeader(res)

    const session = (await (await request(cachedAuth.handler, '/get-session', { cookie })).json()) as { user: { name: string } }
    expect(typeof session.user.name).toBe('string')

    // Ubah nama langsung di DB: selama cache (≤ 60 detik) get-session masih memberi salinan lama
    await db.update(user).set({ name: 'Nama Baru' }).where(eq(user.id, u.user.id))
    const stale = (await (await request(cachedAuth.handler, '/get-session', { cookie })).json()) as { user: { name: string } }
    expect(stale.user.name).toBe(session.user.name)

    // Tanpa cookie session_data (mis. sudah kedaluwarsa) → dibaca dari DB → nama baru
    const onlyToken = cookie
      .split('; ')
      .filter((c) => !c.startsWith('better-auth.session_data'))
      .join('; ')
    const fresh = (await (await request(cachedAuth.handler, '/get-session', { cookie: onlyToken })).json()) as { user: { name: string } }
    expect(fresh.user.name).toBe('Nama Baru')

    // Sign-out menghapus kedua cookie (Max-Age=0)
    const out = await request(cachedAuth.handler, '/sign-out', { method: 'POST', cookie })
    expect(out.status).toBe(200)
    const cleared = out.headers.getSetCookie().filter((c) => /max-age=0/i.test(c)).map((c) => c.split('=')[0])
    expect(cleared).toEqual(expect.arrayContaining(['better-auth.session_token', 'better-auth.session_data']))
  })

  test('sessionCacheSeconds: 0 → tanpa cookie session_data', async () => {
    const off = createAuth({ sessionCacheSeconds: 0 })
    const u = await signUp()
    const res = await request(off.handler, '/sign-in/email', { method: 'POST', body: json({ email: u.email, password: u.password }) })
    expect(res.status).toBe(200)
    expect(cookieNames(res)).not.toContain('better-auth.session_data')
  })
})
