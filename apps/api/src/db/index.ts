import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { readDatabaseUrl } from '../env.ts'
import * as schema from './schema.ts'

/**
 * Client koneksi untuk query runtime (pooled).
 * postgres.js bersifat lazy — koneksi baru dibuat saat query pertama.
 * Di production, DATABASE_URL wajib diisi (fail-fast, lihat env.ts).
 */
export const client = postgres(readDatabaseUrl(), { max: 10, prepare: false })

export const db = drizzle(client, { schema })
