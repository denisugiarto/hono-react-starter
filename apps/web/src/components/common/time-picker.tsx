import { ClockIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

type Props = {
  /** "HH:mm" atau "HH:mm:ss"; null = kosong. */
  value: string | null
  onChange: (value: string | null) => void
  withSeconds?: boolean
  /** Langkah menit (default 1; mis. 15 → 00/15/30/45). */
  minuteStep?: number
  min?: string
  max?: string
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'data-testid'?: string
}

/**
 * Pemilih jam memakai `<input type="time">` native (keyboard & aksesibilitas bawaan,
 * roda jam di mobile) dengan ikon jam. Nilai string "HH:mm[:ss]" agar mudah disimpan;
 * gabungkan dengan tanggal lewat `combineDateTime()` (`lib/datetime.ts`).
 */
export function TimePicker({
  value,
  onChange,
  withSeconds = false,
  minuteStep = 1,
  min,
  max,
  disabled,
  id,
  className,
  'aria-label': ariaLabel = 'Jam',
  'aria-invalid': ariaInvalid,
  'data-testid': testId = 'time-picker',
}: Props) {
  // step dalam detik; adanya detik ditentukan step < 60
  const step = withSeconds ? 1 : minuteStep * 60
  return (
    <InputGroup className={cn('w-36', className)} data-testid={testId}>
      <InputGroupAddon>
        <ClockIcon />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="time"
        value={value ?? ''}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        data-testid={`${testId}-input`}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </InputGroup>
  )
}
