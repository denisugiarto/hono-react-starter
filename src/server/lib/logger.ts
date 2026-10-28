/**
 * Logger terstruktur tanpa dependency.
 *
 * - Satu baris per event. Format `json` (production, mudah difilter di
 *   Datadog/Loki/CloudWatch) atau `pretty` (development).
 * - `child(fields)` menempelkan konteks (mis. requestId, userId) ke semua baris.
 * - `serializeError()` meratakan Error: name, message, stack, cause, dan field
 *   khas driver Postgres (code, detail, constraint, table) agar mudah ditrace.
 * - warn/error → stderr, info/debug → stdout (12-factor; platform membedakan).
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]
export type LogFormat = 'json' | 'pretty'
export type LogFields = Record<string, unknown>
export type LogSink = (level: Exclude<LogLevel, 'silent'>, line: string) => void

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 }

export const defaultSink: LogSink = (level, line) => {
  const stream = level === 'warn' || level === 'error' ? process.stderr : process.stdout
  stream.write(`${line}\n`)
}

export type LoggerOptions = {
  level?: LogLevel
  format?: LogFormat
  sink?: LogSink
  /** Field yang ikut di setiap baris (mis. service, requestId). */
  base?: LogFields
}

const ERROR_EXTRA_KEYS = [
  'code',
  'detail',
  'hint',
  'constraint',
  'table',
  'column',
  'schema',
  'severity',
  'status',
  'statusCode',
  'errno',
  'syscall',
] as const

export type SerializedError = {
  name: string
  message: string
  stack?: string
  cause?: SerializedError
  [extra: string]: unknown
}

/** Ratakan error apa pun menjadi objek JSON yang informatif. */
export function serializeError(err: unknown, depth = 0): SerializedError {
  if (err instanceof Error) {
    const e = err as Error & Record<string, unknown>
    const out: SerializedError = { name: e.name || 'Error', message: e.message }
    if (typeof e.stack === 'string') out.stack = e.stack
    for (const key of ERROR_EXTRA_KEYS) {
      if (e[key] !== undefined) out[key] = e[key]
    }
    if (e.cause !== undefined && depth < 3) out.cause = serializeError(e.cause, depth + 1)
    return out
  }
  if (typeof err === 'string') return { name: 'NonError', message: err }
  let message: string
  try {
    message = JSON.stringify(err) ?? String(err)
  } catch {
    message = String(err)
  }
  return { name: 'NonError', message }
}

function formatPretty(level: LogLevel, msg: string, fields: LogFields, time: string): string {
  const parts: string[] = [`${time.slice(11, 23)} ${level.toUpperCase().padEnd(5)} ${msg}`]
  const tail: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue
    if (key === 'err' && value && typeof value === 'object') {
      const e = value as SerializedError
      tail.push(`  err: ${e.name}: ${e.message}`)
      if (e.code !== undefined) tail.push(`  code: ${String(e.code)}`)
      if (e.detail !== undefined) tail.push(`  detail: ${String(e.detail)}`)
      if (e.stack) tail.push(...e.stack.split('\n').slice(1).map((l) => `  ${l.trim()}`))
      if (e.cause) tail.push(`  cause: ${e.cause.name}: ${e.cause.message}`)
      continue
    }
    parts.push(`${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
  }
  return tail.length ? `${parts.join(' ')}\n${tail.join('\n')}` : parts.join(' ')
}

export class Logger {
  readonly level: LogLevel
  readonly format: LogFormat
  private readonly sink: LogSink
  private readonly base: LogFields

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info'
    this.format = options.format ?? 'json'
    this.sink = options.sink ?? defaultSink
    this.base = options.base ?? {}
  }

  isEnabled(level: LogLevel): boolean {
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[this.level] && level !== 'silent'
  }

  /** Logger turunan dengan field tambahan (konteks request, dsb). */
  child(fields: LogFields): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      sink: this.sink,
      base: { ...this.base, ...fields },
    })
  }

  debug(msg: string, fields?: LogFields) {
    this.write('debug', msg, fields)
  }
  info(msg: string, fields?: LogFields) {
    this.write('info', msg, fields)
  }
  warn(msg: string, fields?: LogFields) {
    this.write('warn', msg, fields)
  }
  error(msg: string, fields?: LogFields) {
    this.write('error', msg, fields)
  }

  private write(level: Exclude<LogLevel, 'silent'>, msg: string, fields: LogFields = {}) {
    if (!this.isEnabled(level)) return
    const time = new Date().toISOString()
    const merged: LogFields = { ...this.base, ...fields }
    if (merged.err !== undefined && !isSerialized(merged.err)) {
      merged.err = serializeError(merged.err)
    }
    const line =
      this.format === 'json'
        ? JSON.stringify({ time, level, msg, ...merged })
        : formatPretty(level, msg, merged, time)
    this.sink(level, line)
  }
}

function isSerialized(value: unknown): value is SerializedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Error) &&
    typeof (value as SerializedError).name === 'string' &&
    typeof (value as SerializedError).message === 'string'
  )
}

/** Logger in-memory untuk test: kumpulkan baris lalu periksa. */
export function createCapturingSink() {
  const lines: { level: string; line: string; json: () => LogFields }[] = []
  const sink: LogSink = (level, line) => {
    lines.push({ level, line, json: () => JSON.parse(line) as LogFields })
  }
  return { sink, lines }
}
