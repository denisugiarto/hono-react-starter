import { z } from 'zod'

/**
 * Envelope respons API — SATU bentuk untuk semua endpoint `/api/*`
 * (kecuali `/api/auth/*` milik Better Auth yang punya format sendiri).
 *
 * Sukses:  { success: true,  data: T, message?: string }
 * Gagal:   { success: false, code: string, message: string, details?: unknown }
 *
 * `code` adalah kode mesin yang stabil (lihat API_ERROR_CODES); `message`
 * untuk manusia. HTTP status tetap dipakai (200/201/400/401/403/404/413/429/500/503).
 */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'HTTP_ERROR',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  success: z.literal(false),
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

export function apiSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    message: z.string().optional(),
  })
}
export type ApiSuccessBody<T> = { success: true; data: T; message?: string }
export type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody

/** Validasi envelope apa pun (data tidak diperiksa) — untuk helper fetch client. */
export const apiResponseSchema = z.discriminatedUnion('success', [
  apiSuccessSchema(z.unknown()),
  apiErrorSchema,
])

/** @deprecated gunakan apiErrorSchema — dipertahankan untuk kompatibilitas tipe */
export type ErrorResponse = ApiErrorBody

/** Endpoint demo: health (isi `data`) */
export const healthResponseSchema = z.object({
  status: z.string(),
  database: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

/** Endpoint demo: hello (isi `data`) */
export const helloResponseSchema = z.object({
  greeting: z.string(),
  from: z.string(),
  time: z.string(),
})
export type HelloResponse = z.infer<typeof helloResponseSchema>
