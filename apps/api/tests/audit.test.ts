import { describe, expect, test } from 'bun:test'
import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../src/db/index.ts'
import { auditLog, type NewAuditLog } from '../src/db/schema.ts'
import { auditFromContext, recordAudit } from '../src/lib/audit.ts'
import { createCapturingSink, Logger } from '../src/lib/logger.ts'
import { requestContext } from '../src/lib/request-context.ts'
import { emailFromVerificationToken, withAuthAudit, AUDITED_AUTH_PATHS } from '../src/auth-audit.ts'
import type { AppEnv } from '../src/types.ts'
import { call, readJson, signUp } from './helpers.ts'

const lastRow = async (action: string) =>
  (await db.select().from(auditLog).where(eq(auditLog.action, action)).orderBy(desc(auditLog.at)).limit(1))[0]

describe('recordAudit', () => {
  test('menulis baris dengan konteks request (AsyncLocalStorage) bila ada', async () => {
    const log = new Logger({ level: 'silent' })
    await requestContext.run({ requestId: 'req-ctx-1', ip: '1.2.3.4', userAgent: 'ua/1', log }, () =>
      recordAudit({ action: 'note.created', actor: { id: 'u-x', email: 'x@test.local' }, targetType: 'note', targetId: 'n1' }),
    )
    const row = await lastRow('note.created')
    expect(row).toMatchObject({
      actorId: 'u-x',
      actorEmail: 'x@test.local',
      requestId: 'req-ctx-1',
      ip: '1.2.3.4',
      userAgent: 'ua/1',
      success: true,
      targetId: 'n1',
      metadata: null,
    })
  })

  test('tanpa konteks → field request null; metadata tersimpan sebagai JSON', async () => {
    await recordAudit({ action: 'auth.sign_out', success: false, metadata: { reason: 'uji' } })
    const row = await lastRow('auth.sign_out')
    expect(row!.requestId).toBeNull()
    expect(row!.actorId).toBeNull()
    expect(row!.success).toBe(false)
    expect(row!.metadata).toEqual({ reason: 'uji' })
  })

  test('gagal menulis → tidak melempar, dicatat sebagai error', async () => {
    const { sink, lines } = createCapturingSink()
    const log = new Logger({ sink })
    const write = async (_row: NewAuditLog) => {
      throw new Error('db putus')
    }
    await recordAudit({ action: 'note.deleted' }, { write, log })
    expect(lines.length).toBe(1)
    expect(lines[0]!.level).toBe('error')
    expect(lines[0]!.json().msg).toBe('audit log gagal ditulis')
  })
})

describe('auditFromContext', () => {
  test('pelaku dari c.get("user"), requestId/ip/UA dari request', async () => {
    const captured: NewAuditLog[] = []
    const app = new Hono<AppEnv>()
    app.get('/x', async (c) => {
      c.set('requestId', 'rid-9')
      c.set('user', { id: 'u1', email: 'u1@test.local', name: 'U', role: 'user', authMethod: 'session' })
      await auditFromContext(c, { action: 'note.updated', targetType: 'note', targetId: 'n9' }, { write: async (r) => void captured.push(r) })
      return c.text('ok')
    })
    await app.fetch(new Request('http://x/x', { headers: { 'x-real-ip': '7.7.7.7', 'user-agent': 'bot/2' } }))
    // Tanpa requestLog/TRUST_PROXY, header IP dari klien diabaikan → 'unknown' (tak ada koneksi di test)
    expect(captured[0]).toMatchObject({ actorId: 'u1', actorEmail: 'u1@test.local', requestId: 'rid-9', ip: 'unknown', userAgent: 'bot/2' })
  })

  test('ip diambil dari c.get("clientIp") bila requestLog sudah menetapkannya', async () => {
    const captured: NewAuditLog[] = []
    const app = new Hono<AppEnv>()
    app.get('/x', async (c) => {
      c.set('clientIp', '7.7.7.7')
      await auditFromContext(c, { action: 'note.updated' }, { write: async (r) => void captured.push(r) })
      return c.text('ok')
    })
    await app.fetch(new Request('http://x/x', { headers: { 'x-real-ip': '1.1.1.1' } }))
    expect(captured[0]!.ip).toBe('7.7.7.7')
  })
})

describe('withAuthAudit — helper', () => {
  test('emailFromVerificationToken: JWT valid → email; selain itu undefined', () => {
    const payload = Buffer.from(JSON.stringify({ email: 'tok@test.local' })).toString('base64url')
    expect(emailFromVerificationToken(`h.${payload}.s`)).toBe('tok@test.local')
    expect(emailFromVerificationToken(null)).toBeUndefined()
    expect(emailFromVerificationToken('tanpa-titik')).toBeUndefined()
    expect(emailFromVerificationToken('h.!!!bukan-json.s')).toBeUndefined()
    const noEmail = Buffer.from(JSON.stringify({ sub: 1 })).toString('base64url')
    expect(emailFromVerificationToken(`h.${noEmail}.s`)).toBeUndefined()
  })

  test('path tak terdaftar diteruskan tanpa audit; path terdaftar mencatat status gagal', async () => {
    const captured: NewAuditLog[] = []
    const write = async (r: NewAuditLog) => void captured.push(r)
    const app = new Hono<AppEnv>()
    app.all(
      '/api/auth/*',
      withAuthAudit(async (req) => {
        const url = new URL(req.url)
        if (url.pathname.endsWith('/verify-email')) {
          return new Response(null, { status: 302, headers: { location: `${url.searchParams.get('callbackURL')}?error=invalid_token` } })
        }
        if (url.pathname.endsWith('/sign-in/email')) return Response.json({ message: 'nope' }, { status: 401 })
        return new Response('passthrough')
      }, { write }),
    )
    const r1 = await app.fetch(new Request('http://x/api/auth/get-session'))
    expect(await r1.text()).toBe('passthrough')
    expect(captured.length).toBe(0)

    // redirect dengan ?error= → gagal, email dari token masuk metadata
    const payload = Buffer.from(JSON.stringify({ email: 'v@test.local' })).toString('base64url')
    await app.fetch(new Request(`http://x/api/auth/verify-email?token=h.${payload}.s&callbackURL=http://web/verify`))
    expect(captured[0]).toMatchObject({ action: 'auth.email_verified', success: false, metadata: { email: 'v@test.local', status: 302 } })

    // body bukan JSON → metadata hanya status
    await app.fetch(new Request('http://x/api/auth/sign-in/email', { method: 'POST', body: 'x=1', headers: { 'content-type': 'text/plain' } }))
    expect(captured[1]).toMatchObject({ action: 'auth.sign_in', success: false, actorId: null, metadata: { status: 401 } })

    // body JSON rusak + bearer rusak → tetap diaudit, tanpa pelaku/metadata body
    await app.fetch(
      new Request('http://x/api/auth/sign-out', {
        method: 'POST',
        body: '{rusak',
        headers: { 'content-type': 'application/json', authorization: 'Bearer a.b.c' },
      }),
    )
    expect(captured[2]).toMatchObject({ action: 'auth.sign_out', success: true, actorId: null })

    // respons JSON rusak → pelaku tidak bisa dibaca
    const app3 = new Hono<AppEnv>()
    app3.all(
      '/api/auth/*',
      withAuthAudit(async () => new Response('{rusak', { headers: { 'content-type': 'application/json' } }), { write }),
    )
    await app3.fetch(new Request('http://x/api/auth/sign-up/email', { method: 'POST' }))
    expect(captured[3]).toMatchObject({ action: 'auth.sign_up', success: true, actorId: null })

    // Location tidak valid → dianggap tidak gagal
    const app2 = new Hono<AppEnv>()
    app2.all('/api/auth/*', withAuthAudit(async () => new Response(null, { status: 302, headers: { location: 'http://[::1' } }), { write }))
    await app2.fetch(new Request('http://x/api/auth/verify-email'))
    expect(captured[4]!.success).toBe(true)
  })

  test('daftar path yang diaudit mencakup aksi inti', () => {
    for (const p of ['/sign-in/email', '/sign-out', '/reset-password', '/two-factor/verify-totp', '/admin/set-role']) {
      expect(AUDITED_AUTH_PATHS).toContain(p)
    }
  })
})

describe('Audit via app — notes', () => {
  test('buat, ubah, hapus catatan → 3 entri dengan pelaku & requestId', async () => {
    const u = await signUp()
    const created = await call('/api/notes', { method: 'POST', cookie: u.cookie, body: JSON.stringify({ title: 'Audit' }) })
    const requestId = created.headers.get('x-request-id')
    const note = (await readJson(created)).data
    await call(`/api/notes/${note.id}`, { method: 'PATCH', cookie: u.cookie, body: JSON.stringify({ done: true }) })
    await call(`/api/notes/${note.id}`, { method: 'DELETE', cookie: u.cookie })

    const rows = await db.select().from(auditLog).where(eq(auditLog.actorId, u.user.id)).orderBy(auditLog.at)
    const actions = rows.map((r) => r.action)
    expect(actions).toEqual(expect.arrayContaining(['note.created', 'note.updated', 'note.deleted']))
    const c = rows.find((r) => r.action === 'note.created')!
    expect(c.requestId).toBe(requestId)
    expect(c.targetId).toBe(note.id)
    expect(rows.find((r) => r.action === 'note.updated')!.metadata).toEqual({ fields: ['done'] })
  })
})
