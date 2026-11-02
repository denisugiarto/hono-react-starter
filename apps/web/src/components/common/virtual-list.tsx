import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useVirtualizer, type Rect } from '@tanstack/react-virtual'
import { EmptyState } from '@/components/common/empty-state'
import { LoadingState } from '@/components/common/loading-state'
import { cn } from '@/lib/utils'

export type VirtualListProps<T> = {
  items: readonly T[]
  /** Render satu baris; bungkus luar (posisi absolut) sudah disediakan. */
  renderItem: (item: T, index: number) => ReactNode
  /** Kunci stabil per item (default: index). */
  getKey?: (item: T, index: number) => string | number
  /** Perkiraan tinggi baris (px). Dengan `dynamic`, tinggi asli diukur setelah render. */
  estimateSize?: number
  /** Ukur tinggi baris sebenarnya (konten variabel). */
  dynamic?: boolean
  /** Tinggi area gulir (px atau CSS). Default 400px. */
  height?: number | string
  /** Baris ekstra di luar viewport yang tetap dirender. */
  overscan?: number
  /** Dipanggil saat baris ke-(n − `endReachedThreshold`) terlihat — untuk infinite scroll. */
  onEndReached?: () => void
  endReachedThreshold?: number
  isLoading?: boolean
  emptyState?: ReactNode
  /** Ukuran awal area gulir sebelum diukur (SSR/test). */
  initialRect?: Rect
  className?: string
  style?: CSSProperties
  'data-testid'?: string
}

/**
 * Daftar panjang yang hanya merender baris terlihat (TanStack Virtual).
 * Untuk tabel besar gunakan `DataTable` dengan paginasi; `VirtualList` cocok
 * untuk feed, log, hasil pencarian, dan daftar pilihan ribuan item.
 */
export function VirtualList<T>({
  items,
  renderItem,
  getKey,
  estimateSize = 40,
  dynamic = false,
  height = 400,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 3,
  isLoading = false,
  emptyState,
  initialRect,
  className,
  style,
  'data-testid': testId = 'virtual-list',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const count = items.length

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    initialRect,
    getItemKey: getKey ? (index) => getKey(items[index]!, index) : undefined,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastVisible = virtualItems.at(-1)?.index ?? -1
  const firedFor = useRef(-1)
  useEffect(() => {
    if (!onEndReached || count === 0) return
    if (lastVisible >= count - 1 - endReachedThreshold && firedFor.current !== count) {
      firedFor.current = count
      onEndReached()
    }
  }, [lastVisible, count, endReachedThreshold, onEndReached])

  if (isLoading && count === 0) return <LoadingState />
  if (!isLoading && count === 0) return <>{emptyState ?? <EmptyState title="Tidak ada data" />}</>

  return (
    <div
      ref={parentRef}
      data-testid={testId}
      className={cn('relative overflow-auto overscroll-contain', className)}
      style={{ height, ...style }}
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((row) => (
          <div
            key={row.key}
            data-testid={`${testId}-item`}
            data-index={row.index}
            ref={dynamic ? virtualizer.measureElement : undefined}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${row.start}px)`, ...(dynamic ? {} : { height: row.size }) }}
          >
            {renderItem(items[row.index]!, row.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
