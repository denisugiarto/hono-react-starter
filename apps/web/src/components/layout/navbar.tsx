import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  /** Logo / nama aplikasi (biasanya Link ke beranda). */
  brand: ReactNode
  /** Slot paling kiri, mis. tombol menu mobile atau SidebarTrigger. */
  start?: ReactNode
  /** Navigasi utama di tengah (mis. <MainNav />). */
  children?: ReactNode
  /** Slot kanan: pencarian, tema, notifikasi, menu pengguna. */
  end?: ReactNode
  /** Menempel di atas saat scroll. Default true. */
  sticky?: boolean
  /** Lebar penuh (dashboard) alih-alih container. */
  fluid?: boolean
  className?: string
}

/**
 * Bilah atas aplikasi: start · brand · nav · end. Presentasional — pemakaian
 * nyata ada di `SiteHeader`; untuk dashboard penuh pasangkan `start=<SidebarTrigger />`
 * dan `fluid`.
 */
export function Navbar({ brand, start, children, end, sticky = true, fluid = false, className }: Props) {
  return (
    <header
      data-slot="navbar"
      className={cn(
        'border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sticky && 'sticky top-0 z-40',
        className,
      )}
    >
      <div className={cn('flex h-14 items-center gap-3 px-4', !fluid && 'container mx-auto')}>
        {start}
        <div className="flex items-center font-semibold tracking-tight">{brand}</div>
        {children}
        {end && <div className="ml-auto flex items-center gap-1">{end}</div>}
      </div>
    </header>
  )
}
