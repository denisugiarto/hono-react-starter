import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { formatDate, formatDateRange, type DateRangeValue } from '@/lib/datetime'
import { DatePicker, DateRangePicker } from './date-picker'

const meta = { title: 'Common/DatePicker', component: DatePicker, args: { value: null, onChange: () => {} } } satisfies Meta<typeof DatePicker>
export default meta
type Story = StoryObj<typeof meta>

function SingleDemo({ withTime = false, withSeconds = false }: { withTime?: boolean; withSeconds?: boolean }) {
  const [value, setValue] = useState<Date | null>(null)
  return (
    <Field className="w-72">
      <FieldLabel htmlFor="tgl">{withTime ? 'Tanggal & jam' : 'Tanggal'}</FieldLabel>
      <DatePicker id="tgl" value={value} onChange={setValue} withTime={withTime} withSeconds={withSeconds} />
      <FieldDescription>ISO: {value ? value.toISOString() : '—'}</FieldDescription>
    </Field>
  )
}
export const Single: Story = { render: () => <SingleDemo /> }
/** Date-time picker: kalender + TimePicker. */
export const WithTime: Story = { render: () => <SingleDemo withTime /> }
export const WithSeconds: Story = { render: () => <SingleDemo withTime withSeconds /> }
export const Bounded: Story = {
  render: () => {
    const today = new Date()
    return <DatePicker value={today} onChange={() => {}} minDate={new Date(today.getFullYear(), today.getMonth(), 1)} maxDate={new Date(today.getFullYear(), today.getMonth() + 1, 0)} />
  },
}

function RangeDemo({ presets }: { presets?: false }) {
  const [value, setValue] = useState<DateRangeValue | null>(null)
  return (
    <Field className="w-80">
      <FieldLabel htmlFor="rentang">Periode laporan</FieldLabel>
      <DateRangePicker id="rentang" value={value} onChange={setValue} presets={presets} />
      <FieldDescription>
        {value?.from ? `${formatDateRange(value)} (${formatDate(value.from, 'EEEE')}…)` : 'Belum dipilih'}
      </FieldDescription>
    </Field>
  )
}
/** Rentang dengan preset (Hari ini, 7 hari, 30 hari, bulan ini). */
export const Range: Story = { render: () => <RangeDemo /> }
export const RangeWithoutPresets: Story = { render: () => <RangeDemo presets={false} /> }
