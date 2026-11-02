import { afterEach, describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { api, buildUrl, DEFAULT_TIMEOUT_MS, isApiError, toApiError } from '../../src/lib/api/client.ts'
import { ApiError } from '../../src/lib/api/request.ts'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const stub = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as typeof fetch
}
const okJson = (data: unknown) => Response.json({ success: true, data })

describe('buildUrl', () => {
  test('melewati null/undefined, array jadi key berulang, path dengan ? digabung &', () => {
    expect(buildUrl('/api/notes')).toBe('/api/notes')
    expect(buildUrl('/api/notes', { page: 2, q: 'a b', skip: null, none: undefined, tag: ['x', 'y'], done: false })).toBe(
      '/api/notes?page=2&q=a+b&tag=x&tag=y&done=false',
    )
    expect(buildUrl('/api/x?v=1', { page: 1 })).toBe('/api/x?v=1&page=1')
    expect(buildUrl('/api/x', { a: undefined })).toBe('/api/x')
  })
})

describe('api.*', () => {
  test('get dengan query + schema; signal timeout terpasang', async () => {
    let seen: { url: string; init?: RequestInit } | undefined
    stub((url, init) => {
      seen = { url, init }
      return okJson([{ id: '1' }])
    })
    const data = await api.get('/api/notes', { query: { page: 1 }, schema: z.array(z.object({ id: z.string() })) })
    expect(data).toEqual([{ id: '1' }])
    expect(seen?.url).toBe('/api/notes?page=1')
    expect(seen?.init?.method).toBe('GET')
    expect(seen?.init?.signal).toBeInstanceOf(AbortSignal)
    expect(DEFAULT_TIMEOUT_MS).toBe(15_000)
  })
  test('post/put/patch/delete mengirim body JSON & method', async () => {
    const calls: Array<{ method?: string; body?: unknown }> = []
    stub((_url, init) => {
      calls.push({ method: init?.method, body: init?.body })
      return okJson({ ok: true })
    })
    await api.post('/x', { a: 1 })
    await api.put('/x', { b: 2 }, { timeoutMs: 0 })
    await api.patch('/x', { c: 3 })
    await api.delete('/x')
    expect(calls.map((c) => c.method)).toEqual(['POST', 'PUT', 'PATCH', 'DELETE'])
    expect(calls[0]?.body).toBe('{"a":1}')
    expect(calls[3]?.body).toBeUndefined()
  })
  test('schema gagal → error zod diteruskan sebagai ApiError UNKNOWN_ERROR', async () => {
    stub(() => okJson({ id: 1 }))
    const err = await api.get('/x', { schema: z.object({ id: z.string() }) }).catch((e) => e)
    expect(isApiError(err, 'UNKNOWN_ERROR')).toBe(true)
  })
  test('ApiError server diteruskan apa adanya; isApiError dengan kode', async () => {
    stub(() => Response.json({ success: false, code: 'UNAUTHORIZED', message: 'Masuk dulu' }, { status: 401 }))
    const err = await api.get('/x').catch((e) => e)
    expect(isApiError(err)).toBe(true)
    expect(isApiError(err, 'UNAUTHORIZED')).toBe(true)
    expect(isApiError(err, 'FORBIDDEN')).toBe(false)
    expect(isApiError(new Error('x'))).toBe(false)
  })
  test('gagal jaringan → NETWORK_ERROR; timeout → TIMEOUT', async () => {
    stub(() => {
      throw new TypeError('Failed to fetch')
    })
    const net = await api.get('/x').catch((e) => e)
    expect(isApiError(net, 'NETWORK_ERROR')).toBe(true)

    stub((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))))
    const timeout = await api.get('/x', { timeoutMs: 5 }).catch((e) => e)
    expect(isApiError(timeout, 'TIMEOUT')).toBe(true)
  })
  test('signal pemanggil digabung dengan timeout (AbortSignal.any)', async () => {
    const controller = new AbortController()
    stub((_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason))))
    const pending = api.get('/x', { signal: controller.signal })
    controller.abort()
    const err = await pending.catch((e) => e)
    expect(isApiError(err, 'ABORTED')).toBe(true)
  })
})

describe('toApiError', () => {
  test('memetakan berbagai jenis error', () => {
    const apiErr = new ApiError('x', 400, 'C')
    expect(toApiError(apiErr)).toBe(apiErr)
    expect(toApiError(Object.assign(new Error('t'), { name: 'TimeoutError' })).code).toBe('TIMEOUT')
    expect(toApiError(Object.assign(new Error('a'), { name: 'AbortError' })).code).toBe('ABORTED')
    expect(toApiError(new TypeError('net')).code).toBe('NETWORK_ERROR')
    expect(toApiError(new Error('lain')).code).toBe('UNKNOWN_ERROR')
    expect(toApiError('string').message).toBe('Terjadi kesalahan')
  })
})
