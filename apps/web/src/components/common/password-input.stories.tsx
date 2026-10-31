import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { PasswordInput } from './password-input'

const meta = {
  title: 'Common/PasswordInput',
  component: PasswordInput,
  args: { placeholder: '••••••••', disabled: false, defaultVisible: false },
  render: (args) => (
    <Field className="w-80">
      <FieldLabel htmlFor="sb-password">Password</FieldLabel>
      <PasswordInput id="sb-password" autoComplete="new-password" {...args} />
      <FieldDescription>Tombol mata menampilkan/menyembunyikan isi.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof PasswordInput>

export default meta
type Story = StoryObj<typeof meta>

export const Hidden: Story = {}
export const Visible: Story = { args: { defaultVisible: true, defaultValue: 'rahasia-123' } }
export const Disabled: Story = { args: { disabled: true, defaultValue: 'rahasia-123' } }
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'pendek' } }
