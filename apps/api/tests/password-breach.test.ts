/**
 * Plugin Have I Been Pwned: password yang muncul di kebocoran publik ditolak.
 * Permintaan ke api.pwnedpasswords.com di-stub (k-anonymity: hanya 5 karakter awal SHA-1 dikirim).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { createAuth } from '../src/auth.ts'
import { MemoryMailer } from '../src/lib/mailer.ts'
import { ORIGIN, json } from './helpers.ts'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

// SHA-1("password123") = CBFDAC6008F9CAB4083784CBD1874F76618D2A97
const PREFIX = 'CBFDA'
const SUFFIX = 'C6008F9CAB4083784CBD1874F76618D2A97'

function stubHibp(body: string) {
  const seen: string[] = []
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input)
    if (url.includes('pwnedpasswords.com')) {
      seen.push(url)
      return new Response(body, { status: 200, headers: { 'content-type': 'text/plain' } })
    }
    return originalFetch(input, init)
  }) as typeof fetch
  return seen
}

const signUp = (auth: ReturnType<typeof createAuth>, email: string, password: string) =>
  auth.handler(
    new Request(`${ORIGIN}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      body: json({ email, password, name: 'Breach' }),
    }),
  )

describe('password bocor (HIBP)', () => {
  test('password yang ada di daftar bocor → 400 PASSWORD_COMPROMISED dengan pesan Indonesia; hanya prefix hash dikirim', async () => {
    const auth = createAuth({ passwordBreachCheck: true, mailer: new MemoryMailer(), rateLimit: false })
    const seen = stubHibp(`0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n${SUFFIX}:12345\r\n`)
    const res = await signUp(auth, `breach-${Date.now()}@test.local`, 'password123')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string; message: string }
    expect(body.code).toBe('PASSWORD_COMPROMISED')
    expect(body.message).toContain('kebocoran data publik')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toContain(`/range/${PREFIX}`)
    expect(seen[0]).not.toContain(SUFFIX)
  })

  test('password tidak ada di daftar → sign-up berhasil', async () => {
    const auth = createAuth({ passwordBreachCheck: true, mailer: new MemoryMailer(), rateLimit: false })
    stubHibp('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\n')
    const res = await signUp(auth, `safe-${Date.now()}@test.local`, 'password123')
    expect(res.status).toBe(200)
  })

  test('passwordBreachCheck: false (default saat test) → tidak memanggil HIBP', async () => {
    const auth = createAuth({ passwordBreachCheck: false, mailer: new MemoryMailer(), rateLimit: false })
    const seen = stubHibp(`${SUFFIX}:12345\r\n`)
    const res = await signUp(auth, `nocheck-${Date.now()}@test.local`, 'password123')
    expect(res.status).toBe(200)
    expect(seen).toHaveLength(0)
  })
})
