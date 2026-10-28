import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = { title: string; description?: ReactNode; action?: ReactNode; className?: string; 'data-testid'?: string }

/** Kotak bergaris putus untuk kondisi kosong (belum ada data). */
export function EmptyState({ title, description, action, className, 'data-testid': testId }: Props) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center',
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
