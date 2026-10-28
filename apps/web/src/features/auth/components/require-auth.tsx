import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '@/components/common/loading-state'
import { paths } from '@/config/paths'
import { useAuth } from '../hooks/use-auth.ts'

/**
 * Guard route: wajib login. Selama sesi dimuat tampil skeleton; bila belum
 * login redirect ke /login dengan `state.from` agar kembali setelah masuk.
 */
export function RequireAuth() {
  const { isAuthenticated, isPending } = useAuth()
  const location = useLocation()
  if (isPending) return <LoadingState rows={3} label="Memeriksa sesi…" />
  if (!isAuthenticated) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
