import { useEffect, useState, type ReactNode } from 'react'
import { roleCreateSchema, roleUpdateSchema, type Permissions, type RoleView } from '@hono-react-starter/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateRole, useUpdateRole } from '../api/roles.ts'
import { PermissionMatrix } from './permission-matrix.tsx'

export type RoleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Role yang diedit; kosong = buat baru. */
  role?: RoleView | null
  trigger?: ReactNode
}

type Errors = Partial<Record<'name' | 'description' | 'permissions', string>>

/**
 * Dialog buat/ubah role: nama (hanya saat buat), deskripsi, matriks permission.
 * Role `admin` hanya bisa dilihat (terkunci di server).
 */
export function RoleDialog({ open, onOpenChange, role }: RoleDialogProps) {
  const editing = Boolean(role)
  const locked = role?.name === 'admin'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<Permissions>({})
  const [errors, setErrors] = useState<Errors>({})
  const create = useCreateRole()
  const update = useUpdateRole()
  const saving = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    setName(role?.name ?? '')
    setDescription(role?.description ?? '')
    setPermissions(role?.permissions ?? {})
    setErrors({})
  }, [open, role])

  const firstError = (issues: { path: PropertyKey[]; message: string }[]): Errors => {
    const out: Errors = {}
    for (const i of issues) {
      const key = String(i.path[0] ?? 'permissions') as keyof Errors
      out[key] ??= i.message
    }
    return out
  }

  const submit = async () => {
    if (locked) return
    // Error sudah jadi toast di useRoleMutation; dialog tetap terbuka agar bisa diperbaiki.
    const succeeded = (p: Promise<unknown>) => p.then(() => true, () => false)
    let saved: boolean
    if (editing) {
      const parsed = roleUpdateSchema.safeParse({ description, permissions })
      if (!parsed.success) return setErrors(firstError(parsed.error.issues))
      saved = await succeeded(update.mutateAsync({ name: role!.name, ...parsed.data }))
    } else {
      const parsed = roleCreateSchema.safeParse({ name, description, permissions })
      if (!parsed.success) return setErrors(firstError(parsed.error.issues))
      saved = await succeeded(create.mutateAsync(parsed.data))
    }
    if (saved) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto sm:max-w-3xl" data-testid="role-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? (locked ? `Role ${role!.name}` : `Ubah role ${role!.name}`) : 'Role baru'}</DialogTitle>
          <DialogDescription>
            {locked
              ? 'Role admin selalu memiliki semua permission dan tidak bisa diubah.'
              : 'Permission berlaku seketika untuk semua pengguna dengan role ini (tanpa login ulang).'}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          {!editing && (
            <Field>
              <FieldLabel htmlFor="role-name">Nama</FieldLabel>
              <Input
                id="role-name"
                data-testid="role-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                placeholder="mis. editor"
                autoComplete="off"
              />
              <FieldDescription>Huruf kecil, angka, - atau _ (2–32 karakter). Tidak bisa diganti setelah dibuat.</FieldDescription>
              {errors.name && <FieldError errors={[{ message: errors.name }]} />}
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="role-description">Deskripsi</FieldLabel>
            <Input
              id="role-description"
              data-testid="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={locked}
              placeholder="Untuk siapa role ini"
            />
            {errors.description && <FieldError errors={[{ message: errors.description }]} />}
          </Field>
          <Field>
            <FieldLabel>Permission</FieldLabel>
            <PermissionMatrix value={permissions} onChange={setPermissions} readOnly={locked} />
            {errors.permissions && <FieldError errors={[{ message: errors.permissions }]} />}
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button color="neutral" appearance="outline" />}>{locked ? 'Tutup' : 'Batal'}</DialogClose>
          {!locked && (
            <Button data-testid="role-submit" onClick={submit} disabled={saving}>
              {saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Buat role'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
