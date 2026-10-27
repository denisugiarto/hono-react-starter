import { errorResponseSchema } from '@/shared'

/**
 * Error dari API dengan kode mesin (mis. UNAUTHORIZED, VALIDATION_ERROR).
 */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Helper fetch terpusat: same-origin, JSON, dan membaca body error dari API
 * (bukan hanya HTTP status) sesuai kontrak `errorResponseSchema`.
 */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = errorResponseSchema.safeParse(await res.json().catch(() => null))
    if (body.success) {
      throw new ApiError(body.data.error, res.status, body.data.code, body.data.details)
    }
    throw new ApiError(`HTTP ${res.status}`, res.status)
  }
  return res.json() as Promise<T>
}
