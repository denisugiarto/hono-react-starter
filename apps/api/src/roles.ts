import { db } from './db/index.ts'
import { RoleRegistry } from './lib/roles.ts'

/** Singleton registry role dinamis (tabel app_role); dipakai Better Auth, middleware, dan route admin. */
export const roleRegistry = new RoleRegistry(db)
