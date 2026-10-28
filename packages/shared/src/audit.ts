import { z } from 'zod'

/**
 * Audit log (GET /api/admin/audit-logs, permission audit:list).
 * Nama aksi stabil berbentuk `<domain>.<peristiwa>`; lihat AUDIT_ACTIONS.
 */
export const AUDIT_ACTIONS = [
  // auth
  'auth.sign_up',
  'auth.sign_in',
  'auth.sign_in_two_factor_required',
  'auth.sign_out',
  'auth.email_verified',
  'auth.verification_email_sent',
  'auth.password_reset_requested',
  'auth.password_reset_completed',
  'auth.password_changed',
  'auth.email_change_requested',
  'auth.profile_updated',
  'auth.account_deleted',
  'auth.sessions_revoked',
  'auth.two_factor_enable_requested',
  'auth.two_factor_verified',
  'auth.two_factor_backup_code_used',
  'auth.two_factor_backup_codes_regenerated',
  'auth.two_factor_disabled',
  // admin (plugin admin Better Auth)
  'admin.create_user',
  'admin.update_user',
  'admin.set_role',
  'admin.set_user_password',
  'admin.ban_user',
  'admin.unban_user',
  'admin.remove_user',
  'admin.impersonate_user',
  'admin.stop_impersonating',
  'admin.revoke_user_session',
  'admin.revoke_user_sessions',
  // data aplikasi
  'note.created',
  'note.updated',
  'note.deleted',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const auditLogSchema = z.object({
  id: z.string(),
  at: z.string(),
  actorId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  success: z.boolean(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  requestId: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

/** Query string GET /api/admin/audit-logs (paginasi cursor berdasarkan `at`). */
export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** Ambil entri dengan `at` lebih lama dari cursor ini (ISO date dari `nextCursor`). */
  cursor: z.string().datetime({ offset: true }).optional(),
  /** Filter nama aksi (prefix, mis. `auth.` atau persis `note.created`). */
  action: z.string().trim().min(1).max(100).optional(),
  actorId: z.string().trim().min(1).max(100).optional(),
  success: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})
export type AuditLogQuery = z.input<typeof auditLogQuerySchema>

export const auditLogListSchema = z.object({
  items: auditLogSchema.array(),
  /** Kirim sebagai `cursor` untuk halaman berikutnya; null bila habis. */
  nextCursor: z.string().nullable(),
})
export type AuditLogList = z.infer<typeof auditLogListSchema>
