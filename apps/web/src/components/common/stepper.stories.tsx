import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CreditCardIcon, PackageIcon, UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stepper } from './stepper'

const steps = [
  { label: 'Akun', description: 'Email & password', icon: UserIcon },
  { label: 'Alamat', description: 'Pengiriman' },
  { label: 'Pembayaran', description: 'Kartu / transfer', icon: CreditCardIcon },
  { label: 'Selesai', icon: PackageIcon },
]

const meta = {
  title: 'Common/Stepper',
  component: Stepper,
  parameters: { layout: 'padded' },
  args: { steps, current: 1, orientation: 'horizontal' },
  argTypes: { orientation: { control: 'select', options: ['horizontal', 'vertical'] }, current: { control: { type: 'number', min: 0, max: 4 } } },
} satisfies Meta<typeof Stepper>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = { render: (args) => <div className="w-[40rem] max-w-full"><Stepper {...args} /></div> }
export const Vertical: Story = { args: { orientation: 'vertical', current: 2 }, render: (args) => <div className="w-64"><Stepper {...args} /></div> }

function Wizard() {
  const [current, setCurrent] = useState(0)
  return (
    <div className="w-[40rem] max-w-full space-y-6">
      <Stepper steps={steps} current={current} onStepClick={setCurrent} />
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        {current < steps.length ? `Isi langkah "${steps[current]!.label}"` : 'Semua langkah selesai 🎉'}
      </div>
      <div className="flex gap-2">
        <Button color="neutral" appearance="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          Kembali
        </Button>
        <Button disabled={current >= steps.length} onClick={() => setCurrent((c) => c + 1)}>
          {current === steps.length - 1 ? 'Selesai' : 'Lanjut'}
        </Button>
      </div>
    </div>
  )
}
/** Wizard: langkah selesai bisa di-klik untuk kembali. */
export const WizardDemo: Story = { render: () => <Wizard /> }
