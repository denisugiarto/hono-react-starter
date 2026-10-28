import { useState } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorMessage } from '@/components/common/error-message'
import { LoadingState } from '@/components/common/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { summarizeMetadata } from '@/lib/format'
import { useAuditLogs, type AuditLogFilters } from '../api/audit-logs.ts'

const ACTION_GROUPS = [
  { value: '', label: 'Semua aksi' },
  { value: 'auth.', label: 'Autentikasi' },
  { value: 'admin.', label: 'Admin' },
  { value: 'note.', label: 'Catatan' },
] as const

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso))

/** Tabel audit log dengan filter (kelompok aksi, status) dan "Muat lebih banyak". */
export function AuditLogsTable() {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const logs = useAuditLogs(filters)
  const items = logs.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="audit-action">Aksi</Label>
          <select
            id="audit-action"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={filters.action ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined }))}
          >
            {ACTION_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-success">Status</Label>
          <select
            id="audit-success"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={filters.success ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, success: (e.target.value || undefined) as AuditLogFilters['success'] }))}
          >
            <option value="">Semua</option>
            <option value="true">Berhasil</option>
            <option value="false">Gagal</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => logs.refetch()} disabled={logs.isFetching}>
          Muat ulang
        </Button>
      </div>

      {logs.isPending ? (
        <LoadingState rows={5} label="Memuat audit log…" />
      ) : logs.isError ? (
        <ErrorMessage error={logs.error} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada entri audit" description="Aksi yang diaudit akan muncul di sini." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Pelaku</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatTime(row.at)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.action}</TableCell>
                  <TableCell>{row.actorEmail ?? row.actorId ?? <span className="text-muted-foreground">anonim</span>}</TableCell>
                  <TableCell className="text-muted-foreground">{row.targetId ? `${row.targetType ?? ''} ${row.targetId}`.trim() : '—'}</TableCell>
                  <TableCell>
                    {row.success ? <Badge variant="outline">berhasil</Badge> : <Badge variant="destructive">gagal</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.ip ?? '—'}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.requestId ?? undefined}>
                    {summarizeMetadata(row.metadata) || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {logs.hasNextPage && (
        <Button variant="outline" onClick={() => logs.fetchNextPage()} disabled={logs.isFetchingNextPage}>
          {logs.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      )}
    </div>
  )
}
