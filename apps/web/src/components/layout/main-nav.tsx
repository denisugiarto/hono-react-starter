import { NavLink } from 'react-router'
import { useVisibleNav } from '@/hooks/use-visible-nav'
import { cn } from '@/lib/utils'

/** Navigasi utama (desktop). Item disaring berdasarkan login + permission. */
export function MainNav({ className }: { className?: string }) {
  const items = useVisibleNav()
  return (
    <nav aria-label="Navigasi utama" className={cn('flex items-center gap-1', className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
