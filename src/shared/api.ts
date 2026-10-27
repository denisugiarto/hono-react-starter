import { z } from 'zod'

/**
 * Bentuk respons error yang konsisten dari API.
 * Dipakai server (saat return error) dan client (saat membaca error).
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

/** Endpoint demo: health */
export const healthResponseSchema = z.object({
  status: z.string(),
  uptime: z.number(),
  timestamp: z.string(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

/** Endpoint demo: hello */
export const helloResponseSchema = z.object({
  message: z.string(),
  from: z.string(),
  time: z.string(),
})
export type HelloResponse = z.infer<typeof helloResponseSchema>
