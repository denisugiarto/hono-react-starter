import path from 'node:path'

/** Folder migrasi SQL Drizzle (apps/api/drizzle), relatif terhadap file ini — tidak bergantung cwd. */
export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../drizzle')
