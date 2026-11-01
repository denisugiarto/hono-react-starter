import { CheckIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Step = { label: string; description?: string; icon?: LucideIcon }
export type StepStatus = 'complete' | 'current' | 'upcoming'

type Props = {
  steps: Step[]
  /** Index langkah aktif (0-based). Nilai ≥ steps.length = semua selesai. */
  current: number
  orientation?: 'horizontal' | 'vertical'
  /** Langkah yang sudah selesai bisa di-klik untuk kembali. */
  onStepClick?: (index: number) => void
  className?: string
  'data-testid'?: string
}

export const stepStatus = (index: number, current: number): StepStatus => (index < current ? 'complete' : index === current ? 'current' : 'upcoming')

/**
 * Indikator langkah (wizard, checkout, onboarding). Presentasional: isi langkah
 * dirender pemanggil berdasarkan `current`. Semantik: `<ol>` dengan `aria-current="step"`.
 *
 *   <Stepper steps={[{ label: 'Akun' }, { label: 'Profil' }, { label: 'Selesai' }]} current={1} />
 */
export function Stepper({ steps, current, orientation = 'horizontal', onStepClick, className, 'data-testid': testId = 'stepper' }: Props) {
  const vertical = orientation === 'vertical'
  return (
    <ol
      data-testid={testId}
      data-orientation={orientation}
      className={cn('flex', vertical ? 'flex-col gap-0' : 'w-full items-start', className)}
    >
      {steps.map((step, i) => {
        const status = stepStatus(i, current)
        const Icon = step.icon
        const clickable = Boolean(onStepClick) && status === 'complete'
        const last = i === steps.length - 1
        const circle = (
          <span
            aria-hidden
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
              status === 'complete' && 'border-primary bg-primary text-primary-foreground',
              status === 'current' && 'border-primary text-primary',
              status === 'upcoming' && 'border-border text-muted-foreground',
            )}
          >
            {status === 'complete' ? <CheckIcon className="size-4" /> : Icon ? <Icon className="size-4" /> : i + 1}
          </span>
        )
        const text = (
          <span className={cn('flex flex-col', vertical ? 'pb-6' : 'mt-2 items-center text-center')}>
            <span className={cn('text-sm font-medium', status === 'upcoming' && 'text-muted-foreground')}>{step.label}</span>
            {step.description && <span className="text-xs text-muted-foreground">{step.description}</span>}
          </span>
        )
        const connector = !last && (
          <span
            aria-hidden
            data-testid={`${testId}-connector`}
            className={cn('bg-border', vertical ? 'ml-4 w-0.5 flex-1' : 'mt-4 h-0.5 flex-1', status === 'complete' && 'bg-primary')}
          />
        )
        const inner = vertical ? (
          <span className="flex gap-3">
            {circle}
            {text}
          </span>
        ) : (
          <span className="flex flex-col items-center">
            {circle}
            {text}
          </span>
        )
        return (
          <li
            key={step.label}
            data-testid={`${testId}-step`}
            data-status={status}
            aria-current={status === 'current' ? 'step' : undefined}
            className={cn('flex', vertical ? 'flex-col' : 'flex-1 items-start', last && !vertical && 'flex-none')}
          >
            {clickable ? (
              <button type="button" onClick={() => onStepClick?.(i)} className="rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {inner}
              </button>
            ) : (
              inner
            )}
            {vertical ? connector : null}
            {!vertical && connector}
          </li>
        )
      })}
    </ol>
  )
}
