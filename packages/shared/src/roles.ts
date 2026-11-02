import { z } from 'zod'
import { permissionsSchema, roleNameSchema, type Permissions } from './permissions.ts'

/** Baris role untuk admin (GET /api/admin/roles). */
export const roleSchema = z.object({
  name: z.string(),
  description: z.string(),
  permissions: permissionsSchema,
  system: z.boolean(),
  /** Jumlah user yang memakai role ini. */
  usersCount: z.number().int().nonnegative(),
})
export type RoleView = z.infer<typeof roleSchema>
export const roleListSchema = z.array(roleSchema)

/** POST /api/admin/roles */
export const roleCreateSchema = z.object({
  name: roleNameSchema,
  description: z.string().trim().max(200).default(''),
  permissions: permissionsSchema,
})
/** Input klien (tipe `Permissions` yang ketat; server memvalidasi ulang dengan schema). */
export type RoleCreateInput = { name: string; description?: string; permissions: Permissions }

/** PATCH /api/admin/roles/:name — field opsional eksplisit, minimal satu. */
export const roleUpdateSchema = z
  .object({
    description: z.string().trim().max(200).optional(),
    permissions: permissionsSchema.optional(),
  })
  .strict()
  .refine((d) => d.description !== undefined || d.permissions !== undefined, { message: 'Tidak ada perubahan' })
export type RoleUpdateInput = { description?: string; permissions?: Permissions }

/** GET /api/me/permissions — permission efektif pemanggil. */
export const myPermissionsSchema = z.object({
  role: z.string(),
  permissions: permissionsSchema,
})
export type MyPermissions = z.infer<typeof myPermissionsSchema>
