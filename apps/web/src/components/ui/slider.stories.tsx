import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slider } from './slider'

const meta = { title: 'UI/Slider', component: Slider, parameters: { layout: 'padded' } } satisfies Meta<typeof Slider>
export default meta
type Story = StoryObj<typeof meta>

function SingleDemo() {
  const [v, setV] = useState(40)
  return (
    <div className="w-80 space-y-2">
      <Slider value={v} onValueChange={(x) => setV(x as number)} min={0} max={100} step={5} aria-label="Volume" />
      <p className="text-sm text-muted-foreground">Nilai: {v}</p>
    </div>
  )
}
export const Single: Story = { render: () => <SingleDemo /> }

function RangeDemo() {
  const [v, setV] = useState<number[]>([250_000, 1_500_000])
  const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  return (
    <div className="w-80 space-y-2">
      <Slider value={v} onValueChange={(x) => setV(x as number[])} min={0} max={2_000_000} step={50_000} aria-label="Rentang harga" />
      <p className="text-sm text-muted-foreground">
        {idr.format(v[0]!)} – {idr.format(v[1]!)}
      </p>
    </div>
  )
}
/** Dua thumb = rentang (filter harga, usia, dst.). */
export const Range: Story = { render: () => <RangeDemo /> }
export const Disabled: Story = { render: () => <Slider defaultValue={30} disabled aria-label="Nonaktif" className="w-80" /> }
