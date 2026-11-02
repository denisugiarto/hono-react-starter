import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { LockIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { RoleView } from '@hono-react-starter/shared'
import { DataTable } from '@/components/common/data-table'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDeleteRole, useRoles } from '../api/roles.ts'
import { RoleDialog } from './role-dialog.tsx'

const countPermissions = (r: RoleView) => Object.values(r.permissions).reduce((n, actions) => n + (actions?.length ?? 0), 0)

/** Tabel role + tombol buat/ubah/hapus; permission diatur lewat RoleDialog (matriks). */
export function RolesTable() {
  const roles = useRoles()
  const remove = useDeleteRole()
  const [editing, setEditing] = useState<RoleView | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<RoleView | null>(null)
  const onEditOpenChange = (open: boolean) => {
    if (!open) setEditing(null)
  }
  const onDeleteOpenChange = (open: boolean) => {
    if (!open) setDeleting(null)
  }

  const columns: ColumnDef<RoleView, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Role',
      enableHiding: false,
      meta: { label: 'Role', className: 'font-medium' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code>{row.original.name}</code>
          {row.original.system && (
            <Badge variant="outline" className="gap-1">
              <LockIcon className="size-3" /> sistem
            </Badge>
          )}
        </div>
      ),
    },
    { accessorKey: 'description', header: 'Deskripsi', meta: { label: 'Deskripsi', className: 'text-muted-foreground' } },
    {
      id: 'permissions',
      header: 'Permission',
      meta: { label: 'Permission', align: 'right' },
      accessorFn: countPermissions,
      cell: ({ row }) => <span className="tabular-nums">{countPermissions(row.original)}</span>,
    },
    {
      accessorKey: 'usersCount',
      header: 'Pengguna',
      meta: { label: 'Pengguna', align: 'right' },
      cell: ({ row }) => <span className="tabular-nums">{row.original.usersCount}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableHiding: false,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const r = row.original
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon-sm"
              color="neutral"
              appearance="ghost"
              aria-label={r.name === 'admin' ? `Lihat role ${r.name}` : `Ubah role ${r.name}`}
              data-testid="role-edit"
              onClick={() => setEditing(r)}
            >
              <PencilIcon />
            </Button>
            <Button
              size="icon-sm"
              color="danger"
              appearance="ghost"
              aria-label={`Hapus role ${r.name}`}
              data-testid="role-delete"
              disabled={r.system || r.usersCount > 0}
              onClick={() => setDeleting(r)}
            >
              <Trash2Icon />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        data-testid="roles-table"
        columns={columns}
        data={roles.data ?? []}
        isLoading={roles.isPending}
        loadingLabel="Memuat role…"
        error={roles.isError ? roles.error : undefined}
        emptyTitle="Belum ada role"
        pageSize={0}
        rowProps={(r) => ({ 'data-testid': 'role-row', 'data-role': r.name })}
        toolbar={
          <Button size="sm" data-testid="role-create" onClick={() => setCreating(true)}>
            <PlusIcon /> Role baru
          </Button>
        }
      />
      <RoleDialog open={creating} onOpenChange={setCreating} />
      <RoleDialog open={editing !== null} onOpenChange={onEditOpenChange} role={editing} />
      <AlertDialog open={deleting !== null} onOpenChange={onDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Hanya role yang tidak dipakai pengguna yang bisa dihapus. Tindakan ini dicatat di audit log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              color="danger"
              data-testid="role-delete-confirm"
              onClick={() => {
                if (deleting) remove.mutate(deleting.name)
                onDeleteOpenChange(false)
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
