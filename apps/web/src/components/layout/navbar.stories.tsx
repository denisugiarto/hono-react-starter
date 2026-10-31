import type { Meta, StoryObj } from '@storybook/react-vite'
import { BellIcon, MenuIcon, SearchIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Navbar } from './navbar'

const meta = {
  title: 'Layout/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
  args: {
    brand: 'Hono React Starter',
    start: (
      <Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Buka menu">
        <MenuIcon />
      </Button>
    ),
    end: (
      <>
        <Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Notifikasi">
          <BellIcon />
        </Button>
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">BP</AvatarFallback>
        </Avatar>
      </>
    ),
    children: (
      <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
        <a className="rounded-md bg-accent px-3 py-1.5 font-medium" href="#">
          Beranda
        </a>
        <a className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent" href="#">
          Pesanan
        </a>
        <a className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent" href="#">
          Laporan
        </a>
      </nav>
    ),
  },
} satisfies Meta<typeof Navbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Fluid: Story = { args: { fluid: true } }
export const WithSearch: Story = {
  args: {
    children: (
      <div className="relative ml-4 hidden w-72 md:block">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari…" className="pl-8" />
      </div>
    ),
  },
}
