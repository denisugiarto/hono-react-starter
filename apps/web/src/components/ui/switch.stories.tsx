import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldLabel } from './field'
import { Switch } from './switch'

const meta = { title: 'UI/Switch', component: Switch, args: { disabled: false } } satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field orientation="horizontal">
      <Switch id="sw" {...args} />
      <span className="flex flex-col">
        <FieldLabel htmlFor="sw">Notifikasi email</FieldLabel>
        <FieldDescription>Kirim ringkasan aktivitas harian.</FieldDescription>
      </span>
    </Field>
  ),
}
export const On: Story = { ...Default, args: { defaultChecked: true } }
export const Disabled: Story = { ...Default, args: { disabled: true } }
