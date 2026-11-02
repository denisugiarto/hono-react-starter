import { useState } from 'react'
import { BanIcon, KeyRoundIcon, LogOutIcon, MoreHorizontalIcon, ShieldOffIcon, Trash2Icon } from 'lucide-react'
import type { AdminUser } from '@hono-react-starter/shared'
import { Dropdown } from '@/components/common/dropdown'
import { SelectSearch } from '@/components/common/select-search'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth'
import { useRoles } from '../api/roles.ts'
import { useBanUser, useRemoveUser, useRevokeUserSessions, useSetUserRole, useUnbanUser } from '../api/users.ts'

type DialogKind = 'role' | 'ban' | 'remove' | null

/**
 * Menu aksi per baris pengguna (admin): ubah role, blokir/cabut blokir, cabut sesi, hapus.
 * Aksi pada akun sendiri dinonaktifkan agar admin tidak mengunci dirinya.
 */
export function UserActions({ user }: { user: AdminUser }) {
  const { user: me } = useAuth()
  const self = me?.id === user.id
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [role, setRole] = useState<string | null>(user.role ?? 'user')
  const [reason, setReason] = useState('')
  const roles = useRoles(dialog === 'role')
  const setUserRole = useSetUserRole()
  const ban = useBanUser()
  const unban = useUnbanUser()
  const revoke = useRevokeUserSessions()
  const remove = useRemoveUser()

  const close = () => setDialog(null)
  /** Dipakai Dialog/AlertDialog (Esc, klik luar, tombol tutup) dan setelah aksi sukses. */
  const onDialogOpenChange = (open: boolean) => {
    if (!open) close()
  }

  return (
    <>
      <Dropdown
        trigger={
          <Button size="icon-sm" color="neutral" appearance="ghost" aria-label={`Aksi untuk ${user.email}`} data-testid="user-actions" disabled={self}>
            <MoreHorizontalIcon />
          </Button>
        }
        items={[
          { label: 'Ubah role', icon: KeyRoundIcon, onSelect: () => { setRole(user.role ?? 'user'); setDialog('role') } },
          user.banned
            ? { label: 'Cabut blokir', icon: ShieldOffIcon, onSelect: () => unban.mutate({ userId: user.id }) }
            : { label: 'Blokir', icon: BanIcon, onSelect: () => { setReason(''); setDialog('ban') } },
          { label: 'Cabut semua sesi', icon: LogOutIcon, onSelect: () => revoke.mutate({ userId: user.id }) },
          { type: 'separator' },
          { label: 'Hapus pengguna', icon: Trash2Icon, destructive: true, onSelect: () => setDialog('remove') },
        ]}
      />

      <Dialog open={dialog === 'role'} onOpenChange={onDialogOpenChange}>
        <DialogContent data-testid="user-role-dialog">
          <DialogHeader>
            <DialogTitle>Ubah role {user.name}</DialogTitle>
            <DialogDescription>Semua sesi pengguna dicabut sehingga role baru berlaku saat ia masuk kembali.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-role-select">Role</FieldLabel>
              <SelectSearch
                id="user-role-select"
                data-testid="user-role-select"
                searchable={false}
                options={(roles.data ?? []).map((r) => ({ value: r.name, label: r.name, description: r.description || undefined }))}
                value={role}
                onChange={setRole}
                placeholder={roles.isPending ? 'Memuat role…' : 'Pilih role'}
              />
              <FieldDescription>Definisi role diatur di halaman Role & permission.</FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button color="neutral" appearance="outline" />}>Batal</DialogClose>
            <Button
              data-testid="user-role-submit"
              disabled={!role || role === (user.role ?? 'user') || setUserRole.isPending}
              onClick={() => role && setUserRole.mutate({ userId: user.id, role }, { onSuccess: () => onDialogOpenChange(false) })}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'ban'} onOpenChange={onDialogOpenChange}>
        <DialogContent data-testid="user-ban-dialog">
          <DialogHeader>
            <DialogTitle>Blokir {user.name}?</DialogTitle>
            <DialogDescription>Pengguna tidak bisa masuk sampai blokir dicabut; sesi aktifnya dihentikan.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-ban-reason">Alasan (opsional)</FieldLabel>
              <Input id="user-ban-reason" data-testid="user-ban-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button color="neutral" appearance="outline" />}>Batal</DialogClose>
            <Button
              color="danger"
              data-testid="user-ban-submit"
              disabled={ban.isPending}
              onClick={() => ban.mutate({ userId: user.id, ...(reason.trim() ? { banReason: reason.trim() } : {}) }, { onSuccess: () => onDialogOpenChange(false) })}
            >
              Blokir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === 'remove'} onOpenChange={onDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {user.email}?</AlertDialogTitle>
            <AlertDialogDescription>Akun, sesi, dan catatannya dihapus permanen. Tindakan dicatat di audit log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction color="danger" data-testid="user-remove-confirm" onClick={() => remove.mutate({ userId: user.id }, { onSettled: () => onDialogOpenChange(false) })}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
