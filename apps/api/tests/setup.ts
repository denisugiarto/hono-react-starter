/**
 * Preload untuk test server (bun test --preload ./tests/setup.ts, cwd apps/api).
 *
 * - Mengarahkan DATABASE_URL ke database TEST (bukan database dev) agar data
 *   dev tidak ikut terhapus. Prioritas: TEST_DATABASE_URL, lalu DATABASE_URL
 *   dengan nama database diberi akhiran `_test`.
 * - Menjalankan migrasi lalu mengosongkan tabel sebelum suite berjalan.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { MIGRATIONS_DIR } from '../src/db/migrations-dir.ts'

process.env.NODE_ENV = 'test'
process.env.BETTER_AUTH_SECRET ??= 'test-secret-test-secret-test-secret-123456'
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'

function deriveTestUrl(url: string | undefined): string {
  const base = url ?? 'postgresql://localhost:5432/hono_react_starter'
  const parsed = new URL(base)
  const dbName = parsed.pathname.replace(/^\//, '') || 'hono_react_starter'
  parsed.pathname = `/${dbName.endsWith('_test') ? dbName : `${dbName}_test`}`
  return parsed.toString()
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? deriveTestUrl(process.env.DATABASE_URL)

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
try {
  await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_DIR })
  await sql`TRUNCATE TABLE "notes", "session", "account", "verification", "rate_limit", "api_rate_limit", "user" RESTART IDENTITY CASCADE`
} catch (err) {
  console.error(
    `\n[test] Gagal menyiapkan database test ${process.env.DATABASE_URL}.\n` +
      '       Buat dulu: bun run db:test:create (atau set TEST_DATABASE_URL).\n',
  )
  throw err
} finally {
  await sql.end()
}
