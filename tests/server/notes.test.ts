import { beforeAll, describe, expect, test } from 'bun:test'
import { call, json, readJson, signUp } from './helpers.ts'

let alice: Awaited<ReturnType<typeof signUp>>
let bob: Awaited<ReturnType<typeof signUp>>

beforeAll(async () => {
  alice = await signUp({ name: 'Alice' })
  bob = await signUp({ name: 'Bob' })
})

describe('Notes — wajib login', () => {
  test('tanpa sesi → 401 untuk semua method', async () => {
    for (const [method, path] of [
      ['GET', '/api/notes'],
      ['POST', '/api/notes'],
      ['PATCH', '/api/notes/00000000-0000-0000-0000-000000000000'],
      ['DELETE', '/api/notes/00000000-0000-0000-0000-000000000000'],
    ] as const) {
      const res = await call(path, { method, body: method === 'GET' ? undefined : json({}) })
      expect(res.status).toBe(401)
      expect((await readJson(res)).code).toBe('UNAUTHORIZED')
    }
  })
})

describe('Notes — CRUD per-user', () => {
  let noteId: string

  test('POST membuat note milik user yang login', async () => {
    const res = await call('/api/notes', {
      method: 'POST',
      cookie: alice.cookie,
      body: json({ title: '  Belajar Drizzle  ', content: 'catatan' }),
    })
    expect(res.status).toBe(201)
    const note = await readJson(res)
    expect(note.title).toBe('Belajar Drizzle') // trim dari schema shared
    expect(note.userId).toBe(alice.user.id)
    expect(note.done).toBe(false)
    noteId = note.id
  })

  test('POST validasi: title kosong → 400 VALIDATION_ERROR', async () => {
    const res = await call('/api/notes', {
      method: 'POST',
      cookie: alice.cookie,
      body: json({ title: '' }),
    })
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details.title).toBeArray()
  })

  test('GET hanya mengembalikan note milik sendiri', async () => {
    const mine = await readJson(await call('/api/notes', { cookie: alice.cookie }))
    expect(mine.map((n: { id: string }) => n.id)).toContain(noteId)

    const theirs = await readJson(await call('/api/notes', { cookie: bob.cookie }))
    expect(theirs).toEqual([])
  })

  test('PATCH oleh pemilik → 200, oleh user lain → 404', async () => {
    const ok = await call(`/api/notes/${noteId}`, {
      method: 'PATCH',
      cookie: alice.cookie,
      body: json({ done: true }),
    })
    expect(ok.status).toBe(200)
    expect((await readJson(ok)).done).toBe(true)

    const denied = await call(`/api/notes/${noteId}`, {
      method: 'PATCH',
      cookie: bob.cookie,
      body: json({ done: false }),
    })
    expect(denied.status).toBe(404)
  })

  test('DELETE oleh user lain → 404, oleh pemilik → 200, lalu 404', async () => {
    const denied = await call(`/api/notes/${noteId}`, { method: 'DELETE', cookie: bob.cookie })
    expect(denied.status).toBe(404)

    const ok = await call(`/api/notes/${noteId}`, { method: 'DELETE', cookie: alice.cookie })
    expect(ok.status).toBe(200)
    expect(await readJson<{ deleted: boolean }>(ok)).toEqual({ deleted: true })

    const gone = await call(`/api/notes/${noteId}`, { method: 'DELETE', cookie: alice.cookie })
    expect(gone.status).toBe(404)
  })
})

describe('Notes — regresi', () => {
  test('PATCH hanya done tidak menghapus content', async () => {
    const created = await readJson(
      await call('/api/notes', {
        method: 'POST',
        cookie: alice.cookie,
        body: json({ title: 'Dengan isi', content: 'isi penting' }),
      }),
    )

    const patched = await readJson(
      await call(`/api/notes/${created.id}`, {
        method: 'PATCH',
        cookie: alice.cookie,
        body: json({ done: true }),
      }),
    )

    expect(patched.done).toBe(true)
    expect(patched.content).toBe('isi penting')
  })
})

describe('Notes — id bukan UUID', () => {
  test('PATCH / DELETE dengan id tidak valid → 404 (bukan 500)', async () => {
    const patch = await call('/api/notes/bukan-uuid', {
      method: 'PATCH',
      cookie: alice.cookie,
      body: json({ done: true }),
    })
    expect(patch.status).toBe(404)
    const del = await call('/api/notes/123', { method: 'DELETE', cookie: alice.cookie })
    expect(del.status).toBe(404)
  })
})

describe('Notes — body bukan JSON', () => {
  test('POST / PATCH dengan body rusak → 400 VALIDATION_ERROR', async () => {
    const post = await call('/api/notes', { method: 'POST', cookie: alice.cookie, body: '{rusak' })
    expect(post.status).toBe(400)
    expect((await readJson(post)).code).toBe('VALIDATION_ERROR')

    const patch = await call('/api/notes/11111111-1111-1111-1111-111111111111', {
      method: 'PATCH',
      cookie: alice.cookie,
      body: '{rusak',
    })
    expect(patch.status).toBe(400)
  })
})
