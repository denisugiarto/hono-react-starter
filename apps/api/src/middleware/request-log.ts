import { createMiddleware } from 'hono/factory'
import type { Logger } from '../lib/logger.ts'
import { requestContext } from '../lib/request-context.ts'
import type { AppEnv } from '../types.ts'
import { clientIp } from './rate-limit.ts'

/**
 * Log satu baris per request SETELAH respons selesai:
 *   { msg: "request", requestId, method, path, status, durationMs, ip, userId?, userAgent }
 * Level: 5xx → error, 4xx → warn, lainnya → info. Juga menyiapkan
 * `c.get('log')` (child logger ber-requestId) untuk dipakai handler, dan
 * `requestContext` (AsyncLocalStorage) agar kode tanpa Context Hono — callback
 * Better Auth, helper audit — tetap tahu requestId/ip/user-agent.
 */
export function requestLog(logger: Logger) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const start = performance.now()
    const requestId = c.get('requestId')
    const log = logger.child({ requestId })
    c.set('log', log)

    const ip = clientIp(c)
    const userAgent = c.req.header('user-agent')

    // error ditangkap app.onError → c.res tetap terisi
    await requestContext.run({ requestId, ip, userAgent, log }, next)

    const durationMs = Math.round((performance.now() - start) * 10) / 10
    const status = c.res.status
    const fields = {
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs,
      ip,
      userId: c.get('user')?.id,
      userAgent,
    }
    if (status >= 500) log.error('request', fields)
    else if (status >= 400) log.warn('request', fields)
    else log.info('request', fields)
  })
}
