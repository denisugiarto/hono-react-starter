import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { TagIcon } from 'lucide-react'
import { Chip, type ChipProps } from './chip'

const COLORS: NonNullable<ChipProps['color']>[] = ['primary', 'secondary', 'neutral', 'success', 'warning', 'danger', 'info']
const APPEARANCES: NonNullable<ChipProps['appearance']>[] = ['fill', 'soft', 'outline']

const meta = {
  title: 'Common/Chip',
  component: Chip,
  args: { children: 'Label', color: 'neutral', appearance: 'soft', size: 'md' },
  argTypes: {
    color: { control: 'select', options: COLORS },
    appearance: { control: 'select', options: APPEARANCES },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-2">
      {APPEARANCES.map((a) => (
        <div key={a} className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <Chip key={c} color={c} appearance={a} icon={TagIcon}>
              {c}
            </Chip>
          ))}
        </div>
      ))}
    </div>
  ),
}

function RemovableDemo() {
  const [tags, setTags] = useState(['React', 'Hono', 'Bun', 'Drizzle'])
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <Chip key={t} color="info" onRemove={() => setTags((xs) => xs.filter((x) => x !== t))}>
          {t}
        </Chip>
      ))}
      {tags.length === 0 && <span className="text-sm text-muted-foreground">Semua tag dihapus</span>}
    </div>
  )
}
/** Tag yang bisa dihapus (filter terpilih, input tag). */
export const Removable: Story = { parameters: { controls: { disable: true } }, render: () => <RemovableDemo /> }

function FilterDemo() {
  const [sel, setSel] = useState<string[]>(['aktif'])
  const toggle = (k: string) => (v: boolean) => setSel((xs) => (v ? [...xs, k] : xs.filter((x) => x !== k)))
  return (
    <div className="flex flex-wrap gap-2">
      {['aktif', 'banned', 'admin', 'belum verifikasi'].map((k) => (
        <Chip key={k} appearance="outline" selected={sel.includes(k)} onSelectedChange={toggle(k)}>
          {k}
        </Chip>
      ))}
    </div>
  )
}
/** Chip filter (toggle, aria-pressed). */
export const Filter: Story = { parameters: { controls: { disable: true } }, render: () => <FilterDemo /> }
