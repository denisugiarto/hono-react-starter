import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, FieldDescription, FieldLabel } from './field'
import { RadioGroup, RadioGroupItem } from './radio-group'

const meta = { title: 'UI/RadioGroup', component: RadioGroup } satisfies Meta<typeof RadioGroup>
export default meta
type Story = StoryObj<typeof meta>

const plans = [
  { value: 'free', label: 'Gratis', description: '1 proyek, 100 MB' },
  { value: 'pro', label: 'Pro', description: 'Proyek tak terbatas, 10 GB' },
  { value: 'team', label: 'Tim', description: 'Pro + anggota & audit log' },
]

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="pro" aria-label="Paket" className="gap-3">
      {plans.map((p) => (
        <Field key={p.value} orientation="horizontal">
          <RadioGroupItem id={`plan-${p.value}`} value={p.value} />
          <span className="flex flex-col">
            <FieldLabel htmlFor={`plan-${p.value}`}>{p.label}</FieldLabel>
            <FieldDescription>{p.description}</FieldDescription>
          </span>
        </Field>
      ))}
    </RadioGroup>
  ),
}
export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="a" disabled className="flex gap-4" aria-label="Nonaktif">
      <Field orientation="horizontal">
        <RadioGroupItem id="ra" value="a" />
        <FieldLabel htmlFor="ra">A</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="rb" value="b" />
        <FieldLabel htmlFor="rb">B</FieldLabel>
      </Field>
    </RadioGroup>
  ),
}
