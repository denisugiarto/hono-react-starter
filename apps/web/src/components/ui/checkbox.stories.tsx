import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
import { Field, FieldDescription, FieldLabel } from './field'

const meta = { title: 'UI/Checkbox', component: Checkbox, args: { disabled: false } } satisfies Meta<typeof Checkbox>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Checkbox id="cb" {...args} />
      <FieldLabel htmlFor="cb">Setuju dengan syarat & ketentuan</FieldLabel>
    </Field>
  ),
}
export const Checked: Story = { ...Default, args: { defaultChecked: true } }
export const Disabled: Story = { ...Default, args: { disabled: true, defaultChecked: true } }
export const WithDescription: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Checkbox id="cb2" {...args} />
      <span className="flex flex-col">
        <FieldLabel htmlFor="cb2">Kirim ringkasan mingguan</FieldLabel>
        <FieldDescription>Setiap Senin pukul 08.00.</FieldDescription>
      </span>
    </Field>
  ),
}
