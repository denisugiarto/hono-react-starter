import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Props = { rows?: number; className?: string; label?: string }

/** Placeholder skeleton berulang untuk daftar / kartu yang sedang dimuat. */
export function LoadingState({ rows = 3, className, label = 'Memuat…' }: Props) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
