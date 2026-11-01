import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Field, FieldLabel } from './field'
import { Input } from './input'

const meta = { title: 'UI/Dialog', component: Dialog } satisfies Meta<typeof Dialog>
export default meta
type Story = StoryObj<typeof meta>

export const Form: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Ubah profil</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah profil</DialogTitle>
          <DialogDescription>Perubahan disimpan setelah menekan Simpan.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="dlg-name">Nama</FieldLabel>
          <Input id="dlg-name" defaultValue="Budi Pengguna" />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button color="neutral" appearance="outline" />}>Batal</DialogClose>
          <Button>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}
