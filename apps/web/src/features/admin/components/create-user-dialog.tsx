import { useState } from 'react'
import { UserPlusIcon } from 'lucide-react'
import { PasswordInput } from '@/components/common/password-input'
import { SelectSearch } from '@/components/common/select-search'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useRoles } from '../api/roles.ts'
import { useCreateUser } from '../api/users.ts'

const EMPTY = { name: '', email: '', password: '', role: 'user' }

/** Tombol + dialog "Tambah pengguna" (admin): nama, email, password awal, role. */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const roles = useRoles(open)
  const create = useCreateUser()
  const valid = form.name.trim().length > 0 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8 && !!form.role

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <>
      <Button size="sm" data-testid="user-create" onClick={() => { setForm(EMPTY); setOpen(true) }}>
        <UserPlusIcon /> Tambah pengguna
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="user-create-dialog">
          <DialogHeader>
            <DialogTitle>Tambah pengguna</DialogTitle>
            <DialogDescription>Akun dibuat langsung aktif. Pengguna sebaiknya mengganti password awal.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-create-name">Nama</FieldLabel>
              <Input id="user-create-name" data-testid="user-create-name" value={form.name} onChange={(e) => set('name')(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-create-email">Email</FieldLabel>
              <Input id="user-create-email" data-testid="user-create-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-create-password">Password awal</FieldLabel>
              <PasswordInput id="user-create-password" data-testid="user-create-password" value={form.password} onChange={(e) => set('password')(e.target.value)} />
              <FieldDescription>Minimal 8 karakter; password yang pernah bocor ditolak server.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-create-role">Role</FieldLabel>
              <SelectSearch
                id="user-create-role"
                data-testid="user-create-role"
                searchable={false}
                options={(roles.data ?? []).map((r) => ({ value: r.name, label: r.name, description: r.description || undefined }))}
                value={form.role}
                onChange={(v) => set('role')(v ?? 'user')}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button color="neutral" appearance="outline" />}>Batal</DialogClose>
            <Button data-testid="user-create-submit" disabled={!valid || create.isPending} onClick={() => create.mutate(form, { onSuccess: () => setOpen(false) })}>
              Buat akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
