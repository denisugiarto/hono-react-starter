import type { Logger } from './logger.ts'

/**
 * Abstraksi cache key-value ber-TTL — pola yang sama dengan `Mailer`:
 * satu interface, implementasi dipilih dari env (CACHE_PROVIDER).
 *
 *   memory  → proses ini saja (dev, test, satu instance)
 *   redis   → dibagi antar instance (production multi-replica), client bawaan Bun
 *
 * Semua operasi fail-open: cache yang bermasalah tidak boleh menjatuhkan request —
 * error dicatat, lalu dianggap cache miss.
 */
export interface Cache {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}

export type MemoryCacheOptions = {
  /** Batas entri; yang paling lama dimasukkan dibuang lebih dulu. Default 1000. */
  maxEntries?: number
  /** Sumber waktu (ms) — diganti di test. */
  now?: () => number
}

type Entry = { value: unknown; expiresAt: number }

/** Cache di memori proses dengan TTL dan batas ukuran (eviksi FIFO). */
export class MemoryCache implements Cache {
  private readonly entries = new Map<string, Entry>()
  private readonly maxEntries: number
  private readonly now: () => number

  constructor(options: MemoryCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000
    this.now = options.now ?? Date.now
  }

  get size(): number {
    return this.entries.size
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      this.entries.delete(key)
      return
    }
    // Hapus dulu agar entri yang ditulis ulang pindah ke urutan terbaru (Map menjaga urutan insert)
    this.entries.delete(key)
    this.entries.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 })
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }
}

/** Subset API `Bun.RedisClient` yang dipakai — memudahkan fake di test. */
export type RedisLike = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ex: 'EX', seconds: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

export type RedisCacheOptions = {
  /** Prefix key agar satu Redis bisa dipakai beberapa aplikasi. Default "hrs:". */
  prefix?: string
  log?: Pick<Logger, 'warn'>
}

/** Cache di Redis (nilai disimpan sebagai JSON). Error → dicatat, dianggap miss. */
export class RedisCache implements Cache {
  private readonly client: RedisLike
  private readonly prefix: string
  private readonly log?: Pick<Logger, 'warn'>

  constructor(client: RedisLike, options: RedisCacheOptions = {}) {
    this.client = client
    this.prefix = options.prefix ?? 'hrs:'
    this.log = options.log
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.client.get(this.prefix + key)
      return raw === null ? undefined : (JSON.parse(raw) as T)
    } catch (err) {
      this.log?.warn('cache get gagal', { key, err })
      return undefined
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return this.delete(key)
    try {
      await this.client.set(this.prefix + key, JSON.stringify(value), 'EX', Math.ceil(ttlSeconds))
    } catch (err) {
      this.log?.warn('cache set gagal', { key, err })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.prefix + key)
    } catch (err) {
      this.log?.warn('cache delete gagal', { key, err })
    }
  }
}

export type CacheConfig = { provider: 'memory' } | { provider: 'redis'; url: string }

export type CreateCacheDeps = {
  log?: Pick<Logger, 'warn'>
  /** Pabrik client Redis — default `new Bun.RedisClient(url)`; diganti di test. */
  redisClient?: (url: string) => RedisLike
}

/** Bangun cache sesuai konfigurasi (lihat readCacheConfig di env.ts). */
export function createCache(config: CacheConfig, deps: CreateCacheDeps = {}): Cache {
  if (config.provider === 'redis') {
    const client = deps.redisClient ? deps.redisClient(config.url) : new Bun.RedisClient(config.url)
    return new RedisCache(client, { log: deps.log })
  }
  return new MemoryCache()
}

/**
 * Cache-aside: kembalikan nilai dari cache, atau hitung lewat `compute` lalu simpan.
 *
 *   const users = await cached(cache, 'admin:users', 30, () => db.select()…)
 */
export async function cached<T>(cache: Cache, key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key)
  if (hit !== undefined) return hit
  const value = await compute()
  await cache.set(key, value, ttlSeconds)
  return value
}
