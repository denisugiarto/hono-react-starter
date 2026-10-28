import { describe, expect, test } from 'bun:test'
import { createAuth } from '../src/auth.ts'
import { ORIGIN } from './helpers.ts'

/**
 * Rate limit Better Auth (AUTH_RATE_LIMIT_*): per IP per endpoint, /get-session dikecualikan.
 * Dipakai instance terpisah (createAuth) agar `auth` utama tetap tanpa limiter saat test.
 */
describe('Better Auth rate limit', () => {
  const limited = createAuth({ rateLimit: { max: 2, windowSeconds: 60 } })
  const ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
  const req = (path: string, init: RequestInit = {}) =>
    limited.handler(
      new Request(`${ORIGIN}/api/auth${path}`, {
        ...init,
        headers: { Origin: ORIGIN, 'x-forwarded-for': ip, ...(init.headers ?? {}) },
      }),
    )

  test('endpoint melebihi max → 429; get-session tetap bebas', async () => {
    // /token tidak punya aturan khusus Better Auth (sign-in/sign-up punya: 3 per 10 detik),
    // jadi mencerminkan AUTH_RATE_LIMIT_MAX apa adanya.
    const statuses: number[] = []
    for (let i = 0; i < 3; i++) statuses.push((await req('/token')).status)
    expect(statuses.slice(0, 2)).toEqual([401, 401])
    expect(statuses[2]).toBe(429)

    for (let i = 0; i < 5; i++) expect((await req('/get-session')).status).toBe(200)
  })

  test('rateLimit: false → tanpa 429', async () => {
    const open = createAuth({ rateLimit: false })
    for (let i = 0; i < 4; i++) {
      const res = await open.handler(
        new Request(`${ORIGIN}/api/auth/token`, { headers: { Origin: ORIGIN, 'x-forwarded-for': ip } }),
      )
      expect(res.status).toBe(401)
    }
  })
})
