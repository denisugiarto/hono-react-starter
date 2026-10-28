import { KeyRoundIcon, LogOutIcon, NotebookPenIcon, ScrollTextIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { paths } from '@/config/paths'
import { initialsOf } from '@/lib/format'
import { useAuth } from '../hooks/use-auth.ts'
import { useSignOut } from '../hooks/use-sign-out.ts'

/** Avatar + dropdown: identitas, pintasan halaman, dan keluar. */
export function UserMenu() {
  const { user, can } = useAuth()
  const signOut = useSignOut()
  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2 px-2" aria-label="Menu pengguna" data-testid="user-menu-trigger" />}
      >
        <Avatar className="size-6">
          <AvatarFallback className="text-xs">{initialsOf(user.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="user-menu-notes" render={<Link to={paths.notes} />}>
          <NotebookPenIcon /> Catatan
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="user-menu-security" render={<Link to={paths.security} />}>
          <ShieldCheckIcon /> Keamanan
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="user-menu-api-token" render={<Link to={paths.apiToken} />}>
          <KeyRoundIcon /> Token API
        </DropdownMenuItem>
        {can({ user: ['list'] }) && (
          <DropdownMenuItem data-testid="user-menu-users" render={<Link to={paths.adminUsers} />}>
            <UsersIcon /> Pengguna
          </DropdownMenuItem>
        )}
        {can({ audit: ['list'] }) && (
          <DropdownMenuItem data-testid="user-menu-audit" render={<Link to={paths.adminAuditLogs} />}>
            <ScrollTextIcon /> Audit log
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" data-testid="user-menu-sign-out" onClick={signOut}>
          <LogOutIcon /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
