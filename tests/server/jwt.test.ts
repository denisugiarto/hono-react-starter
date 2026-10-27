import { beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../src/server/db/index.ts'
import { user } from '../../src/server/db/schema.ts'
import { call, json, readData, readJson, signUp } from './helpers.ts'

function decodePayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.')
  return JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'))
}

/** Terbitkan JWT dari sesi (cookie) via GET /api/auth/token */
async function issueJwt(cookie: string): Promise<string> {
  const res = await call('/api/auth/token', { cookie })
  expect(res.status).toBe(200)
  const { token } = await readJson<{ token: string }>(res)
  expect(typeof token).toBe('string')
  return token
}

let alice: Awaited<ReturnType<typeof signUp>>
let aliceJwt: string

beforeAll(async () => {
  alice = await signUp({ name: 'Alice JWT' })
  aliceJwt = await issueJwt(alice.cookie)
})

describe('JWT — penerbitan & JWKS', () => {
  test('GET /api/auth/jwks mengekspos kunci publik (tanpa kunci privat)', async () => {
    const res = await call('/api/auth/jwks')
    expect(res.status).toBe(200)
    const body = await readJson<{ keys: Record<string, unknown>[] }>(res)
    expect(body.keys.length).toBeGreaterThan(0)
    expect(body.keys[0]!.kid).toBeTruthy()
    expect(body.keys[0]).not.toHaveProperty('d') // komponen privat
  })

  test('GET /api/auth/token tanpa sesi → 401', async () => {
    const res = await call('/api/auth/token')
    expect(res.status).toBe(401)
  })

  test('payload berisi klaim identitas + role, exp ≈ 15 menit', async () => {
    const p = decodePayload(aliceJwt)
    expect(p.sub).toBe(alice.user.id)
    expect(p.id).toBe(alice.user.id)
    expect(p.email).toBe(alice.email)
    expect(p.role).toBe('user')
    expect(p.iss).toBe('http://localhost:3000')
    expect(Number(p.exp) - Number(p.iat)).toBe(15 * 60)
  })

  test('get-session juga mengirim header set-auth-jwt', async () => {
    const res = await call('/api/auth/get-session', { cookie: alice.cookie })
    expect(res.headers.get('set-auth-jwt')).toBeTruthy()
  })
})

describe('JWT — akses API dengan Authorization: Bearer', () => {
  test('bearer JWT valid → akses notes sebagai pemilik', async () => {
    const created = await call('/api/notes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceJwt}` },
      body: json({ title: 'Dari API client' }),
    })
    expect(created.status).toBe(201)
    expect((await readData(created)).userId).toBe(alice.user.id)

    const list = await call('/api/notes', { headers: { Authorization: `Bearer ${aliceJwt}` } })
    expect(list.status).toBe(200)
    expect((await readData(list)).length).toBe(1)

    // Cookie sesi dan JWT menunjuk ke user yang sama
    const viaCookie = await readData(await call('/api/notes', { cookie: alice.cookie }))
    expect(viaCookie.length).toBe(1)
  })

  test('/api/admin/me melaporkan authMethod jwt vs session', async () => {
    const admin = await signUp()
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.user.id))
    const adminJwt = await issueJwt(admin.cookie)

    const viaJwt = await readData(
      await call('/api/admin/me', { headers: { Authorization: `Bearer ${adminJwt}` } }),
    )
    expect(viaJwt.authMethod).toBe('jwt')
    expect(viaJwt.role).toBe('admin')

    const viaSession = await readData(await call('/api/admin/me', { cookie: admin.cookie }))
    expect(viaSession.authMethod).toBe('session')
  })

  test('JWT dimanipulasi (payload diubah) → 401', async () => {
    const [h, p, s] = aliceJwt.split('.')
    const forged = Buffer.from(
      JSON.stringify({ ...decodePayload(aliceJwt), role: 'admin' }),
    ).toString('base64url')
    const res = await call('/api/admin/users', {
      headers: { Authorization: `Bearer ${h}.${forged}.${s}` },
    })
    expect(res.status).toBe(401)
    void p
  })

  test('bearer sampah / kosong → 401', async () => {
    expect((await call('/api/notes', { headers: { Authorization: 'Bearer abc.def.ghi' } })).status).toBe(401)
    expect((await call('/api/notes', { headers: { Authorization: 'Bearer ' } })).status).toBe(401)
    expect((await call('/api/notes', { headers: { Authorization: 'Basic abc' } })).status).toBe(401)
  })

  test('bearer session-token (plugin bearer) juga diterima', async () => {
    const res = await call('/api/auth/sign-in/email', {
      method: 'POST',
      body: json({ email: alice.email, password: alice.password }),
    })
    expect(res.status).toBe(200)
    const sessionToken = res.headers.get('set-auth-token')
    expect(sessionToken).toBeTruthy()

    const me = await call('/api/notes', { headers: { Authorization: `Bearer ${sessionToken}` } })
    expect(me.status).toBe(200)
  })
})

describe('RBAC — permission via JWT', () => {
  test('user biasa dengan JWT → /api/admin/users 403', async () => {
    const res = await call('/api/admin/users', { headers: { Authorization: `Bearer ${aliceJwt}` } })
    expect(res.status).toBe(403)
    expect((await readJson(res)).code).toBe('FORBIDDEN')
  })

  test('admin dengan JWT → /api/admin/users 200', async () => {
    const admin = await signUp()
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, admin.user.id))
    const adminJwt = await issueJwt(admin.cookie)
    const res = await call('/api/admin/users', { headers: { Authorization: `Bearer ${adminJwt}` } })
    expect(res.status).toBe(200)
  })

  test('JWT lama (diterbitkan sebelum promosi) tetap membawa role lama sampai expired', async () => {
    const u = await signUp()
    const oldJwt = await issueJwt(u.cookie)
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, u.user.id))

    // Stateless: klaim role di token lama tidak berubah
    expect((await call('/api/admin/users', { headers: { Authorization: `Bearer ${oldJwt}` } })).status).toBe(403)
    // Token baru membawa role terbaru
    const freshJwt = await issueJwt(u.cookie)
    expect((await call('/api/admin/users', { headers: { Authorization: `Bearer ${freshJwt}` } })).status).toBe(200)
  })
})
