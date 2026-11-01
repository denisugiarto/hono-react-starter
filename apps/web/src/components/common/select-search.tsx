import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Chip } from '@/components/common/chip'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'

export type SelectSearchOption = {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
  disabled?: boolean
}

type BaseProps = {
  options: SelectSearchOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Tampilkan kotak pencarian (popup, atau di dalam kotak chip saat `multiple`). Default true. */
  searchable?: boolean
  disabled?: boolean
  /** Lebar pemicu; konten popup mengikuti. */
  className?: string
  id?: string
  'aria-label'?: string
  'data-testid'?: string
  /** Render label pilihan di pemicu (mode satu pilihan; default: label opsi). */
  renderValue?: (option: SelectSearchOption) => ReactNode
  /** Mode banyak pilihan tanpa pencarian: jumlah chip di pemicu sebelum diringkas "+n". Default 2. */
  maxVisibleChips?: number
}

type SingleProps = BaseProps & { multiple?: false; value: string | null; onChange: (value: string | null) => void }
type MultipleProps = BaseProps & { multiple: true; value: string[]; onChange: (value: string[]) => void }
export type SelectSearchProps = SingleProps | MultipleProps

const toStringLabel = (item: SelectSearchOption) => item.label
const isEqual = (a: SelectSearchOption, b: SelectSearchOption) => a.value === b.value

/**
 * Dropdown pilihan di atas Base UI Combobox, empat mode dari dua opsi:
 *
 * | `multiple` | `searchable` | Tampilan |
 * | --- | --- | --- |
 * | false (default) | true (default) | tombol pemicu → popup: kotak cari + daftar |
 * | false | false | tombol pemicu → popup daftar saja (seperti Select biasa) |
 * | true | true | kotak chip + input cari di dalamnya → popup daftar bercentang |
 * | true | false | tombol pemicu berisi chip ringkas / "n dipilih" → popup daftar bercentang |
 *
 * Nilai controlled: `string | null` (satu) atau `string[]` (banyak).
 *
 *   <SelectSearch options={cities} value={city} onChange={setCity} placeholder="Pilih kota" />
 *   <SelectSearch multiple options={tags} value={tags} onChange={setTags} searchable={false} />
 */
export function SelectSearch(props: SelectSearchProps) {
  const {
    options,
    placeholder = 'Pilih…',
    searchPlaceholder = 'Cari…',
    emptyText = 'Tidak ada hasil.',
    searchable = true,
    disabled,
    className,
    id,
    renderValue,
    maxVisibleChips = 2,
    'aria-label': ariaLabel,
    'data-testid': testId = 'select-search',
  } = props
  const anchor = useComboboxAnchor()

  const list = (
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
  )

  if (props.multiple) {
    const selected = props.value.map((v) => options.find((o) => o.value === v)).filter((o): o is SelectSearchOption => Boolean(o))
    const onValueChange = (next: SelectSearchOption[]) => props.onChange(next.map((o) => o.value))
    return (
      <Combobox multiple items={options} value={selected} onValueChange={onValueChange} itemToStringLabel={toStringLabel} isItemEqualToValue={isEqual} disabled={disabled}>
        {searchable ? (
          <ComboboxChips ref={anchor} id={id} aria-label={ariaLabel ?? placeholder} data-testid={testId} className={cn('w-72', className)}>
            <ComboboxValue>
              {(items: SelectSearchOption[]) => (
                <>
                  {items.map((item) => (
                    <ComboboxChip key={item.value} data-testid={`${testId}-chip`}>
                      {item.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder={items.length === 0 ? placeholder : searchPlaceholder} data-testid={`${testId}-search`} />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
        ) : (
          <ComboboxTrigger id={id} aria-label={ariaLabel ?? placeholder} data-testid={testId} className={cn('h-auto min-h-8 w-72 justify-between py-1', className)}>
            <ComboboxValue placeholder={placeholder}>
              {(items: SelectSearchOption[]) =>
                items.length === 0 ? (
                  placeholder
                ) : (
                  <span className="flex flex-wrap items-center gap-1" data-testid={`${testId}-summary`}>
                    {items.slice(0, maxVisibleChips).map((item) => (
                      <Chip key={item.value} size="sm" appearance="soft">
                        {item.label}
                      </Chip>
                    ))}
                    {items.length > maxVisibleChips && (
                      <Chip size="sm" appearance="outline">
                        +{items.length - maxVisibleChips}
                      </Chip>
                    )}
                  </span>
                )
              }
            </ComboboxValue>
          </ComboboxTrigger>
        )}
        <ComboboxContent anchor={searchable ? anchor : undefined} data-testid={`${testId}-content`}>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          {list}
        </ComboboxContent>
      </Combobox>
    )
  }

  const selected = options.find((o) => o.value === props.value) ?? null
  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next: SelectSearchOption | null) => props.onChange(next?.value ?? null)}
      itemToStringLabel={toStringLabel}
      isItemEqualToValue={isEqual}
      disabled={disabled}
    >
      <ComboboxTrigger id={id} aria-label={ariaLabel ?? placeholder} data-testid={testId} className={cn('w-56 justify-between', className)}>
        <ComboboxValue placeholder={placeholder}>
          {(item: SelectSearchOption | null) => (item ? (renderValue ? renderValue(item) : item.label) : placeholder)}
        </ComboboxValue>
      </ComboboxTrigger>
      <ComboboxContent data-testid={`${testId}-content`}>
        {searchable && <ComboboxInput placeholder={searchPlaceholder} showTrigger={false} data-testid={`${testId}-search`} />}
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        {list}
      </ComboboxContent>
    </Combobox>
  )
}
