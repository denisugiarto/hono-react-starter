import { Hono } from 'hono'
import type { MyPermissions } from '@hono-react-starter/shared/roles'
import { requireAuth } from '../middleware/auth.ts'
import { revalidate } from '../middleware/cache-control.ts'
import { ok } from '../lib/response.ts'
import { roleRegistry } from '../roles.ts'
import type { AppEnv } from '../types.ts'

export const meRoutes = new Hono<AppEnv>()

meRoutes.use('*', requireAuth)

// GET /api/me/permissions — role & permission efektif pemanggil (dipakai UI untuk menampilkan/menyembunyikan fitur)
meRoutes.get('/permissions', revalidate(), async (c) => {
  await roleRegistry.load()
  const { role } = c.get('user')
  const body: MyPermissions = { role, permissions: roleRegistry.permissionsOf(role) }
  return ok(c, body)
})
