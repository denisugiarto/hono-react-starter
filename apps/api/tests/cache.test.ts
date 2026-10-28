import { describe, expect, test } from 'bun:test'
import { MemoryCache, RedisCache, cached, createCache, type RedisLike } from '../src/lib/cache.ts'

describe('MemoryCache', () => {
  test('get/set/delete, TTL kedaluwarsa, ttl ≤ 0 menghapus', async () => {
    let now = 1_000_000
    const c = new MemoryCache({ now: () => now })
    expect(await c.get('x')).toBeUndefined()
    await c.set('x', { a: 1 }, 10)
    expect(await c.get<{ a: number }>('x')).toEqual({ a: 1 })
    now += 9_999
    expect(await c.get<{ a: number }>('x')).toEqual({ a: 1 })
    now += 1
    expect(await c.get('x')).toBeUndefined()
    expect(c.size).toBe(0)

    await c.set('y', 1, 10)
    await c.set('y', 2, 0)
    expect(await c.get('y')).toBeUndefined()
    await c.set('z', 1, 10)
    await c.delete('z')
    expect(await c.get('z')).toBeUndefined()
    c.clear()
    expect(c.size).toBe(0)
  })

  test('maxEntries: entri tertua dibuang; set ulang memperbarui urutan', async () => {
    const c = new MemoryCache({ maxEntries: 2 })
    await c.set('a', 1, 60)
    await c.set('b', 2, 60)
    await c.set('a', 11, 60) // a jadi terbaru
    await c.set('c', 3, 60) // b terbuang
    expect(await c.get('b')).toBeUndefined()
    expect(await c.get<number>('a')).toBe(11)
    expect(await c.get<number>('c')).toBe(3)
    expect(c.size).toBe(2)
  })
})

function fakeRedis(opts: { fail?: boolean } = {}) {
  const store = new Map<string, { value: string; ex: number }>()
  const calls: string[] = []
  const client: RedisLike = {
    async get(key) {
      calls.push(`get ${key}`)
      if (opts.fail) throw new Error('redis down')
      return store.get(key)?.value ?? null
    },
    async set(key, value, _ex, seconds) {
      calls.push(`set ${key} ${seconds}`)
      if (opts.fail) throw new Error('redis down')
      store.set(key, { value, ex: seconds })
      return 'OK'
    },
    async del(key) {
      calls.push(`del ${key}`)
      if (opts.fail) throw new Error('redis down')
      store.delete(key)
      return 1
    },
  }
  return { client, store, calls }
}

describe('RedisCache', () => {
  test('JSON round-trip dengan prefix & EX; ttl ≤ 0 → del', async () => {
    const r = fakeRedis()
    const c = new RedisCache(r.client, { prefix: 'app:' })
    await c.set('k', { n: [1, 2] }, 2.2)
    expect(r.store.get('app:k')).toEqual({ value: '{"n":[1,2]}', ex: 3 })
    expect(await c.get<{ n: number[] }>('k')).toEqual({ n: [1, 2] })
    expect(await c.get('lain')).toBeUndefined()
    await c.set('k', 'x', 0)
    expect(r.calls.at(-1)).toBe('del app:k')
    await c.delete('k')
    expect(r.store.size).toBe(0)
  })

  test('fail-open: error Redis → warn, dianggap miss, tidak melempar', async () => {
    const warnings: string[] = []
    const r = fakeRedis({ fail: true })
    const c = new RedisCache(r.client, { log: { warn: (msg: string) => void warnings.push(msg) } })
    await c.set('k', 1, 10)
    expect(await c.get('k')).toBeUndefined()
    await c.delete('k')
    expect(warnings).toEqual(['cache set gagal', 'cache get gagal', 'cache delete gagal'])
  })
})

describe('createCache & cached()', () => {
  test('memory default; redis memakai pabrik client yang disuntik', async () => {
    expect(createCache({ provider: 'memory' })).toBeInstanceOf(MemoryCache)
    const urls: string[] = []
    const r = fakeRedis()
    const c = createCache(
      { provider: 'redis', url: 'redis://cache:6379' },
      {
        redisClient: (url) => {
          urls.push(url)
          return r.client
        },
      },
    )
    expect(c).toBeInstanceOf(RedisCache)
    expect(urls).toEqual(['redis://cache:6379'])
    await c.set('a', 1, 5)
    expect(r.store.has('hrs:a')).toBe(true)
  })

  test('cached(): hitung sekali, berikutnya dari cache; miss setelah kedaluwarsa', async () => {
    let now = 0
    const c = new MemoryCache({ now: () => now })
    let computed = 0
    const compute = async () => ++computed
    expect(await cached(c, 'k', 10, compute)).toBe(1)
    expect(await cached(c, 'k', 10, compute)).toBe(1)
    now = 11_000
    expect(await cached(c, 'k', 10, compute)).toBe(2)
    expect(computed).toBe(2)
  })
})
