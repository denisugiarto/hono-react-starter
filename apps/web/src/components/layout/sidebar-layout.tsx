import { NavLink, Outlet } from 'react-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useVisibleNavGroups } from '@/hooks/use-visible-nav'
import { cn } from '@/lib/utils'
import { AppSidebar } from './app-sidebar.tsx'

/**
 * Layout area Pengaturan & Admin: sidebar (desktop) atau deretan tautan (mobile) di
 * kiri/atas konten route. Dipasang sebagai route induk di app/routes.tsx, di bawah
 * AppShell (header tetap) dan RequireAuth.
 */
export function SidebarLayout() {
  const groups = useVisibleNavGroups()
  return (
    <SidebarProvider className="min-h-0 flex-col gap-6 md:flex-row md:items-start">
      <AppSidebar groups={groups} className="hidden md:flex" />
      <nav aria-label="Navigasi bagian" data-testid="section-nav" className="flex gap-1 overflow-x-auto md:hidden">
        {groups.flatMap((g) => g.items).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </SidebarProvider>
  )
}
