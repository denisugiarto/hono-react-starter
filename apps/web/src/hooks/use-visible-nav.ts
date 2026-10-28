import { mainNav, type NavItem } from '@/config/navigation'
import { useAuth } from '@/features/auth'

/** Item navigasi yang boleh dilihat pengguna saat ini (login + permission). */
export function useVisibleNav(): NavItem[] {
  const { isAuthenticated, can } = useAuth()
  return mainNav.filter((item) => {
    if (item.auth && !isAuthenticated) return false
    if (item.permission && !can(item.permission)) return false
    return true
  })
}
