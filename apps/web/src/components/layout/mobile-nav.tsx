import { MenuIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { siteConfig } from '@/config/site'
import { useVisibleNav } from '@/hooks/use-visible-nav'
import { cn } from '@/lib/utils'

/** Navigasi mobile: tombol hamburger → Sheet dari kiri. */
export function MobileNav() {
  const items = useVisibleNav()
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Buka menu" />}>
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{siteConfig.name}</SheetTitle>
          <SheetDescription>{siteConfig.tagline}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Navigasi mobile" className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <SheetClose
              key={item.to}
              render={<NavLink to={item.to} end={item.to === '/'} />}
              className={cn('rounded-md px-3 py-2 text-sm font-medium hover:bg-accent', 'aria-[current=page]:bg-accent')}
            >
              {item.label}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
