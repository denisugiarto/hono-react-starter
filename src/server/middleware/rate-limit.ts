import { sql } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { getConnInfo } from 'hono/bun'
import { rateLimiter } from 'hono-rate-limiter'
import { db as defaultDb } from '../db/index.ts'
import { errorBody } from '../lib/response.ts'

type HitInfo = { totalHits: number; resetTime?: Date }
type Db = typeof defaultDb

/**
 * Store hono-rate-limiter berbasis PostgreSQL (tabel `api_rate_limit`).
 * Counter dibagi antar instance/replika dan tahan restart. Increment dilakukan
 * dalam satu statement UPSERT (atomik) sehingga aman untuk request paralel.
 */
export class DrizzleRateLimitStore {
  /** Prefix key agar tidak bentrok dengan limiter lain di tabel yang sama. */
  readonly prefix: string
  /** Key dibagi antar instance (bukan lokal). */
  readonly localKeys = false

  private windowMs = 60_000
  private readonly db: Db

  constructor(options: { db?: Db; prefix?: string } = {}) {
    this.db = options.db ?? defaultDb
    this.prefix = options.prefix ?? 'api:'
  }

  init(options: { windowMs: number }) {
    this.windowMs = options.windowMs
  }

  private k(key: string) {
    return `${this.prefix}${key}`
  }

  async get(key: string): Promise<HitInfo | undefined> {
    const rows = await this.db.execute(
      sql`select hits, reset_at from api_rate_limit where key = ${this.k(key)} and reset_at > now()`,
    )
    const row = rows[0] as { hits: number; reset_at: Date } | undefined
    if (!row) return undefined
    return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) }
  }

  async increment(key: string): Promise<HitInfo> {
    const rows = await this.db.execute(sql`
      insert into api_rate_limit (key, hits, reset_at)
      values (${this.k(key)}, 1, now() + ${this.windowMs}::int * interval '1 millisecond')
      on conflict (key) do update set
        hits = case when api_rate_limit.reset_at <= now() then 1 else api_rate_limit.hits + 1 end,
        reset_at = case
          when api_rate_limit.reset_at <= now()
            then now() + ${this.windowMs}::int * interval '1 millisecond'
          else api_rate_limit.reset_at
        end
      returning hits, reset_at
    `)
    const row = rows[0] as { hits: number; reset_at: Date }
    // Bersihkan baris kedaluwarsa sesekali (≈1% request) agar tabel tidak membengkak.
    if (Math.random() < 0.01) void this.cleanup().catch(() => {})
    return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) }
  }

  async decrement(key: string): Promise<void> {
    await this.db.execute(
      sql`update api_rate_limit set hits = greatest(hits - 1, 0) where key = ${this.k(key)}`,
    )
  }

  async resetKey(key: string): Promise<void> {
    await this.db.execute(sql`delete from api_rate_limit where key = ${this.k(key)}`)
  }

  async resetAll(): Promise<void> {
    await this.db.execute(sql`delete from api_rate_limit where key like ${`${this.prefix}%`}`)
  }

  /** Hapus counter yang jendelanya sudah lewat. */
  async cleanup(): Promise<number> {
    const rows = await this.db.execute(
      sql`delete from api_rate_limit where reset_at <= now() returning key`,
    )
    return rows.length
  }
}

/**
 * IP klien: header proxy (urutan sama dengan konfigurasi Better Auth) lalu
 * alamat koneksi Bun. Di belakang reverse proxy pastikan proxy MENIMPA header
 * ini (bukan meneruskan dari klien) agar tidak bisa dipalsukan.
 */
export function clientIp(c: Context): string {
  const headers = c.req.raw.headers
  const direct = headers.get('cf-connecting-ip') ?? headers.get('x-real-ip')
  if (direct) return direct.trim()
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  try {
    const addr = getConnInfo(c).remote.address
    if (addr) return addr
  } catch {
    // app.fetch dipanggil tanpa server Bun (mis. test) → tidak ada info koneksi
  }
  return 'unknown'
}

export type ApiRateLimitOptions = {
  /** Maksimum request per jendela per IP. */
  max: number
  /** Panjang jendela dalam detik. */
  windowSeconds: number
  /** Store kustom (default: PostgreSQL via Drizzle). */
  store?: DrizzleRateLimitStore
  /** Path yang tidak dihitung. Default: /api/auth/* (punya limiter sendiri) & /api/health. */
  skip?: (c: Context) => boolean
}

export const defaultRateLimitSkip = (c: Context): boolean =>
  c.req.path.startsWith('/api/auth/') || c.req.path === '/api/health'

/**
 * Middleware rate limit untuk /api/*. Mengirim header `RateLimit-*` (draft-6)
 * dan `Retry-After`; saat terlampaui → 429 JSON `RATE_LIMITED`.
 */
export function createApiRateLimiter(options: ApiRateLimitOptions): MiddlewareHandler {
  return rateLimiter({
    windowMs: options.windowSeconds * 1000,
    limit: options.max,
    standardHeaders: 'draft-6',
    keyGenerator: clientIp,
    store: options.store ?? new DrizzleRateLimitStore(),
    skip: options.skip ?? defaultRateLimitSkip,
    handler: (c) => c.json(errorBody('RATE_LIMITED', 'Terlalu banyak request, coba lagi nanti'), 429),
  })
}
