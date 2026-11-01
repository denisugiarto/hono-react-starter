import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from './progress'

const meta = { title: 'UI/Progress', component: Progress, parameters: { layout: 'padded' }, args: { value: 50 } } satisfies Meta<typeof Progress>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Progress value={62} className="w-80">
      <ProgressLabel>Unggah berkas</ProgressLabel>
      <ProgressValue />
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  ),
}

function Animated() {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setV((x) => (x >= 100 ? 0 : x + 10)), 600)
    return () => clearInterval(t)
  }, [])
  return (
    <Progress value={v} className="w-80">
      <ProgressLabel>Sinkronisasi</ProgressLabel>
      <ProgressValue />
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  )
}
export const AnimatedDemo: Story = { render: () => <Animated /> }
export const Indeterminate: Story = {
  render: () => (
    <Progress value={null} className="w-80">
      <ProgressLabel>Memproses…</ProgressLabel>
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  ),
}
