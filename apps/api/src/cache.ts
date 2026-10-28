import { readCacheConfig, readLogConfig } from './env.ts'
import { createCache } from './lib/cache.ts'
import { Logger } from './lib/logger.ts'

/** Cache runtime (singleton) — provider dari CACHE_PROVIDER (lihat env.ts). */
export const cache = createCache(readCacheConfig(), {
  log: new Logger({ ...readLogConfig(), base: { service: 'hono-react-starter', component: 'cache' } }),
})
