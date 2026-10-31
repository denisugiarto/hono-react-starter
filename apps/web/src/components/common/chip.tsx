import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { CheckIcon, XIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-transparent font-medium whitespace-nowrap transition-colors select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      color: {
        primary: '[--chip:var(--primary)] [--chip-contrast:var(--primary-foreground)] [--chip-text:var(--primary)]',
        secondary: '[--chip:var(--secondary)] [--chip-contrast:var(--secondary-foreground)] [--chip-text:var(--secondary-foreground)]',
        neutral: '[--chip:var(--foreground)] [--chip-contrast:var(--background)] [--chip-text:var(--foreground)]',
        success: '[--chip:var(--success)] [--chip-contrast:var(--success-foreground)] [--chip-text:var(--success)]',
        warning: '[--chip:var(--warning)] [--chip-contrast:var(--warning-foreground)] [--chip-text:var(--warning)]',
        danger: '[--chip:var(--destructive)] [--chip-contrast:var(--destructive-foreground)] [--chip-text:var(--destructive)]',
        info: '[--chip:var(--info)] [--chip-contrast:var(--info-foreground)] [--chip-text:var(--info)]',
      },
      appearance: {
        fill: 'bg-(--chip) text-(--chip-contrast)',
        soft: 'bg-(--chip)/12 text-(--chip-text) dark:bg-(--chip)/20',
        outline: 'border-(--chip)/40 text-(--chip-text)',
      },
      size: {
        sm: 'h-6 px-2 text-xs [&_svg]:size-3',
        md: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',
        lg: 'h-8 px-3 text-sm [&_svg]:size-4',
      },
      interactive: {
        true: 'cursor-pointer outline-none hover:bg-(--chip)/20 focus-visible:ring-3 focus-visible:ring-(--chip)/30 aria-pressed:bg-(--chip) aria-pressed:text-(--chip-contrast) aria-pressed:border-transparent disabled:pointer-events-none disabled:opacity-50',
        false: '',
      },
    },
    compoundVariants: [
      { color: 'neutral', appearance: 'outline', class: 'border-border text-foreground' },
      { color: 'neutral', appearance: 'soft', class: 'bg-muted text-foreground dark:bg-muted' },
      { color: 'neutral', interactive: true, class: 'hover:bg-muted' },
    ],
    defaultVariants: { color: 'neutral', appearance: 'soft', size: 'md', interactive: false },
  },
)

type Base = Omit<ComponentProps<'span'>, 'color' | 'onSelect'> & Omit<VariantProps<typeof chipVariants>, 'interactive'>

export type ChipProps = Base & {
  icon?: LucideIcon
  /** Chip filter: tampil terpilih (centang) dan bisa di-klik. */
  selected?: boolean
  /** Dipanggil saat chip di-klik (menjadikannya tombol toggle). */
  onSelectedChange?: (selected: boolean) => void
  /** Tampilkan tombol × dan panggil saat dihapus. */
  onRemove?: () => void
  removeLabel?: string
  disabled?: boolean
  children: ReactNode
}

/**
 * Chip/tag: label kecil berwarna semantik (token sama dengan Button) dengan tiga mode:
 * - statis (`<Chip color="success">Aktif</Chip>`)
 * - bisa dihapus (`onRemove`) — mis. daftar filter terpilih, tag input
 * - filter toggle (`selected` + `onSelectedChange`) — tombol dengan `aria-pressed`
 */
export function Chip({
  className,
  color,
  appearance,
  size,
  icon: Icon,
  selected,
  onSelectedChange,
  onRemove,
  removeLabel = 'Hapus',
  disabled = false,
  children,
  ...props
}: ChipProps) {
  const toggle = typeof onSelectedChange === 'function'
  const classes = cn(chipVariants({ color, appearance, size, interactive: toggle }), className)
  const content = (
    <>
      {selected ? <CheckIcon aria-hidden /> : Icon ? <Icon aria-hidden /> : null}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`${removeLabel} ${typeof children === 'string' ? children : ''}`.trim()}
          data-testid="chip-remove"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="-mr-1 inline-flex size-4 items-center justify-center rounded-full opacity-70 outline-none hover:bg-black/10 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-(--chip)/50 disabled:pointer-events-none dark:hover:bg-white/15"
        >
          <XIcon />
        </button>
      )}
    </>
  )

  if (toggle) {
    return (
      <button
        type="button"
        aria-pressed={Boolean(selected)}
        disabled={disabled}
        data-slot="chip"
        className={classes}
        onClick={() => onSelectedChange?.(!selected)}
        {...(props as ComponentProps<'button'>)}
      >
        {content}
      </button>
    )
  }
  return (
    <span data-slot="chip" aria-disabled={disabled || undefined} className={cn(classes, disabled && 'opacity-50')} {...props}>
      {content}
    </span>
  )
}
