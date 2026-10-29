import type { Context } from 'hono'
import type { AuditAction } from '@hono-react-starter/shared/audit'
import { db } from '../db/index.ts'
import { auditLog, type NewAuditLog } from '../db/schema.ts'
import { clientIp } from '../middleware/rate-limit.ts'
import type { AppEnv } from '../types.ts'
import { Logger } from './logger.ts'
import { currentRequest } from './request-context.ts'

/**
 * Penulisan audit log (tabel audit_log). Dipanggil dari route (auditFromContext)
 * dan dari lapisan auth (src/auth-audit.ts) lewat recordAudit.
 *
 * Kegagalan menulis TIDAK menggagalkan request (fail-open) tetapi dicatat di log
 * level error dengan requestId — ubah menjadi `throw` bila kebijakan
 * compliance Anda mewajibkan fail-closed.
 */
export type AuditActor = { id: string; email?: string | null } | null

export type AuditEntry = {
  action: AuditAction
  success?: boolean
  actor?: AuditActor
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  /** Diisi otomatis dari requestContext bila tidak diberikan. */
  requestId?: string
  ip?: string
  userAgent?: string
}

export type AuditDeps = {
  /** Override penulisan (test / sink lain). */
  write?: (row: NewAuditLog) => Promise<unknown>
  log?: Logger
}

const fallbackLog = new Logger({ level: 'silent' })
const defaultWrite = (row: NewAuditLog) => db.insert(auditLog).values(row)

export async function recordAudit(entry: AuditEntry, deps: AuditDeps = {}): Promise<void> {
  const ctx = currentRequest()
  const row: NewAuditLog = {
    action: entry.action,
    success: entry.success ?? true,
    actorId: entry.actor?.id ?? null,
    actorEmail: entry.actor?.email ?? null,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    requestId: entry.requestId ?? ctx?.requestId ?? null,
    ip: entry.ip ?? ctx?.ip ?? null,
    userAgent: entry.userAgent ?? ctx?.userAgent ?? null,
    metadata: entry.metadata ?? null,
  }
  try {
    await (deps.write ?? defaultWrite)(row)
  } catch (err) {
    const log = deps.log ?? ctx?.log ?? fallbackLog
    log.error('audit log gagal ditulis', { err, action: entry.action, actorId: row.actorId })
  }
}

/** Dari handler Hono: pelaku = c.get('user') (bila ada), requestId/ip/UA dari request. */
export function auditFromContext(
  c: Context<AppEnv>,
  entry: Omit<AuditEntry, 'requestId' | 'ip' | 'userAgent'>,
  deps?: AuditDeps,
): Promise<void> {
  const user = c.get('user') as AppEnv['Variables']['user'] | undefined
  return recordAudit(
    {
      actor: user ? { id: user.id, email: user.email } : null,
      ...entry,
      requestId: c.get('requestId'),
      ip: (c.get('clientIp') as string | undefined) ?? clientIp(c),
      userAgent: c.req.header('user-agent'),
    },
    { log: c.get('log'), ...deps },
  )
}
