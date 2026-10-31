import { mainNav, sidebarNav, type NavGroup, type NavItem } from '@/config/navigation'
import { useAuth } from '@/features/auth'

type Viewer = { isAuthenticated: boolean; can: (p: NonNullable<NavItem['permission']>) => boolean }

/** Saring item: wajib login (`auth`) dan permission RBAC (`permission`). */
export function filterNavItems(items: NavItem[], viewer: Viewer): NavItem[] {
  return items.filter((item) => {
    if (item.auth && !viewer.isAuthenticated) return false
    if (item.permission && !viewer.can(item.permission)) return false
    return true
  })
}

/** Item navigasi utama yang boleh dilihat pengguna saat ini (login + permission). */
export function useVisibleNav(): NavItem[] {
  const viewer = useAuth()
  return filterNavItems(mainNav, viewer)
}

/** Grup sidebar yang masih punya item setelah disaring. */
export function useVisibleNavGroups(groups: NavGroup[] = sidebarNav): NavGroup[] {
  const viewer = useAuth()
  return groups.map((g) => ({ ...g, items: filterNavItems(g.items, viewer) })).filter((g) => g.items.length > 0)
}
