import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app.ts'
import { ORIGIN } from './helpers.ts'

const WEB = 'https://web.example.com'
const app = createApp({ corsOrigins: [WEB], silent: true, rateLimit: false })
const req = (path: string, init?: RequestInit) => app.fetch(new Request(`${ORIGIN}${path}`, init))

describe('CORS untuk frontend di-host terpisah', () => {
  test('preflight dari origin terpercaya → 204 dengan ACAO + credentials + header yang diizinkan', async () => {
    const res = await req('/api/notes', {
      method: 'OPTIONS',
      headers: { Origin: WEB, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(WEB)
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
    expect(res.headers.get('access-control-allow-methods')).toContain('PATCH')
    expect(res.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('authorization')
    expect(res.headers.get('access-control-max-age')).toBe('86400')
    expect(res.headers.get('vary')?.toLowerCase()).toContain('origin')
  })

  test('request nyata dari origin terpercaya membawa ACAO dan expose X-Request-Id', async () => {
    const res = await req('/api/health', { headers: { Origin: WEB } })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe(WEB)
    expect(res.headers.get('access-control-expose-headers')).toContain('X-Request-Id')
  })

  test('origin lain → tanpa header CORS (browser memblokir), respons tetap diproses', async () => {
    const res = await req('/api/health', { headers: { Origin: 'https://jahat.example' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  test('tanpa header Origin (same-origin) → tidak ada header CORS', async () => {
    const res = await req('/api/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  test('default corsOrigins = TRUSTED_ORIGINS (dev: Vite :5173)', async () => {
    const dev = createApp({ silent: true, rateLimit: false })
    const res = await dev.fetch(new Request(`${ORIGIN}/api/health`, { headers: { Origin: 'http://localhost:5173' } }))
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})
