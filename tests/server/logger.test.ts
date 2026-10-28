import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  Logger,
  createCapturingSink,
  defaultSink,
  serializeError,
} from '../../src/server/lib/logger.ts'
import { readLogConfig } from '../../src/server/env.ts'

describe('Logger — level & format json', () => {
  test('memfilter berdasarkan level; silent tidak menulis apa pun', () => {
    const { sink, lines } = createCapturingSink()
    const log = new Logger({ level: 'warn', sink })
    log.debug('a')
    log.info('b')
    log.warn('c')
    log.error('d')
    expect(lines.map((l) => l.level)).toEqual(['warn', 'error'])
    expect(log.isEnabled('info')).toBe(false)
    expect(log.isEnabled('error')).toBe(true)

    const quiet = new Logger({ level: 'silent', sink })
    quiet.error('x')
    expect(lines.length).toBe(2)
    expect(quiet.isEnabled('silent')).toBe(false)
  })

  test('baris JSON berisi time, level, msg, base + fields; child menggabungkan konteks', () => {
    const { sink, lines } = createCapturingSink()
    const root = new Logger({ level: 'debug', sink, base: { service: 'api' } })
    const child = root.child({ requestId: 'req-1' })
    child.info('hello', { userId: 'u1' })
    const row = lines[0]!.json()
    expect(row.level).toBe('info')
    expect(row.msg).toBe('hello')
    expect(row.service).toBe('api')
    expect(row.requestId).toBe('req-1')
    expect(row.userId).toBe('u1')
    expect(typeof row.time).toBe('string')
    expect(new Date(row.time as string).getTime()).toBeGreaterThan(0)
    // level & format diwariskan
    expect(child.level).toBe('debug')
    expect(child.format).toBe('json')
  })

  test('field err otomatis diserialisasi (Error mentah maupun yang sudah diratakan)', () => {
    const { sink, lines } = createCapturingSink()
    const log = new Logger({ sink })
    log.error('boom', { err: new RangeError('salah') })
    log.error('boom2', { err: serializeError(new Error('sudah')) })
    const a = lines[0]!.json().err as { name: string; message: string; stack?: string }
    expect(a.name).toBe('RangeError')
    expect(a.message).toBe('salah')
    expect(a.stack).toContain('RangeError')
    const b = lines[1]!.json().err as { name: string }
    expect(b.name).toBe('Error')
  })

  test('default: level info, format json, sink stdout/stderr', () => {
    const log = new Logger()
    expect(log.level).toBe('info')
    expect(log.format).toBe('json')
    const outWrite = process.stdout.write
    const errWrite = process.stderr.write
    const out: string[] = []
    const err: string[] = []
    process.stdout.write = ((s: string) => (out.push(s), true)) as typeof process.stdout.write
    process.stderr.write = ((s: string) => (err.push(s), true)) as typeof process.stderr.write
    try {
      defaultSink('info', '{"a":1}')
      defaultSink('error', '{"b":2}')
      log.info('to stdout')
    } finally {
      process.stdout.write = outWrite
      process.stderr.write = errWrite
    }
    expect(out[0]).toBe('{"a":1}\n')
    expect(err[0]).toBe('{"b":2}\n')
    expect(out[1]).toContain('"msg":"to stdout"')
  })
})

describe('Logger — format pretty', () => {
  test('satu baris key=value; err ditulis multi-baris dengan stack, code, detail, cause', () => {
    const { sink, lines } = createCapturingSink()
    const log = new Logger({ level: 'debug', format: 'pretty', sink })
    log.info('request', { method: 'GET', status: 200, meta: { a: 1 }, skip: undefined })
    expect(lines[0]!.line).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} INFO  request method=GET status=200 meta=\{"a":1\}$/)

    const pg = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (email)=(a@b) already exists.',
      cause: new Error('akar'),
    })
    log.error('db', { err: pg, requestId: 'r1' })
    const text = lines[1]!.line
    expect(text).toContain('ERROR db requestId=r1')
    expect(text).toContain('\n  err: Error: duplicate key')
    expect(text).toContain('\n  code: 23505')
    expect(text).toContain('\n  detail: Key (email)=(a@b) already exists.')
    expect(text).toContain('\n  at ')
    expect(text).toContain('\n  cause: Error: akar')
  })
})

describe('serializeError', () => {
  test('Error: name, message, stack, field ekstra (code/detail/constraint), cause bersarang', () => {
    const inner = new Error('inner')
    const err = Object.assign(new TypeError('outer', { cause: inner }), {
      code: '23503',
      constraint: 'notes_user_id_user_id_fk',
      table: 'notes',
      status: 500,
    })
    const s = serializeError(err)
    expect(s.name).toBe('TypeError')
    expect(s.message).toBe('outer')
    expect(s.stack).toContain('TypeError: outer')
    expect(s.code).toBe('23503')
    expect(s.constraint).toBe('notes_user_id_user_id_fk')
    expect(s.table).toBe('notes')
    expect(s.status).toBe(500)
    expect(s.cause?.message).toBe('inner')
  })

  test('cause dibatasi kedalaman 3 agar tidak rekursif tak hingga', () => {
    let err: Error = new Error('e0')
    for (let i = 1; i <= 6; i++) err = new Error(`e${i}`, { cause: err })
    let depth = 0
    let cur = serializeError(err).cause
    while (cur) {
      depth++
      cur = cur.cause
    }
    expect(depth).toBe(3)
  })

  test('non-Error: string, objek, nilai yang tidak bisa di-JSON-kan', () => {
    expect(serializeError('teks')).toEqual({ name: 'NonError', message: 'teks' })
    expect(serializeError({ a: 1 })).toEqual({ name: 'NonError', message: '{"a":1}' })
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(serializeError(circular).message).toBe('[object Object]')
    expect(serializeError(undefined).message).toBe('undefined')
    const noName = new Error('x')
    noName.name = ''
    expect(serializeError(noName).name).toBe('Error')
  })
})

describe('env — LOG_LEVEL / LOG_FORMAT', () => {
  const KEYS = ['NODE_ENV', 'LOG_LEVEL', 'LOG_FORMAT'] as const
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k]
    delete process.env.LOG_LEVEL
    delete process.env.LOG_FORMAT
  })
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  test('default per lingkungan', () => {
    process.env.NODE_ENV = 'production'
    expect(readLogConfig()).toEqual({ level: 'info', format: 'json' })
    process.env.NODE_ENV = 'test'
    expect(readLogConfig()).toEqual({ level: 'silent', format: 'pretty' })
    process.env.NODE_ENV = 'development'
    expect(readLogConfig()).toEqual({ level: 'debug', format: 'pretty' })
  })

  test('nilai eksplisit & validasi', () => {
    process.env.LOG_LEVEL = 'warn'
    process.env.LOG_FORMAT = 'json'
    expect(readLogConfig()).toEqual({ level: 'warn', format: 'json' })
    process.env.LOG_LEVEL = 'verbose'
    expect(() => readLogConfig()).toThrow(/LOG_LEVEL/)
    process.env.LOG_LEVEL = 'info'
    process.env.LOG_FORMAT = 'xml'
    expect(() => readLogConfig()).toThrow(/LOG_FORMAT/)
  })
})
