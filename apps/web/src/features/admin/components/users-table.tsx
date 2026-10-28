import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { LoadingState } from '@/components/common/loading-state'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminUsers } from '../api/users.ts'

/** Tabel semua pengguna (admin): nama, email, role, status. */
export function UsersTable() {
  const users = useAdminUsers(true)

  if (users.isPending) return <LoadingState rows={3} label="Memuat pengguna…" />
  if (users.isError) return <ErrorMessage error={users.error} />
  if (users.data.length === 0) return <EmptyState title="Belum ada pengguna" />

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.data.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'}>{u.role ?? 'user'}</Badge>
              </TableCell>
              <TableCell>
                {u.banned ? (
                  <Badge variant="outline" className="text-destructive">
                    banned
                  </Badge>
                ) : (
                  <Badge variant="outline">aktif</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
