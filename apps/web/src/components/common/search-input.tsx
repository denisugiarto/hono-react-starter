import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Loader2Icon, SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'defaultValue'> & {
  value?: string
  defaultValue?: string
  /** Dipanggil setiap ketikan (langsung). */
  onChange?: (value: string) => void
  /** Dipanggil setelah pengguna berhenti mengetik selama `debounceMs` (default 300). */
  onDebouncedChange?: (value: string) => void
  debounceMs?: number
  /** Spinner di kanan (mis. query sedang berjalan). */
  isLoading?: boolean
  clearLabel?: string
}

/**
 * Input pencarian: ikon kaca pembesar, tombol bersihkan saat ada isi, spinner opsional,
 * dan `onDebouncedChange` agar pemanggil tidak perlu debounce sendiri. Bisa
 * controlled (`value`) atau uncontrolled (`defaultValue`). Tombol × = `<testid>-clear`.
 */
export function SearchInput({
  value,
  defaultValue = '',
  onChange,
  onDebouncedChange,
  debounceMs = 300,
  isLoading = false,
  clearLabel = 'Bersihkan pencarian',
  className,
  placeholder = 'Cari…',
  disabled,
  ...props
}: Props) {
  const controlled = value !== undefined
  const [inner, setInner] = useState(defaultValue)
  const current = controlled ? value : inner
  const testId = (props as { 'data-testid'?: string })['data-testid'] ?? 'search-input'
  const inputRef = useRef<HTMLInputElement>(null)
  const debounced = useRef(onDebouncedChange)
  useEffect(() => {
    debounced.current = onDebouncedChange
  }, [onDebouncedChange])
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!debounced.current) return
    const t = setTimeout(() => debounced.current?.(current), debounceMs)
    return () => clearTimeout(t)
  }, [current, debounceMs])

  const update = (next: string) => {
    if (!controlled) setInner(next)
    onChange?.(next)
  }

  return (
    <div className={cn('relative', className)}>
      <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        role="searchbox"
        aria-label={props['aria-label'] ?? placeholder}
        {...props}
        value={current}
        onChange={(e) => update(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
        {isLoading ? (
          <Loader2Icon aria-label="Memuat" role="status" className="size-4 animate-spin text-muted-foreground" />
        ) : current ? (
          <button
            type="button"
            aria-label={clearLabel}
            data-testid={`${testId}-clear`}
            disabled={disabled}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={() => {
              update('')
              inputRef.current?.focus()
            }}
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </span>
    </div>
  )
}
