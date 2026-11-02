import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { can as canStatic, grants, myPermissionsSchema, USER_ROLES, type Permissions } from '@hono-react-starter/shared'
import { endpoints } from '@/config/endpoints'
import { request } from '@/lib/api/request'
import { useSession } from '@/lib/auth-client'

export type AuthUser = {
  id: string
  name: string
  email: string
  role?: string | null
  emailVerified?: boolean
  twoFactorEnabled?: boolean | null
}

export const myPermissionsKey = (userId: string | undefined, role: string | undefined) => ['me', 'permissions', userId, role] as const

/**
 * Sesi pengguna saat ini + helper RBAC. Satu-satunya tempat komponen membaca
 * sesi, sehingga sumber (Better Auth) mudah diganti/di-mock.
 *
 * Permission efektif dibaca dari server (`GET /api/me/permissions`) karena role
 * bersifat dinamis (admin bisa mengubah matriks di /admin/roles). Selama belum
 * termuat, role sistem (`admin`/`user`) memakai definisi default agar UI tidak
 * berkedip; role kustom menunggu (`permissionsPending`).
 */
export function useAuth() {
  const { data: session, isPending } = useSession()
  const user = (session?.user as AuthUser | undefined) ?? null
  const role = user?.role ?? undefined
  const isAuthenticated = user !== null

  const permissions = useQuery({
    queryKey: myPermissionsKey(user?.id, role),
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => myPermissionsSchema.parse(await request<unknown>(endpoints.me.permissions)),
  })
  const effective = permissions.data?.permissions
  const roleKnownStatically = role !== undefined && (USER_ROLES as readonly string[]).includes(role)
  const permissionsPending = isAuthenticated && effective === undefined && !roleKnownStatically && !permissions.isError

  const can = useCallback(
    (requested: Permissions) => (effective ? grants(effective, requested) : canStatic(role, requested)),
    [effective, role],
  )
  return {
    user,
    isPending,
    isAuthenticated,
    role,
    isAdmin: role === 'admin',
    can,
    /** true selama permission role kustom belum termuat dari server. */
    permissionsPending,
  }
}
