import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { sidebarNav } from '@/config/navigation'
import { AppSidebar } from './app-sidebar'

const meta = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  parameters: { layout: 'padded' },
  args: { groups: sidebarNav },
  decorators: [
    (Story, ctx) => (
      <MemoryRouter initialEntries={[(ctx.parameters.initialPath as string | undefined) ?? '/settings/security']}>
        <SidebarProvider className="min-h-0">
          <Story />
        </SidebarProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AppSidebar>

export default meta
type Story = StoryObj<typeof meta>

/** Semua grup (seperti dilihat admin). Link aktif mengikuti path awal router. */
export const Admin: Story = {}

/** Pengguna biasa: grup Admin sudah disaring oleh useVisibleNavGroups di aplikasi. */
export const RegularUser: Story = {
  args: { groups: sidebarNav.filter((g) => g.label !== 'Admin') },
}

export const ActiveNotes: Story = { parameters: { initialPath: '/notes' } }
