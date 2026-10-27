import { afterEach, describe, expect, test } from 'bun:test'
import { ApiError, request, requestEnvelope } from '../../src/lib/api/request.ts'

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

describe('request() / requestEnvelope()', () => {
  test('sukses → data, header Accept + Content-Type saat ada body', async () => {
    let init: RequestInit | undefined
    stub(Response.json({ success: true, data: { ok: true } }), (i) => (init = i))
    const data = await request<{ ok: boolean }>('/x', { method: 'POST', body: '{}' })
    expect(data.ok).toBe(true)
    const headers = init?.headers as Record<string, string>
    expect(headers.Accept).toBe('application/json')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.credentials).toBe('same-origin')
  })

  test('requestEnvelope mengembalikan message dari server', async () => {
    stub(Response.json({ success: true, data: { id: '1' }, message: 'Catatan dibuat' }, { status: 201 }))
    const env = await requestEnvelope<{ id: string }>('/x')
    expect(env.success).toBe(true)
    expect(env.data.id).toBe('1')
    expect(env.message).toBe('Catatan dibuat')
  })

  test('envelope gagal → ApiError dengan code, message & details', async () => {
    stub(
      Response.json(
        { success: false, code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: { title: ['x'] } },
        { status: 400 },
      ),
    )
    try {
      await request('/x')
      throw new Error('harus melempar')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const e = err as ApiError
      expect(e.message).toBe('Data tidak valid')
      expect(e.status).toBe(400)
      expect(e.code).toBe('VALIDATION_ERROR')
      expect(e.details).toEqual({ title: ['x'] })
      expect(e.name).toBe('ApiError')
    }
  })

  test('bukan envelope (mis. proxy error) → ApiError "HTTP <status>" / HTTP_ERROR', async () => {
    stub(new Response('boom', { status: 502 }))
    await expect(request('/x')).rejects.toMatchObject({ message: 'HTTP 502', status: 502, code: 'HTTP_ERROR' })
  })

  test('status 200 tetapi body bukan envelope → tetap error', async () => {
    stub(Response.json({ foo: 1 }))
    await expect(request('/x')).rejects.toMatchObject({ message: 'HTTP 200' })
  })
})
