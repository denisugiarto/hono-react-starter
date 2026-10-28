import { readLogConfig, readMailConfig } from './env.ts'
import { Logger } from './lib/logger.ts'
import { createMailer } from './lib/mailer.ts'

/** Mailer runtime (singleton) — provider dari MAIL_PROVIDER (lihat env.ts). */
export const mailer = createMailer(
  readMailConfig(),
  new Logger({ ...readLogConfig(), base: { service: 'hono-react-starter', component: 'mailer' } }),
)
