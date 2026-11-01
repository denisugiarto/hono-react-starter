import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  DRAWER_SWIPE_DIRECTIONS,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  type DrawerProps,
} from './drawer'

const HINT: Record<NonNullable<DrawerProps['swipeDirection']>, string> = {
  down: 'Geser ke bawah atau tekan Esc untuk menutup.',
  up: 'Geser ke atas atau tekan Esc untuk menutup.',
  left: 'Geser ke kiri atau tekan Esc untuk menutup.',
  right: 'Geser ke kanan atau tekan Esc untuk menutup.',
}

function Demo({ swipeDirection = 'down', ...props }: DrawerProps) {
  return (
    <Drawer swipeDirection={swipeDirection} {...props}>
      <DrawerTrigger render={<Button color="neutral" appearance="outline" />}>Buka drawer ({swipeDirection})</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter</DrawerTitle>
          <DrawerDescription>{HINT[swipeDirection]}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 text-sm text-muted-foreground">Isi drawer: form filter, detail item, atau aksi cepat di mobile.</div>
        <DrawerFooter>
          <Button>Terapkan</Button>
          <DrawerClose render={<Button color="neutral" appearance="outline" />}>Batal</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

const meta = {
  title: 'UI/Drawer',
  component: Demo,
  args: { swipeDirection: 'down', showSwipeHandle: false, modal: true },
  argTypes: {
    swipeDirection: {
      control: 'inline-radio',
      options: DRAWER_SWIPE_DIRECTIONS,
      description: 'Arah geser untuk menutup = sisi tempat drawer muncul.',
    },
    showSwipeHandle: { control: 'boolean' },
    modal: { control: 'boolean' },
  },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

/** Bottom sheet (default) — pola umum di mobile. */
export const Bottom: Story = {}

/** Dari atas, mis. notifikasi/pengumuman. */
export const Top: Story = { args: { swipeDirection: 'up', showSwipeHandle: true } }

/** Panel kiri, mis. navigasi di layar kecil. */
export const Left: Story = { args: { swipeDirection: 'left', showSwipeHandle: true } }

/** Panel kanan, mis. detail item atau filter lanjutan. */
export const Right: Story = { args: { swipeDirection: 'right', showSwipeHandle: true } }

/** Dengan pegangan geser di tepi. */
export const WithSwipeHandle: Story = { args: { showSwipeHandle: true } }
