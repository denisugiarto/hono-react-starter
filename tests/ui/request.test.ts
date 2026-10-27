import { afterEach, describe, expect, test } from 'bun:test'
import { ApiError, request } from '../../src/lib/api/request.ts'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const stub = (res: Response, capture?: (init?: RequestInit) => void) => {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capture?.(init)
    return res
  }) as typeof fetch
}

describe('request()', () => {
  test('sukses → JSON, header Accept + Content-Type saat ada body', async () => {
    let init: RequestInit | undefined
    stub(Response.json({ ok: true }), (i) => (init = i))
    const data = await request<{ ok: boolean }>('/x', { method: 'POST', body: '{}' })
    expect(data.ok).toBe(true)
    const headers = init?.headers as Record<string, string>
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.credentials).toBe('same-origin')
  })

  test('error sesuai kontrak → ApiError dengan code & details', async () => {
    stub(Response.json({ error: 'Data tidak valid', code: 'VALIDATION_ERROR', details: { title: ['x'] } }, { status: 400 }))
    try {
      await request('/x')
      throw new Error('harus melempar')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const e = err as ApiError
      expect(e.status).toBe(400)
      expect(e.code).toBe('VALIDATION_ERROR')
      expect(e.details).toEqual({ title: ['x'] })
      expect(e.name).toBe('ApiError')
    }
  })

  test('error tanpa body JSON → ApiError "HTTP <status>"', async () => {
    stub(new Response('boom', { status: 502 }))
    await expect(request('/x')).rejects.toMatchObject({ message: 'HTTP 502', status: 502 })
  })
})
