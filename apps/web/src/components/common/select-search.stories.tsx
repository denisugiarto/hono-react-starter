import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BuildingIcon } from 'lucide-react'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { SelectSearch, type SelectSearchOption } from './select-search'

const cities: SelectSearchOption[] = [
  { value: 'jkt', label: 'Jakarta', description: 'DKI Jakarta', icon: BuildingIcon },
  { value: 'bdg', label: 'Bandung', description: 'Jawa Barat', icon: BuildingIcon },
  { value: 'sby', label: 'Surabaya', description: 'Jawa Timur', icon: BuildingIcon },
  { value: 'mdn', label: 'Medan', description: 'Sumatera Utara', icon: BuildingIcon },
  { value: 'dps', label: 'Denpasar', description: 'Bali', icon: BuildingIcon },
  { value: 'mks', label: 'Makassar', description: 'Sulawesi Selatan', icon: BuildingIcon, disabled: true },
]

type DemoProps = { multiple?: boolean; searchable?: boolean; disabled?: boolean; initial?: string | string[] | null; maxVisibleChips?: number }

function Demo({ multiple = false, searchable = true, disabled, initial = null, maxVisibleChips }: DemoProps) {
  const [single, setSingle] = useState<string | null>(typeof initial === 'string' ? initial : null)
  const [multi, setMulti] = useState<string[]>(Array.isArray(initial) ? initial : [])
  const common = { id: 'kota', options: cities, placeholder: multiple ? 'Pilih kota (bisa banyak)' : 'Pilih kota', searchPlaceholder: 'Cari kota…', searchable, disabled, maxVisibleChips }
  return (
    <Field className="w-80">
      <FieldLabel htmlFor="kota">Kota</FieldLabel>
      {multiple ? <SelectSearch multiple {...common} value={multi} onChange={setMulti} /> : <SelectSearch {...common} value={single} onChange={setSingle} />}
      <FieldDescription>Nilai: {multiple ? (multi.length ? multi.join(', ') : '—') : (single ?? '—')}</FieldDescription>
    </Field>
  )
}

const meta = {
  title: 'Common/SelectSearch',
  component: Demo,
  args: { multiple: false, searchable: true, disabled: false },
  argTypes: { initial: { control: false } },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

/** Satu pilihan dengan kotak cari (default). */
export const Default: Story = {}
export const Preselected: Story = { args: { initial: 'bdg' } }
export const Disabled: Story = { args: { initial: 'jkt', disabled: true } }
/** `searchable={false}`: popup hanya daftar, seperti Select biasa. */
export const WithoutSearch: Story = { args: { searchable: false, initial: 'jkt' } }
/** `multiple`: chip per pilihan + input cari di dalam kotak. */
export const Multiple: Story = { args: { multiple: true, initial: ['jkt', 'bdg'] } }
/** `multiple` + `searchable={false}`: pemicu meringkas chip, popup daftar bercentang. */
export const MultipleWithoutSearch: Story = { args: { multiple: true, searchable: false, initial: ['jkt', 'bdg', 'sby'], maxVisibleChips: 2 } }
