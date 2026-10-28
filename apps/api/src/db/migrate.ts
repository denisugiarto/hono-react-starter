import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { MIGRATIONS_DIR } from './migrations-dir.ts'
import { readDatabaseUrl } from '../env.ts'

// Client khusus migrasi (max 1 koneksi), lalu ditutup setelah selesai.
// Di production, DATABASE_URL wajib diisi (fail-fast, lihat env.ts).
const migrationClient = postgres(readDatabaseUrl(), { max: 1 })

await migrate(drizzle(migrationClient), { migrationsFolder: MIGRATIONS_DIR })

await migrationClient.end()
console.log('Migrasi selesai ✔')
