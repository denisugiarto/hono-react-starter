import type { ColumnDef } from '@tanstack/react-table'
import type { AdminUser } from '@hono-react-starter/shared'
import { DataTable } from '@/components/common/data-table'
import { Badge } from '@/components/ui/badge'
import { useAdminUsers } from '../api/users.ts'
import { CreateUserDialog } from './create-user-dialog.tsx'
import { UserActions } from './user-actions.tsx'

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })
const formatDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d)
}

export const userColumns: ColumnDef<AdminUser, unknown>[] = [
  { accessorKey: 'name', header: 'Nama', enableHiding: false, meta: { label: 'Nama', className: 'font-medium' } },
  { accessorKey: 'email', header: 'Email', meta: { label: 'Email', className: 'text-muted-foreground' } },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { label: 'Role' },
    cell: ({ row }) => <Badge variant={row.original.role === 'admin' ? 'destructive' : 'secondary'}>{row.original.role ?? 'user'}</Badge>,
  },
  {
    accessorKey: 'banned',
    header: 'Status',
    meta: { label: 'Status' },
    cell: ({ row }) =>
      row.original.banned ? (
        <Badge variant="outline" className="text-destructive">
          banned
        </Badge>
      ) : (
        <Badge variant="outline">aktif</Badge>
      ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Terdaftar',
    meta: { label: 'Terdaftar', className: 'text-muted-foreground whitespace-nowrap' },
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    id: 'actions',
    header: '',
    enableHiding: false,
    enableSorting: false,
    meta: { align: 'right' },
    cell: ({ row }) => <UserActions user={row.original} />,
  },
]

/** Tabel semua pengguna (admin): pencarian, sorting, paginasi, pilih kolom, aksi per baris, tambah pengguna. */
export function UsersTable() {
  const users = useAdminUsers(true)
  return (
    <DataTable
      data-testid="users-table"
      columns={userColumns}
      data={users.data ?? []}
      isLoading={users.isPending}
      loadingLabel="Memuat pengguna…"
      error={users.isError ? users.error : undefined}
      emptyTitle="Belum ada pengguna"
      searchable
      searchPlaceholder="Cari nama atau email…"
      columnToggle
      toolbar={<CreateUserDialog />}
      rowProps={(u) => ({ 'data-testid': 'user-row', 'data-email': u.email })}
    />
  )
}
