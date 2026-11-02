import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

/**
 * RBAC berbasis permission (Better Auth access control).
 * Satu sumber kebenaran untuk server (middleware) dan client (tampilkan/sembunyikan UI).
 *
 * - `statements`: resource → daftar aksi. `defaultStatements` berisi resource
 *   bawaan plugin admin (`user`, `session`); tambahkan resource aplikasi di sini.
 * - `roles`: pemetaan role → permission. Tambah role baru di sini + di USER_ROLES.
 */
export const statements = {
  ...defaultStatements,
  note: ['create', 'read', 'update', 'delete'],
  /** Audit log (GET /api/admin/audit-logs). */
  audit: ['list'],
  /** Pengaturan aplikasi runtime (GET/PATCH /api/admin/settings). */
  settings: ['read', 'update'],
} as const

export const ac = createAccessControl(statements)

const notePermissions = { note: ['create', 'read', 'update', 'delete'] } as const

/**
 * Permission admin bawaan plugin TANPA impersonasi: admin tidak boleh masuk
 * sebagai pengguna lain (plugin menolak /admin/impersonate-user dengan 403).
 */
const IMPERSONATION_ACTIONS = new Set<string>(['impersonate', 'impersonate-admins'])
const adminUserPermissions = adminAc.statements.user.filter((action) => !IMPERSONATION_ACTIONS.has(action))

export const roles = {
  /** Pengguna biasa: penuh atas catatannya sendiri, tanpa manajemen user. */
  user: ac.newRole({ ...notePermissions }),
  /** Admin: permission bawaan plugin admin (tanpa impersonasi) + catatan + audit + pengaturan. */
  admin: ac.newRole({
    ...adminAc.statements,
    user: adminUserPermissions,
    ...notePermissions,
    audit: ['list'],
    settings: ['read', 'update'],
  }),
}

export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

/** Subset permission yang diminta, mis. `{ note: ['delete'] }`. */
export type Permissions = {
  [K in keyof typeof statements]?: readonly (typeof statements)[K][number][]
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

/**
 * Cek apakah `role` memiliki SEMUA permission yang diminta.
 * Role tak dikenal → false. Dipakai server (requirePermission) & client (UI).
 */
export function can(role: string | null | undefined, permissions: Permissions): boolean {
  if (!isUserRole(role)) return false
  const result = roles[role].authorize(permissions as never)
  return result.success
}
