import {
  bigint,
  boolean,
  index,
  integer,
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
