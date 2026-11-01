import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { TimePicker } from './time-picker'

const meta = { title: 'Common/TimePicker', component: TimePicker, args: { value: null, onChange: () => {} } } satisfies Meta<typeof TimePicker>
export default meta
type Story = StoryObj<typeof meta>

function Demo(props: Partial<React.ComponentProps<typeof TimePicker>>) {
  const [value, setValue] = useState<string | null>(props.value ?? null)
  return (
    <Field>
      <FieldLabel htmlFor="jam">Jam mulai</FieldLabel>
      <TimePicker id="jam" {...props} value={value} onChange={setValue} />
      <FieldDescription>Nilai: {value ?? '—'}</FieldDescription>
    </Field>
  )
}
export const Default: Story = { render: () => <Demo /> }
export const Step15: Story = { render: () => <Demo minuteStep={15} value="09:00" /> }
export const WithSeconds: Story = { render: () => <Demo withSeconds value="09:00:30" /> }
export const Disabled: Story = { render: () => <Demo value="09:00" disabled /> }
