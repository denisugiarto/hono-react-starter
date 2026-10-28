import { apiResponseSchema, type ApiSuccessBody } from '@hono-react-starter/shared'

/**
 * Error dari API dengan kode mesin (mis. UNAUTHORIZED, VALIDATION_ERROR).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, status: number, code = 'HTTP_ERROR', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Helper fetch terpusat untuk endpoint /api/* dengan envelope standar
 * (lihat packages/shared/src/api.ts): same-origin, JSON, dan membaca `code`/`message`
 * dari body error — bukan hanya HTTP status.
 *
 * Mengembalikan envelope sukses utuh ({ success, data, message }).
 */
export async function requestEnvelope<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiSuccessBody<T>> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  const parsed = apiResponseSchema.safeParse(await res.json().catch(() => null))
  if (!parsed.success) {
    // Bukan envelope kita (mis. proxy error) → pakai HTTP status
    throw new ApiError(`HTTP ${res.status}`, res.status)
  }
  if (!parsed.data.success) {
    throw new ApiError(parsed.data.message, res.status, parsed.data.code, parsed.data.details)
  }
  return parsed.data as ApiSuccessBody<T>
}

/** Seperti requestEnvelope, tetapi hanya mengembalikan `data`. */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  return (await requestEnvelope<T>(url, init)).data
}

/**
 * Pesan error untuk ditampilkan ke pengguna. Bila server menyertakan
 * `details.requestId` (error 500), ID ikut ditampilkan agar pengguna bisa
 * melaporkannya dan tim mencocokkannya dengan log server.
 */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const details = err.details as { requestId?: unknown } | undefined
    const requestId = details && typeof details.requestId === 'string' ? details.requestId : null
    return requestId ? `${err.message} (ref: ${requestId})` : err.message
  }
  if (err instanceof Error) return err.message
  return 'Terjadi kesalahan'
}
