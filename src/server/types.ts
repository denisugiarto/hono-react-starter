import type { ViteDevServer } from 'vite'
import type { Logger } from './lib/logger.ts'
import type { AuthUser } from './middleware/auth.ts'

/**
 * Tipe env Hono untuk seluruh app:
 * - Bindings.vite: hanya terisi oleh @hono/vite-dev-server saat development.
 * - Variables.requestId: dari middleware requestId (header X-Request-Id).
 * - Variables.log: logger per-request (sudah berisi requestId) — pakai
 *   `c.get('log').info('…', { … })` di route agar baris log bisa ditrace.
 * - Variables.user: diisi requireAuth / requireRole / requirePermission.
 */
export type AppEnv = {
  Bindings: {
    vite?: Pick<ViteDevServer, 'transformIndexHtml'>
  }
  Variables: {
    requestId: string
    log: Logger
    user: AuthUser
  }
}
