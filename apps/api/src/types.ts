import type { Logger } from './lib/logger.ts'
import type { AuthUser } from './middleware/auth.ts'

/**
 * Tipe env Hono untuk seluruh app:
 * - Variables.requestId: dari middleware requestId (header X-Request-Id).
 * - Variables.log: logger per-request (sudah berisi requestId) — pakai
 *   `c.get('log').info('…', { … })` di route agar baris log bisa ditrace.
 * - Variables.user: diisi requireAuth / requireRole / requirePermission.
 * - Variables.clientIp: IP klien tepercaya (requestLog; lihat clientIp() + TRUST_PROXY).
 */
export type AppEnv = {
  Variables: {
    requestId: string
    log: Logger
    user: AuthUser
    clientIp: string
  }
}
