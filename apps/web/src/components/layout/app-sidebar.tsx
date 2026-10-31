import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type { NavGroup } from '@/config/navigation'
import { cn } from '@/lib/utils'

type Props = {
  /** Grup yang sudah disaring (lihat useVisibleNavGroups). */
  groups: NavGroup[]
  /**
   * Tampilkan tombol ciutkan/perluas. Saat diciutkan hanya ikon yang tampil
   * (label jadi tooltip); state dibaca dari SidebarProvider (persisten via cookie
   * `sidebar_state`, pintasan ⌘/Ctrl+B).
   */
  collapsible?: boolean
  className?: string
}

/**
 * Sidebar navigasi (presentasional — tanpa hook sesi, agar mudah dipakai di Storybook
 * dan test). Link aktif ditandai `aria-current="page"` oleh NavLink dan `data-active`
 * oleh SidebarMenuButton. Dipasang di dalam container (bukan fixed), jadi memakai
 * primitif `collapsible="none"` dan mengatur lebar sendiri dari state provider.
 */
export function AppSidebar({ groups, collapsible = false, className }: Props) {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = collapsible && state === 'collapsed'
  return (
    <Sidebar
      collapsible="none"
      data-testid="app-sidebar"
      data-state={collapsed ? 'collapsed' : 'expanded'}
      className={cn(
        'h-auto shrink-0 rounded-xl border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-13' : 'w-56',
        className,
      )}
    >
      {collapsible && (
        <SidebarHeader className={cn('flex-row items-center', collapsed ? 'justify-center' : 'justify-end')}>
          <Button
            color="neutral"
            appearance="ghost"
            size="icon-sm"
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!collapsed}
            data-testid="sidebar-collapse"
            onClick={toggleSidebar}
          >
            {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
          </Button>
        </SidebarHeader>
      )}
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end={item.to === '/'} data-testid="sidebar-link" data-to={item.to}>
                      {({ isActive }) => (
                        <SidebarMenuButton
                          render={<span />}
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(collapsed && 'justify-center px-0')}
                        >
                          {item.icon && <item.icon />}
                          <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
