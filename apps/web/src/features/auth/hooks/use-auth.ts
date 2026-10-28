import { useCallback } from 'react'
import { can as canRole, type Permissions } from '@hono-react-starter/shared'
import { useSession } from '@/lib/auth-client'

export type AuthUser = { id: string; name: string; email: string; role?: string | null }

/**
 * Sesi pengguna saat ini + helper RBAC. Satu-satunya tempat komponen membaca
 * sesi, sehingga sumber (Better Auth) mudah diganti/di-mock.
 */
export function useAuth() {
  const { data: session, isPending } = useSession()
  const user = (session?.user as AuthUser | undefined) ?? null
  const role = user?.role ?? undefined
  const can = useCallback((permissions: Permissions) => canRole(role, permissions), [role])
  return {
    user,
    isPending,
    isAuthenticated: user !== null,
    role,
    isAdmin: role === 'admin',
    can,
  }
}
