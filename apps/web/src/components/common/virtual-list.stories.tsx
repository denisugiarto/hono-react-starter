import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { VirtualList } from './virtual-list'
import { formatCurrency } from '@/lib/format'
import { Chip } from './chip'

type Row = { id: number; name: string; amount: number; note: string }
const rows: Row[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `Transaksi #${i + 1}`,
  amount: (i * 7919) % 5_000_000,
  note: i % 7 === 0 ? 'Catatan panjang yang membuat tinggi baris berbeda-beda. '.repeat((i % 3) + 1) : 'Lunas',
}))

const meta = {
  title: 'Common/VirtualList',
  component: VirtualList,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof VirtualList>
export default meta
type Story = StoryObj<typeof meta>

/** 10.000 baris tetap ringan: hanya ±15 elemen DOM yang hidup. */
export const TenThousandRows: Story = {
  args: { items: rows, renderItem: () => null },
  render: () => (
    <VirtualList
      items={rows}
      getKey={(r) => r.id}
      estimateSize={44}
      height={360}
      className="rounded-md border"
      renderItem={(r) => (
        <div className="flex h-11 items-center justify-between border-b px-3 text-sm">
          <span>{r.name}</span>
          <span className="tabular-nums text-muted-foreground">{formatCurrency(r.amount)}</span>
        </div>
      )}
    />
  ),
}

/** Tinggi baris diukur (prop `dynamic`). */
export const DynamicHeights: Story = {
  args: { items: rows, renderItem: () => null },
  render: () => (
    <VirtualList
      items={rows.slice(0, 500)}
      getKey={(r) => r.id}
      dynamic
      estimateSize={56}
      height={360}
      className="rounded-md border"
      renderItem={(r) => (
        <div className="border-b px-3 py-2 text-sm">
          <div className="font-medium">{r.name}</div>
          <p className="text-muted-foreground">{r.note}</p>
        </div>
      )}
    />
  ),
}

function InfiniteDemo() {
  const [count, setCount] = useState(50)
  const [loading, setLoading] = useState(false)
  const loadMore = () => {
    if (loading || count >= rows.length) return
    setLoading(true)
    setTimeout(() => {
      setCount((c) => Math.min(c + 50, rows.length))
      setLoading(false)
    }, 600)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <Chip color="info" appearance="soft">{count} dimuat</Chip>
        {loading && <span className="text-muted-foreground">Memuat…</span>}
      </div>
      <VirtualList
        items={rows.slice(0, count)}
        getKey={(r) => r.id}
        estimateSize={44}
        height={320}
        onEndReached={loadMore}
        className="rounded-md border"
        renderItem={(r) => (
          <div className="flex h-11 items-center justify-between border-b px-3 text-sm">
            <span>{r.name}</span>
            <span className="tabular-nums text-muted-foreground">{formatCurrency(r.amount)}</span>
          </div>
        )}
      />
    </div>
  )
}

/** `onEndReached` memuat halaman berikutnya saat mendekati akhir. */
export const InfiniteScroll: Story = {
  args: { items: rows, renderItem: () => null },
  render: () => <InfiniteDemo />,
}

export const Empty: Story = {
  args: { items: [], renderItem: () => null },
  render: () => <VirtualList items={[]} renderItem={() => null} height={160} className="rounded-md border" />,
}
