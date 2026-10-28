import { AsyncLocalStorage } from 'node:async_hooks'
import type { Logger } from './logger.ts'

/**
 * Konteks per-request yang bisa dibaca dari kode yang TIDAK menerima Context Hono
 * (mis. callback Better Auth, helper audit). Diisi oleh middleware requestLog.
 */
export type RequestContext = {
  requestId: string
  ip: string
  userAgent?: string
  log: Logger
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export const currentRequest = (): RequestContext | undefined => requestContext.getStore()
