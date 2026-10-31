import type { Meta, StoryObj } from '@storybook/react-vite'
import { SidebarProvider } from '@/components/ui/sidebar'
import { sidebarNav } from '@/config/navigation'
import { AppSidebar } from './app-sidebar'

const meta = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  // Router disediakan .storybook/preview.tsx; path awal via parameters.initialPath
  parameters: { layout: 'padded', initialPath: '/settings/security' },
  args: { groups: sidebarNav },
  decorators: [
    (Story) => (
      <SidebarProvider className="min-h-0">
        <Story />
      </SidebarProvider>
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
