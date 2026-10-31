import type { ReactNode } from 'react'
import { MinusIcon, TrendingDownIcon, TrendingUpIcon, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type StatTrend = {
  /** Perubahan dalam persen; positif = naik. */
  value: number
  /** Keterangan pembanding, mis. "vs bulan lalu". */
  label?: string
}

type Props = {
  title: string
  value: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  trend?: StatTrend
  isLoading?: boolean
  className?: string
  'data-testid'?: string
}

const percent = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

/** Kartu angka ringkas untuk dashboard: judul, nilai besar, tren naik/turun, ikon. */
export function StatCard({ title, value, description, icon: Icon, trend, isLoading = false, className, 'data-testid': testId = 'stat-card' }: Props) {
  const direction = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'flat') : null
  const TrendIcon = direction === 'up' ? TrendingUpIcon : direction === 'down' ? TrendingDownIcon : MinusIcon
  return (
    <Card className={cn('gap-2 py-4', className)} data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      </CardHeader>
      <CardContent className="px-4">
        {isLoading ? (
          <Skeleton className="h-8 w-24" data-testid={`${testId}-loading`} />
        ) : (
          <div className="text-2xl font-semibold tracking-tight tabular-nums" data-testid={`${testId}-value`}>
            {value}
          </div>
        )}
        {(trend || description) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend && direction && (
              <span
                data-testid={`${testId}-trend`}
                data-direction={direction}
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  direction === 'up' && 'text-success',
                  direction === 'down' && 'text-destructive',
                )}
              >
                <TrendIcon className="size-3.5" aria-hidden />
                {percent.format(trend.value)}%
              </span>
            )}
            {trend?.label && <span>{trend.label}</span>}
            {description && <span>{description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
