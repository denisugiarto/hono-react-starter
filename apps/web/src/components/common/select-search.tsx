import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

export type SelectSearchOption = {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
}

type Props = {
  options: SelectSearchOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  /** Lebar pemicu; konten popup mengikuti. */
  className?: string
  id?: string
  'aria-label'?: string
  'data-testid'?: string
  /** Render label pilihan di pemicu (default: label opsi). */
  renderValue?: (option: SelectSearchOption) => ReactNode
}

/**
 * Dropdown dengan pencarian (combobox satu pilihan) di atas Base UI Combobox:
 * tombol pemicu menampilkan pilihan, popup berisi kotak cari + daftar yang tersaring.
 * Nilai berupa `string | null` (controlled). Untuk banyak pilihan pakai primitif
 * `Combobox multiple` + `ComboboxChips`.
 *
 *   <SelectSearch options={cities} value={city} onChange={setCity} placeholder="Pilih kota" />
 */
export function SelectSearch({
  options,
  value,
  onChange,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyText = 'Tidak ada hasil.',
  disabled,
  className,
  id,
  renderValue,
  'aria-label': ariaLabel,
  'data-testid': testId = 'select-search',
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null
  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next: SelectSearchOption | null) => onChange(next?.value ?? null)}
      itemToStringLabel={(item: SelectSearchOption) => item.label}
      isItemEqualToValue={(a: SelectSearchOption, b: SelectSearchOption) => a.value === b.value}
      disabled={disabled}
    >
      <ComboboxTrigger id={id} aria-label={ariaLabel ?? placeholder} data-testid={testId} className={cn('w-56 justify-between', className)}>
        <ComboboxValue placeholder={placeholder}>
          {(item: SelectSearchOption | null) => (item ? (renderValue ? renderValue(item) : item.label) : placeholder)}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent data-testid={`${testId}-content`}>
        <ComboboxInput placeholder={searchPlaceholder} showTrigger={false} data-testid={`${testId}-search`} />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectSearchOption) => (
            <ComboboxItem key={item.value} value={item} disabled={item.disabled} data-testid={`${testId}-option`}>
              {item.icon && <item.icon />}
              <span className="flex flex-col">
                <span>{item.label}</span>
                {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
