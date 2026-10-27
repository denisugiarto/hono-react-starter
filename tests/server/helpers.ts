import { app } from '../../src/server/app.ts'

export const ORIGIN = 'http://localhost:3000'

/** Panggil app Hono langsung (tanpa membuka port). */
export function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const { cookie, ...rest } = init
  const headers = new Headers(rest.headers)
  headers.set('Origin', ORIGIN)
  if (cookie) headers.set('Cookie', cookie)
  if (rest.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return app.fetch(new Request(`${ORIGIN}${path}`, { ...rest, headers }))
}

export const json = (data: unknown) => JSON.stringify(data)

let counter = 0

/**
 * Daftar user baru via endpoint Better Auth dan kembalikan cookie sesi.
 * Email unik per panggilan agar test saling independen.
 */
export async function signUp(overrides: { name?: string; password?: string } = {}) {
  counter += 1
  const email = `user${counter}-${Date.now()}@test.local`
  const password = overrides.password ?? 'password123'
  const res = await call('/api/auth/sign-up/email', {
    method: 'POST',
    body: json({ email, password, name: overrides.name ?? `User ${counter}` }),
  })
  if (!res.ok) throw new Error(`sign-up gagal: ${res.status} ${await res.text()}`)
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const body = (await res.json()) as { user: { id: string; email: string } }
  return { cookie, email, password, user: body.user }
}

/** Baca body JSON dengan tipe longgar (Bun mengetik `Response.json()` sebagai unknown). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = <T = any>(res: Response): Promise<T> => res.json() as Promise<T>

/** Ambil `data` dari envelope sukses ({ success: true, data, message? }). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readData = async <T = any>(res: Response): Promise<T> => {
  const body = await readJson(res)
  if (body?.success !== true) {
    throw new Error(`Bukan envelope sukses: ${JSON.stringify(body)}`)
  }
  return body.data as T
}
