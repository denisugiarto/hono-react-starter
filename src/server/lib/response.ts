import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiErrorBody, ApiErrorCode, ApiSuccessBody } from '../../shared/api.ts'

/**
 * Helper envelope respons (lihat src/shared/api.ts).
 *
 *   return ok(c, note)                               // 200 { success, data }
 *   return ok(c, note, { status: 201, message: 'Catatan dibuat' })
 *   return fail(c, 404, 'NOT_FOUND', 'Note tidak ditemukan')
 *   return fail(c, 400, 'VALIDATION_ERROR', 'Data tidak valid', fieldErrors)
 */
export function ok<T>(
  c: Context,
  data: T,
  options: { status?: ContentfulStatusCode; message?: string } = {},
) {
  const body: ApiSuccessBody<T> = { success: true, data }
  if (options.message) body.message = options.message
  return c.json(body, options.status ?? 200)
}

export function fail(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = { success: false, code, message }
  if (details !== undefined) body.details = details
  return c.json(body, status)
}

/** Body error tanpa Context — untuk handler library (bodyLimit, rate limiter). */
export function errorBody(code: ApiErrorCode, message: string, details?: unknown): ApiErrorBody {
  const body: ApiErrorBody = { success: false, code, message }
  if (details !== undefined) body.details = details
  return body
}
