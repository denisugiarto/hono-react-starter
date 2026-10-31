import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldError, FieldLabel } from './field'
import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'budi@example.com', disabled: false },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true, value: 'tidak bisa diubah' } }
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'bukan-email' } }

/** Pola form aplikasi: Field + FieldLabel + Input + FieldDescription/FieldError. */
export const InField: Story = {
  render: (args) => (
    <Field className="w-80">
      <FieldLabel htmlFor="sb-email">Email</FieldLabel>
      <Input id="sb-email" type="email" {...args} aria-invalid />
      <FieldDescription>Kami tidak membagikan email Anda.</FieldDescription>
      <FieldError errors={[{ message: 'Email tidak valid' }]} />
    </Field>
  ),
}
