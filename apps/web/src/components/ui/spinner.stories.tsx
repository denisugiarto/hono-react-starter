import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingState } from '@/components/common/loading-state'
import { Button } from './button'
import { Spinner } from './spinner'

const meta = { title: 'UI/Spinner', component: Spinner } satisfies Meta<typeof Spinner>
export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner className="size-3" />
      <Spinner />
      <Spinner className="size-6" />
      <Spinner className="size-8 text-primary" />
    </div>
  ),
}
export const InButton: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button disabled>
        <Spinner /> Menyimpan…
      </Button>
      <Button color="neutral" appearance="outline" disabled>
        <Spinner /> Memuat
      </Button>
    </div>
  ),
}
/** Placeholder skeleton untuk daftar/kartu (`LoadingState`). */
export const SkeletonList: Story = { parameters: { layout: 'padded' }, render: () => <LoadingState rows={4} label="Memuat data…" className="w-96" /> }
