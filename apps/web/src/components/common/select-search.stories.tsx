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

function Demo(props: Partial<React.ComponentProps<typeof SelectSearch>>) {
  const [value, setValue] = useState<string | null>(props.value ?? null)
  return (
    <Field className="w-72">
      <FieldLabel htmlFor="kota">Kota</FieldLabel>
      <SelectSearch id="kota" options={cities} placeholder="Pilih kota" searchPlaceholder="Cari kota…" {...props} value={value} onChange={setValue} />
      <FieldDescription>Nilai: {value ?? '—'}</FieldDescription>
    </Field>
  )
}

const meta = {
  title: 'Common/SelectSearch',
  component: SelectSearch,
  render: (args) => <Demo {...args} />,
  args: { options: cities, value: null, onChange: () => {}, placeholder: 'Pilih kota' },
} satisfies Meta<typeof SelectSearch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Preselected: Story = { args: { value: 'bdg' } }
export const Disabled: Story = { args: { value: 'jkt', disabled: true } }
