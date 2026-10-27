import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  envIsProd,
  envIsTest,
  readAuthSecret,
  readBaseUrl,
  readDatabaseUrl,
  readPort,
} from '../../src/server/env.ts'

const KEYS = ['NODE_ENV', 'DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'PORT'] as const
const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {}

beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k]
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

const asProd = () => {
  process.env.NODE_ENV = 'production'
}

describe('env — mode', () => {
  test('envIsProd / envIsTest mengikuti NODE_ENV saat dipanggil', () => {
    process.env.NODE_ENV = 'test'
    expect(envIsTest()).toBe(true)
    expect(envIsProd()).toBe(false)
    asProd()
    expect(envIsProd()).toBe(true)
    expect(envIsTest()).toBe(false)
  })
})

describe('env — DATABASE_URL', () => {
  test('dipakai apa adanya bila ada', () => {
    process.env.DATABASE_URL = 'postgresql://x/y'
    expect(readDatabaseUrl()).toBe('postgresql://x/y')
  })
  test('default lokal di dev, fail-fast di production', () => {
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = 'development'
    expect(readDatabaseUrl()).toBe('postgresql://localhost:5432/hono_react_starter')
    asProd()
    expect(() => readDatabaseUrl()).toThrow(/DATABASE_URL wajib/)
  })
})

describe('env — BETTER_AUTH_SECRET', () => {
  test('kosong → error, pendek → error, valid → nilai', () => {
    delete process.env.BETTER_AUTH_SECRET
    expect(() => readAuthSecret()).toThrow(/BETTER_AUTH_SECRET wajib/)
    process.env.BETTER_AUTH_SECRET = 'pendek'
    expect(() => readAuthSecret()).toThrow(/terlalu pendek \(6 < 32/)
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32)
    expect(readAuthSecret()).toBe('x'.repeat(32))
  })
})

describe('env — BETTER_AUTH_URL', () => {
  test('dev tanpa nilai → http://localhost:PORT', () => {
    delete process.env.BETTER_AUTH_URL
    process.env.NODE_ENV = 'development'
    process.env.PORT = '4321'
    expect(readBaseUrl()).toBe('http://localhost:4321')
  })
  test('production tanpa nilai → error', () => {
    delete process.env.BETTER_AUTH_URL
    asProd()
    expect(() => readBaseUrl()).toThrow(/BETTER_AUTH_URL wajib/)
  })
  test('URL tidak valid → error', () => {
    process.env.BETTER_AUTH_URL = 'bukan url'
    expect(() => readBaseUrl()).toThrow(/bukan URL valid/)
  })
  test('production harus https', () => {
    process.env.BETTER_AUTH_URL = 'http://app.example.com'
    asProd()
    expect(() => readBaseUrl()).toThrow(/harus https/)
    process.env.BETTER_AUTH_URL = 'https://app.example.com/path?x=1'
    expect(readBaseUrl()).toBe('https://app.example.com') // hanya origin
  })
})

describe('env — PORT', () => {
  test('default 3000; valid; tidak valid → error', () => {
    delete process.env.PORT
    expect(readPort()).toBe(3000)
    process.env.PORT = '8080'
    expect(readPort()).toBe(8080)
    for (const bad of ['abc', '0', '70000', '12.5']) {
      process.env.PORT = bad
      expect(() => readPort()).toThrow(/PORT bukan port valid/)
    }
  })
})

describe('env — API_RATE_LIMIT_*', () => {
  const RL = ['API_RATE_LIMIT_MAX', 'API_RATE_LIMIT_WINDOW'] as const
  const savedRl: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of RL) savedRl[k] = process.env[k]
  })
  afterEach(() => {
    for (const k of RL) {
      if (savedRl[k] === undefined) delete process.env[k]
      else process.env[k] = savedRl[k]
    }
  })

  test('test env tanpa nilai → nonaktif; dev tanpa nilai → 100/60', async () => {
    const { readApiRateLimit } = await import('../../src/server/env.ts')
    delete process.env.API_RATE_LIMIT_MAX
    delete process.env.API_RATE_LIMIT_WINDOW
    process.env.NODE_ENV = 'test'
    expect(readApiRateLimit()).toBe(false)
    process.env.NODE_ENV = 'development'
    expect(readApiRateLimit()).toEqual({ max: 100, windowSeconds: 60 })
  })

  test('nilai eksplisit; 0 → nonaktif; tidak valid → error', async () => {
    const { readApiRateLimit } = await import('../../src/server/env.ts')
    process.env.API_RATE_LIMIT_MAX = '10'
    process.env.API_RATE_LIMIT_WINDOW = '5'
    expect(readApiRateLimit()).toEqual({ max: 10, windowSeconds: 5 })
    process.env.API_RATE_LIMIT_MAX = '0'
    expect(readApiRateLimit()).toBe(false)
    process.env.API_RATE_LIMIT_MAX = '-1'
    expect(() => readApiRateLimit()).toThrow(/API_RATE_LIMIT_MAX/)
    process.env.API_RATE_LIMIT_MAX = '10'
    process.env.API_RATE_LIMIT_WINDOW = '0'
    expect(() => readApiRateLimit()).toThrow(/API_RATE_LIMIT_WINDOW/)
    process.env.API_RATE_LIMIT_WINDOW = 'abc'
    expect(() => readApiRateLimit()).toThrow(/API_RATE_LIMIT_WINDOW/)
  })
})
