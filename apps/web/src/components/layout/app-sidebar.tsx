import { NavLink } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { NavGroup } from '@/config/navigation'
import { cn } from '@/lib/utils'

type Props = {
  /** Grup yang sudah disaring (lihat useVisibleNavGroups). */
  groups: NavGroup[]
  className?: string
}

/**
 * Sidebar navigasi (presentasional — tanpa hook sesi, agar mudah dipakai di Storybook
 * dan test). Link aktif ditandai `aria-current="page"` oleh NavLink dan `data-active`
 * oleh SidebarMenuButton.
 */
export function AppSidebar({ groups, className }: Props) {
  return (
    <Sidebar collapsible="none" data-testid="app-sidebar" className={cn('h-auto w-56 shrink-0 rounded-xl border bg-sidebar', className)}>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end={item.to === '/'} data-testid="sidebar-link" data-to={item.to}>
                      {({ isActive }) => (
                        <SidebarMenuButton render={<span />} isActive={isActive} tooltip={item.label}>
                          {item.icon && <item.icon />}
                          <span>{item.label}</span>
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
