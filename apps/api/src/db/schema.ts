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
