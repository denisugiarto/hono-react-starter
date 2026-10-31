import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button, type ButtonAppearance, type ButtonColor, type ButtonSize } from './button'

const COLORS: ButtonColor[] = ['primary', 'secondary', 'neutral', 'success', 'warning', 'danger', 'info']
const APPEARANCES: ButtonAppearance[] = ['fill', 'soft', 'outline', 'ghost', 'link']
const SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
const ICON_SIZES: ButtonSize[] = ['icon-xs', 'icon-sm', 'icon', 'icon-lg', 'icon-xl']

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Simpan', color: 'primary', appearance: 'fill', size: 'md', disabled: false },
  argTypes: {
    color: { control: 'select', options: COLORS },
    appearance: { control: 'select', options: APPEARANCES },
    size: { control: 'select', options: [...SIZES, ...ICON_SIZES] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Mainkan kontrol `color`, `appearance`, `size`. */
export const Playground: Story = {}

/** Semua warna × semua tampilan. */
export const Matrix: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `auto repeat(${APPEARANCES.length}, auto)` }}>
      <span />
      {APPEARANCES.map((a) => (
        <span key={a} className="text-xs font-medium text-muted-foreground capitalize">
          {a}
        </span>
      ))}
      {COLORS.map((c) => (
        <>
          <span key={`${c}-label`} className="self-center text-xs font-medium text-muted-foreground capitalize">
            {c}
          </span>
          {APPEARANCES.map((a) => (
            <Button key={`${c}-${a}`} color={c} appearance={a}>
              Tombol
            </Button>
          ))}
        </>
      ))}
    </div>
  ),
}

/** Ukuran teks dan ikon. */
export const Sizes: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {SIZES.map((s) => (
          <Button key={s} size={s}>
            <PlusIcon /> Ukuran {s}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {ICON_SIZES.map((s) => (
          <Button key={s} size={s} color="neutral" appearance="outline" aria-label={`Ikon ${s}`}>
            <Trash2Icon />
          </Button>
        ))}
      </div>
    </div>
  ),
}

/** Status nonaktif untuk tiap tampilan. */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {APPEARANCES.map((a) => (
        <Button key={a} appearance={a} color="danger" disabled>
          {a}
        </Button>
      ))}
    </div>
  ),
}

export const WithIcon: Story = { args: { children: <><PlusIcon /> Tambah catatan</>, color: 'success' } }
