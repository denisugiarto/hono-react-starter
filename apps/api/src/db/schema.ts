import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema.ts'

// Tabel auth Better Auth (user, session, account, verification)
// di-generate otomatis oleh `bunx better-auth generate`
export * from './auth-schema.ts'

// Tabel untuk rate limiting Better Auth (storage: 'database')
// model: "rateLimit" → object key schema.rateLimit, tabel fisik "rate_limit"
export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  count: integer('count').notNull(),
  lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})

// Rate limit API umum (/api/*) — store untuk hono-rate-limiter, dibagi antar instance.
export const apiRateLimit = pgTable('api_rate_limit', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
})

// Catatan milik user (per-user). Dihapus otomatis saat user dihapus.
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    done: boolean('done').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('notes_user_id_idx').on(table.userId)],
)

export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert

/**
 * Lockout per akun untuk sign-in (lihat src/auth-guards.ts): hitung kegagalan
 * berturut-turut per email, kunci sementara setelah AUTH_LOCKOUT_MAX_ATTEMPTS.
 * Baris dihapus saat sign-in berhasil; baris lama dibersihkan sesekali.
 */
export const signInLockout = pgTable('sign_in_lockout', {
  email: text('email').primaryKey(),
  failedCount: integer('failed_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
export type SignInLockoutRow = typeof signInLockout.$inferSelect

/**
 * Audit log: siapa melakukan apa, kapan, dari mana. Ditulis lewat lib/audit.ts
 * (aksi auth via src/auth-audit.ts, aksi data via route). Tidak ada FK ke user
 * agar riwayat tetap utuh setelah akun dihapus. Tabel ini append-only — jangan
 * tambahkan endpoint update/delete.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    /** Pelaku (null untuk aksi anonim, mis. permintaan reset password). */
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    /** Nama aksi stabil, mis. auth.sign_in, note.created, admin.set_role. */
    action: text('action').notNull(),
    success: boolean('success').notNull().default(true),
    targetType: text('target_type'),
    targetId: text('target_id'),
    requestId: text('request_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('audit_log_at_idx').on(table.at),
    index('audit_log_actor_id_idx').on(table.actorId),
    index('audit_log_action_idx').on(table.action),
  ],
)

export type AuditLogRow = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert

/**
 * Pengaturan aplikasi runtime (diubah admin lewat /api/admin/settings), satu baris per kunci.
 * Nilai JSON divalidasi dengan appSettingsSchema (packages/shared) saat dibaca.
 */
export const appSetting = pgTable('app_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** id user admin yang terakhir mengubah (null bila dari migrasi/seed). */
  updatedBy: text('updated_by'),
})

/**
 * Definisi role dinamis (dikelola admin di /admin/roles). Role sistem (`admin`, `user`)
 * selalu ada; `admin` dipaksa permission penuh saat dibaca (lihat lib/roles.ts).
 */
export const appRole = pgTable('app_role', {
  name: text('name').primaryKey(),
  description: text('description').notNull().default(''),
  /** Objek permission { resource: [aksi] } — divalidasi permissionsSchema (packages/shared). */
  permissions: jsonb('permissions').$type<Record<string, string[]>>().notNull(),
  system: boolean('system').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
