import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './empty-state'

const meta = { title: 'Common/Placeholder', component: EmptyState, parameters: { layout: 'padded' }, args: { title: 'Kosong' } } satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

/** Kondisi kosong dengan aksi. */
export const Empty: Story = {
  render: () => (
    <EmptyState className="w-96" title="Belum ada catatan" description="Buat catatan pertama Anda." action={<Button>Tambah catatan</Button>} />
  ),
}
/** Skeleton kartu saat memuat. */
export const SkeletonCard: Story = {
  render: () => (
    <div className="w-80 space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-8 w-24" />
    </div>
  ),
}
