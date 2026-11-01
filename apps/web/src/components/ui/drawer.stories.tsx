import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from './drawer'

const meta = { title: 'UI/Drawer', component: Drawer } satisfies Meta<typeof Drawer>
export default meta
type Story = StoryObj<typeof meta>

export const Bottom: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger render={<Button color="neutral" appearance="outline" />}>Buka drawer</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter</DrawerTitle>
          <DrawerDescription>Geser ke bawah atau tekan Esc untuk menutup.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 text-sm text-muted-foreground">Isi drawer: form filter, detail item, atau aksi cepat di mobile.</div>
        <DrawerFooter>
          <Button>Terapkan</Button>
          <DrawerClose render={<Button color="neutral" appearance="outline" />}>Batal</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}
