import { useState, type ReactNode } from 'react'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon, XIcon } from 'lucide-react'
import { addDays, startOfDay, startOfMonth, subDays } from 'date-fns'
import { TimePicker } from '@/components/common/time-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { combineDateTime, DATE_FORMAT, DATE_TIME_FORMAT, DEFAULT_LOCALE, formatDate, formatDateRange, toTimeString, type DateRangeValue } from '@/lib/datetime'
import { cn } from '@/lib/utils'

type CommonProps = {
  placeholder?: string
  disabled?: boolean
  /** Tombol × untuk mengosongkan nilai. Default true. */
  clearable?: boolean
  minDate?: Date
  maxDate?: Date
  locale?: typeof DEFAULT_LOCALE
  className?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'data-testid'?: string
}

type TriggerProps = CommonProps & { label: string; empty: boolean; onClear: () => void; testId: string; children: ReactNode }

/** Tombol pemicu bersama: ikon kalender, label/placeholder, tombol bersihkan. */
function DateTrigger({ label, empty, onClear, clearable = true, disabled, className, id, testId, children, ...rest }: TriggerProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative inline-flex', className)}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              color="neutral"
              appearance="outline"
              disabled={disabled}
              aria-label={rest['aria-label'] ?? label}
              aria-invalid={rest['aria-invalid']}
              data-testid={testId}
              data-empty={empty || undefined}
              className={cn('w-full justify-start font-normal', empty && 'text-muted-foreground', clearable && !empty && 'pr-8')}
            />
          }
        >
          <CalendarIcon className="text-muted-foreground" />
          <span className="truncate">{label}</span>
        </PopoverTrigger>
        {clearable && !empty && !disabled && (
          <button
            type="button"
            aria-label="Bersihkan tanggal"
            data-testid={`${testId}-clear`}
            onClick={onClear}
            className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-0" align="start" data-testid={`${testId}-content`}>
        {children}
      </PopoverContent>
    </Popover>
  )
}

export type DatePickerProps = CommonProps & {
  value: Date | null
  onChange: (value: Date | null) => void
  /** Tampilkan pemilih jam di bawah kalender (nilai menyimpan jam). */
  withTime?: boolean
  withSeconds?: boolean
  /** Pola date-fns untuk label. Default `d MMM yyyy` (atau `… HH:mm` bila `withTime`). */
  format?: string
}

/**
 * Pemilih tanggal (satu nilai) berbasis Popover + Calendar (react-day-picker, locale id).
 * `withTime` menambahkan `TimePicker` → menjadi date-time picker; nilai tetap `Date`.
 *
 *   <DatePicker value={date} onChange={setDate} placeholder="Pilih tanggal" />
 *   <DatePicker withTime value={at} onChange={setAt} />
 */
export function DatePicker({ value, onChange, withTime = false, withSeconds = false, format, placeholder = 'Pilih tanggal', minDate, maxDate, locale = DEFAULT_LOCALE, 'data-testid': testId = 'date-picker', ...rest }: DatePickerProps) {
  const pattern = format ?? (withTime ? (withSeconds ? 'd MMM yyyy HH:mm:ss' : DATE_TIME_FORMAT) : DATE_FORMAT)
  const label = value ? formatDate(value, pattern, locale) : placeholder
  const time = toTimeString(value, withSeconds) || null

  const pick = (day: Date | undefined) => {
    if (!day) return onChange(null)
    onChange(withTime ? combineDateTime(day, time ?? (withSeconds ? '00:00:00' : '00:00')) : startOfDay(day))
  }

  return (
    <DateTrigger label={label} empty={!value} onClear={() => onChange(null)} testId={testId} {...rest}>
      <Calendar
        mode="single"
        selected={value ?? undefined}
        onSelect={pick}
        locale={locale}
        defaultMonth={value ?? undefined}
        disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
        autoFocus
      />
      {withTime && (
        <div className="flex items-center gap-2 border-t p-2">
          <span className="text-xs text-muted-foreground">Jam</span>
          <TimePicker
            value={time}
            withSeconds={withSeconds}
            disabled={!value}
            data-testid={`${testId}-time`}
            onChange={(t) => value && onChange(combineDateTime(value, t ?? '00:00'))}
          />
        </div>
      )}
    </DateTrigger>
  )
}

export type DateRangePreset = { label: string; range: () => DateRangeValue }

/** Preset umum untuk laporan. */
export const DEFAULT_RANGE_PRESETS: DateRangePreset[] = [
  { label: 'Hari ini', range: () => ({ from: startOfDay(new Date()), to: startOfDay(new Date()) }) },
  { label: '7 hari terakhir', range: () => ({ from: startOfDay(subDays(new Date(), 6)), to: startOfDay(new Date()) }) },
  { label: '30 hari terakhir', range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: startOfDay(new Date()) }) },
  { label: 'Bulan ini', range: () => ({ from: startOfMonth(new Date()), to: startOfDay(new Date()) }) },
  { label: '7 hari ke depan', range: () => ({ from: startOfDay(new Date()), to: startOfDay(addDays(new Date(), 6)) }) },
]

export type DateRangePickerProps = CommonProps & {
  value: DateRangeValue | null
  onChange: (value: DateRangeValue | null) => void
  numberOfMonths?: number
  /** Daftar preset di sisi kiri; `false` menyembunyikan. Default DEFAULT_RANGE_PRESETS. */
  presets?: DateRangePreset[] | false
  format?: string
}

/**
 * Pemilih rentang tanggal: dua bulan berdampingan + preset. Nilai `{ from, to }`
 * (`to` null selama pengguna baru memilih tanggal awal).
 */
export function DateRangePicker({ value, onChange, numberOfMonths = 2, presets = DEFAULT_RANGE_PRESETS, format = DATE_FORMAT, placeholder = 'Pilih rentang', minDate, maxDate, locale = DEFAULT_LOCALE, 'data-testid': testId = 'date-range-picker', ...rest }: DateRangePickerProps) {
  const label = value?.from ? formatDateRange(value, format, locale) : placeholder
  const selected: DateRange | undefined = value?.from ? { from: value.from, to: value.to ?? undefined } : undefined

  const pick = (range: DateRange | undefined) => {
    if (!range?.from) return onChange(null)
    onChange({ from: startOfDay(range.from), to: range.to ? startOfDay(range.to) : null })
  }

  return (
    <DateTrigger label={label} empty={!value?.from} onClear={() => onChange(null)} testId={testId} {...rest}>
      <div className="flex flex-col sm:flex-row">
        {presets && presets.length > 0 && (
          <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0" data-testid={`${testId}-presets`}>
            {presets.map((p) => (
              <Button key={p.label} color="neutral" appearance="ghost" size="sm" className="justify-start" onClick={() => onChange(p.range())}>
                {p.label}
              </Button>
            ))}
          </div>
        )}
        <Calendar
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={selected}
          onSelect={pick}
          locale={locale}
          defaultMonth={value?.from ?? undefined}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          autoFocus
        />
      </div>
    </DateTrigger>
  )
}
