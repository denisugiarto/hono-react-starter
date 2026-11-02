import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import type { Permissions } from '@hono-react-starter/shared'
import { LoadingState } from '@/components/common/loading-state'
import { ForbiddenPage } from '@/pages/forbidden-page'
import { useAuth } from '../hooks/use-auth.ts'

type Props = { permission: Permissions; children?: ReactNode }

/**
 * Guard RBAC: render children/Outlet hanya bila role punya permission.
 * Dipasang SETELAH RequireAuth (asumsi sudah login).
 */
export function RequirePermission({ permission, children }: Props) {
  const { can, permissionsPending } = useAuth()
  if (permissionsPending) return <LoadingState label="Memuat izin…" />
  if (!can(permission)) return <ForbiddenPage />
  return children ?? <Outlet />
}
