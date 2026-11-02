import type { ZodType } from 'zod'
import { ApiError, request } from '@/lib/api/request'
import { buildUrl, type QueryParams } from '@/lib/api/url'

export { buildUrl, type QueryParams } from '@/lib/api/url'

export type ApiOptions<T = unknown> = Omit<RequestInit, 'body' | 'method'> & {
  /** Query string (lihat `buildUrl`). */
  query?: QueryParams
  /** Batas waktu; lewat → `ApiError` kode `TIMEOUT`. Default 15 detik, `0` = tanpa batas. */
  timeoutMs?: number
  /** Validasi `data` dengan schema Zod (shared) sebelum dikembalikan. */
  schema?: ZodType<T>
}

export const DEFAULT_TIMEOUT_MS = 15_000

function withTimeout(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal | undefined {
  if (timeoutMs <= 0) return signal ?? undefined
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!signal) return timeout
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal
}

/** Terjemahkan kegagalan `fetch` (jaringan, abort, timeout) menjadi `ApiError` berkode. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof Error) {
    if (err.name === 'TimeoutError') return new ApiError('Waktu tunggu permintaan habis', 0, 'TIMEOUT')
    if (err.name === 'AbortError') return new ApiError('Permintaan dibatalkan', 0, 'ABORTED')
    if (err instanceof TypeError) return new ApiError('Tidak dapat terhubung ke server', 0, 'NETWORK_ERROR')
    return new ApiError(err.message, 0, 'UNKNOWN_ERROR')
  }
  return new ApiError('Terjadi kesalahan', 0, 'UNKNOWN_ERROR')
}

async function call<T>(method: string, path: string, body: unknown, options: ApiOptions<T> = {}): Promise<T> {
  const { query, timeoutMs = DEFAULT_TIMEOUT_MS, schema, signal, ...init } = options
  try {
    const data = await request<unknown>(buildUrl(path, query), {
      ...init,
      method,
      signal: withTimeout(signal, timeoutMs),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return schema ? schema.parse(data) : (data as T)
  } catch (err) {
    throw toApiError(err)
  }
}

/**
 * Klien API ringkas di atas `request()` — mengembalikan `data` saja.
 *   const notes = await api.get('/api/notes', { schema: noteSchema.array() })
 *   await api.post('/api/notes', { title }, { timeoutMs: 5000 })
 * Untuk `message` server (toast sukses) tetap pakai `requestEnvelope`.
 */
export const api = {
  get: <T = unknown>(path: string, options?: ApiOptions<T>) => call<T>('GET', path, undefined, options),
  post: <T = unknown>(path: string, body?: unknown, options?: ApiOptions<T>) => call<T>('POST', path, body, options),
  put: <T = unknown>(path: string, body?: unknown, options?: ApiOptions<T>) => call<T>('PUT', path, body, options),
  patch: <T = unknown>(path: string, body?: unknown, options?: ApiOptions<T>) => call<T>('PATCH', path, body, options),
  delete: <T = unknown>(path: string, options?: ApiOptions<T>) => call<T>('DELETE', path, undefined, options),
}

/** Type guard: `isApiError(err, 'UNAUTHORIZED')`. */
export function isApiError(err: unknown, code?: string): err is ApiError {
  return err instanceof ApiError && (code === undefined || err.code === code)
}
