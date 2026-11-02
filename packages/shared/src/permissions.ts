import { createAccessControl, type Role } from 'better-auth/plugins/access'
import { defaultStatements } from 'better-auth/plugins/admin/access'
import { z } from 'zod'

/**
 * RBAC berbasis permission (Better Auth access control).
 *
 * - `statements`: KATALOG resource → aksi yang dikenal aplikasi (sumber kebenaran
 *   untuk middleware, UI matriks permission, dan validasi). Tambah resource/aksi di sini.
 * - Role bersifat DINAMIS: definisi tersimpan di tabel `app_role` dan dikelola admin
 *   lewat UI (/admin/roles). `DEFAULT_ROLE_DEFINITIONS` adalah role sistem yang selalu
 *   ada (`admin` penuh & terkunci, `user` dasar). Server memakai `RoleRegistry`
 *   (apps/api/src/lib/roles.ts); client memakai permission efektif dari
 *   `GET /api/me/permissions` dengan fallback definisi default di bawah.
 */
export const statements = {
  ...defaultStatements,
  note: ['create', 'read', 'update', 'delete'],
  /** Audit log (GET /api/admin/audit-logs). */
  audit: ['list'],
  /** Pengaturan aplikasi runtime (GET/PATCH /api/admin/settings). */
  settings: ['read', 'update'],
  /** Definisi role & permission (GET/POST/PATCH/DELETE /api/admin/roles). */
  role: ['list', 'create', 'update', 'delete'],
} as const

export const ac = createAccessControl(statements)

export type Resource = keyof typeof statements
export type ActionOf<R extends Resource> = (typeof statements)[R][number]

/** Subset permission, mis. `{ note: ['delete'] }`. */
export type Permissions = {
  [K in Resource]?: readonly ActionOf<K>[]
}

/** Impersonasi dimatikan untuk semua role (admin pun tidak boleh masuk sebagai user lain). */
const IMPERSONATION_ACTIONS = new Set<string>(['impersonate', 'impersonate-admins'])

export const PERMISSION_RESOURCES = Object.keys(statements) as Resource[]

/** Aksi yang boleh diberikan ke role (katalog tanpa impersonasi). */
export const GRANTABLE_ACTIONS: { [K in Resource]: readonly ActionOf<K>[] } = Object.fromEntries(
  Object.entries(statements).map(([resource, actions]) => [resource, actions.filter((a) => !IMPERSONATION_ACTIONS.has(a))]),
) as unknown as { [K in Resource]: readonly ActionOf<K>[] }

/** Semua permission yang bisa diberikan — isi role `admin`. */
export const ALL_PERMISSIONS: Permissions = GRANTABLE_ACTIONS

export const notePermissions = { note: ['create', 'read', 'update', 'delete'] } as const satisfies Permissions

export type RoleDefinition = {
  name: string
  description: string
  permissions: Permissions
  /** Role sistem: selalu ada, tidak bisa dihapus; `admin` juga tidak bisa diubah. */
  system: boolean
}

export const DEFAULT_ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  { name: 'admin', description: 'Akses penuh ke semua fitur (tanpa impersonasi). Terkunci.', permissions: ALL_PERMISSIONS, system: true },
  { name: 'user', description: 'Pengguna biasa: penuh atas catatannya sendiri.', permissions: notePermissions, system: true },
]

/** Nama role sistem bawaan (seed/demo/test). Role lain dibuat admin di UI. */
export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = string

export const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,31}$/
export const roleNameSchema = z
  .string()
  .regex(ROLE_NAME_PATTERN, 'Nama role: 2–32 karakter huruf kecil/angka/-/_ dan diawali huruf')

/** Validasi objek permission terhadap katalog (aksi impersonasi ditolak). */
export const permissionsSchema = z
  .object(
    Object.fromEntries(
      Object.entries(GRANTABLE_ACTIONS).map(([resource, actions]) => [
        resource,
        z.array(z.enum(actions as unknown as [string, ...string[]])).optional(),
      ]),
    ) as { [K in Resource]: z.ZodOptional<z.ZodArray<z.ZodEnum<Record<string, string>>>> },
  )
  .strict()
  .transform((value) => {
    // Buang resource tanpa aksi & aksi ganda agar bentuk tersimpan kanonik
    const out: Record<string, string[]> = {}
    for (const [resource, actions] of Object.entries(value)) {
      if (actions && actions.length) out[resource] = [...new Set(actions)]
    }
    return out as Permissions
  })

/** Apakah `granted` memuat SEMUA permission di `requested`. */
export function grants(granted: Permissions | null | undefined, requested: Permissions): boolean {
  if (!granted) return false
  return Object.entries(requested).every(([resource, actions]) => {
    const have = (granted as Record<string, readonly string[] | undefined>)[resource]
    return !!have && (actions as readonly string[]).every((a) => have.includes(a))
  })
}

/** Role Better Auth (untuk plugin admin) dari objek permission. */
export function buildRole(permissions: Permissions): Role {
  return ac.newRole(permissions as never)
}

const defaultDefinitionMap: Record<string, Permissions> = Object.fromEntries(
  DEFAULT_ROLE_DEFINITIONS.map((d) => [d.name, d.permissions]),
)

/** Role statis default untuk Better Auth client (`adminClient({ ac, roles })`). Server memakai RoleRegistry. */
export const roles: Record<string, Role> = Object.fromEntries(
  DEFAULT_ROLE_DEFINITIONS.map((d) => [d.name, buildRole(d.permissions)]),
)

/** Gabungan permission beberapa role (dipisah koma, format Better Auth). */
export function mergePermissions(role: string | null | undefined, definitions: Record<string, Permissions>): Permissions {
  const merged: Record<string, Set<string>> = {}
  for (const name of (role ?? '').split(',')) {
    const perms = definitions[name.trim()]
    if (!perms) continue
    for (const [resource, actions] of Object.entries(perms)) {
      merged[resource] ??= new Set()
      for (const a of actions ?? []) merged[resource].add(a)
    }
  }
  return Object.fromEntries(Object.entries(merged).map(([r, set]) => [r, [...set]])) as Permissions
}

/**
 * Cek apakah `role` memiliki SEMUA permission yang diminta berdasarkan `definitions`
 * (default: role sistem bawaan). `role` boleh berupa daftar dipisah koma (Better Auth) → gabungan.
 */
export function can(
  role: string | null | undefined,
  permissions: Permissions,
  definitions: Record<string, Permissions> = defaultDefinitionMap,
): boolean {
  if (!role) return false
  return grants(mergePermissions(role, definitions), permissions)
}
