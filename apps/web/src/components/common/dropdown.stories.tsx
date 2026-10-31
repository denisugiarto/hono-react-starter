import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/toast'
import { Dropdown } from './dropdown'

const meta = {
  title: 'Common/Dropdown',
  component: Dropdown,
  args: {
    trigger: (
      <Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Aksi">
        <EllipsisIcon />
      </Button>
    ),
    title: 'Aksi',
    items: [
      { label: 'Ubah', icon: PencilIcon, shortcut: '⌘E', onSelect: () => notify.info('Ubah') },
      { label: 'Duplikat', icon: CopyIcon, onSelect: () => notify.info('Duplikat') },
      { type: 'separator' },
      { label: 'Hapus', icon: Trash2Icon, destructive: true, onSelect: () => notify.error('Dihapus') },
    ],
  },
} satisfies Meta<typeof Dropdown>

export default meta
type Story = StoryObj<typeof meta>

export const RowActions: Story = {}
export const AccountMenu: Story = {
  args: {
    trigger: (
      <Button color="neutral" appearance="outline" size="sm">
        <UserIcon /> Budi
      </Button>
    ),
    title: undefined,
    items: [
      { type: 'label', label: 'budi@example.com' },
      { label: 'Profil', onSelect: () => notify.info('Profil') },
      { label: 'Pengaturan', shortcut: '⌘,', onSelect: () => notify.info('Pengaturan') },
      { type: 'separator' },
      { label: 'Keluar', destructive: true, onSelect: () => notify.message('Sampai jumpa') },
    ],
  },
}
