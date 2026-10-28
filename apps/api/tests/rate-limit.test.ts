import path from 'node:path'
import { beforeEach, describe, expect, test } from 'bun:test'
import { createApp } from '../src/app.ts'
import {
  DrizzleRateLimitStore,
  clientIp,
  defaultRateLimitSkip,
} from '../src/middleware/rate-limit.ts'
import { ORIGIN } from './helpers.ts'

let ipCounter = 0
const freshIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('DrizzleRateLimitStore', () => {
  const store = new DrizzleRateLimitStore({ prefix: 'test:' })
  beforeEach(async () => {
    store.init({ windowMs: 60_000 })
    await store.resetAll()
  })

  test('increment menghitung per key dengan resetTime tetap dalam satu jendela', async () => {
    const a1 = await store.increment('k1')
    const a2 = await store.increment('k1')
    const b1 = await store.increment('k2')
    expect(a1.totalHits).toBe(1)
    expect(a2.totalHits).toBe(2)
    expect(b1.totalHits).toBe(1)
    expect(a2.resetTime?.getTime()).toBe(a1.resetTime?.getTime())
    expect(a1.resetTime!.getTime()).toBeGreaterThan(Date.now() + 55_000)
  })

  test('get, decrement, resetKey', async () => {
    expect(await store.get('k3')).toBeUndefined()
    await store.increment('k3')
    await store.increment('k3')
    expect((await store.get('k3'))?.totalHits).toBe(2)
    await store.decrement('k3')
    expect((await store.get('k3'))?.totalHits).toBe(1)
    await store.decrement('k3')
    await store.decrement('k3') // tidak di bawah 0
    expect((await store.get('k3'))?.totalHits).toBe(0)
    await store.resetKey('k3')
    expect(await store.get('k3')).toBeUndefined()
  })

  test('jendela kedaluwarsa → hitungan mulai dari 1 lagi; cleanup menghapus baris lama', async () => {
    store.init({ windowMs: 60 })
    const first = await store.increment('k4')
    expect(first.totalHits).toBe(1)
    await sleep(90)
    expect(await store.get('k4')).toBeUndefined() // sudah lewat → dianggap tidak ada
    const again = await store.increment('k4')
    expect(again.totalHits).toBe(1)
    expect(again.resetTime!.getTime()).toBeGreaterThan(first.resetTime!.getTime())

    await store.increment('k5')
    await sleep(90)
    const removed = await store.cleanup()
    expect(removed).toBeGreaterThanOrEqual(2)
  })

  test('resetAll hanya menghapus key dengan prefix sendiri', async () => {
    const other = new DrizzleRateLimitStore({ prefix: 'lain:' })
    other.init({ windowMs: 60_000 })
    await other.increment('x')
    await store.increment('x')
    await store.resetAll()
    expect(await store.get('x')).toBeUndefined()
    expect((await other.get('x'))?.totalHits).toBe(1)
    await other.resetAll()
  })

  test('prefix default "api:" dan localKeys false', () => {
    const s = new DrizzleRateLimitStore()
    expect(s.prefix).toBe('api:')
    expect(s.localKeys).toBe(false)
  })
})

describe('clientIp', () => {
  const ctxWith = (headers: Record<string, string>) =>
    ({ req: { raw: new Request(ORIGIN, { headers }) } }) as unknown as Parameters<typeof clientIp>[0]

  test('prioritas: cf-connecting-ip > x-real-ip > x-forwarded-for (pertama) > unknown', () => {
    expect(clientIp(ctxWith({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '2.2.2.2' }))).toBe('1.1.1.1')
    expect(clientIp(ctxWith({ 'x-real-ip': ' 2.2.2.2 ' }))).toBe('2.2.2.2')
    expect(clientIp(ctxWith({ 'x-forwarded-for': '3.3.3.3, 10.0.0.1' }))).toBe('3.3.3.3')
    expect(clientIp(ctxWith({ 'x-forwarded-for': ' , ' }))).toBe('unknown')
    expect(clientIp(ctxWith({}))).toBe('unknown')
  })

  test('defaultRateLimitSkip melewati /api/auth/* dan /api/health', () => {
    const c = (path: string) => ({ req: { path } }) as unknown as Parameters<typeof defaultRateLimitSkip>[0]
    expect(defaultRateLimitSkip(c('/api/auth/token'))).toBe(true)
    expect(defaultRateLimitSkip(c('/api/health'))).toBe(true)
    expect(defaultRateLimitSkip(c('/api/notes'))).toBe(false)
  })
})

describe('Rate limit /api/* (middleware)', () => {
  const store = new DrizzleRateLimitStore({ prefix: 'mw:' })
  // Mode production + distDir fixture agar route non-API (SPA fallback) bisa diuji
  // tanpa bergantung pada hasil build apps/web.
  const app = createApp({
    isProd: true,
    silent: true,
    distDir: path.join(import.meta.dirname, 'fixtures/build'),
    rateLimit: { max: 3, windowSeconds: 60, store },
  })
  const hit = (path: string, ip: string) =>
    app.fetch(new Request(`${ORIGIN}${path}`, { headers: { 'x-real-ip': ip } }))

  test('request ke-4 dalam jendela → 429 + header RateLimit-* & Retry-After', async () => {
    const ip = freshIp()
    for (let i = 1; i <= 3; i++) {
      const res = await hit('/api/hello', ip)
      expect(res.status).toBe(200)
      expect(res.headers.get('ratelimit-limit')).toBe('3')
      expect(res.headers.get('ratelimit-remaining')).toBe(String(3 - i))
    }
    const blocked = await hit('/api/hello', ip)
    expect(blocked.status).toBe(429)
    expect(((await blocked.json()) as { code: string }).code).toBe('RATE_LIMITED')
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(blocked.headers.get('cache-control')).toBe('no-store')
  })

  test('IP berbeda punya kuota sendiri', async () => {
    const a = freshIp()
    const b = freshIp()
    for (let i = 0; i < 3; i++) await hit('/api/hello', a)
    expect((await hit('/api/hello', a)).status).toBe(429)
    expect((await hit('/api/hello', b)).status).toBe(200)
  })

  test('/api/health dan /api/auth/* tidak dihitung', async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) {
      expect((await hit('/api/health', ip)).status).toBe(200)
      expect((await hit('/api/auth/jwks', ip)).status).toBe(200)
    }
    expect((await hit('/api/hello', ip)).status).toBe(200)
  })

  test('route non-API tidak dibatasi', async () => {
    const ip = freshIp()
    for (let i = 0; i < 5; i++) expect((await hit('/halaman', ip)).status).toBe(200)
  })

  test('rateLimit: false → tanpa pembatasan dan tanpa header RateLimit', async () => {
    const open = createApp({ silent: true, rateLimit: false })
    const ip = freshIp()
    for (let i = 0; i < 5; i++) {
      const res = await open.fetch(new Request(`${ORIGIN}/api/hello`, { headers: { 'x-real-ip': ip } }))
      expect(res.status).toBe(200)
      expect(res.headers.get('ratelimit-limit')).toBeNull()
    }
  })

  test('app default saat NODE_ENV=test → limiter nonaktif', async () => {
    const { app: runtimeApp } = await import('../src/app.ts')
    const res = await runtimeApp.fetch(new Request(`${ORIGIN}/api/hello`))
    expect(res.headers.get('ratelimit-limit')).toBeNull()
  })
})
