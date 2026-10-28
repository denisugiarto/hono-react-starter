import { useInfiniteQuery } from '@tanstack/react-query'
import { auditLogListSchema, type AuditLog, type AuditLogList } from '@hono-react-starter/shared'
import { request } from '@/lib/api/request'

export type AuditLogFilters = {
  /** Prefix aksi, mis. `auth.` / `admin.` / `note.`; kosong = semua. */
  action?: string
  /** 'true' | 'false' | undefined (semua). */
  success?: 'true' | 'false'
  actorId?: string
}

export const auditLogKeys = {
  all: ['admin', 'audit-logs'] as const,
  list: (filters: AuditLogFilters) => ['admin', 'audit-logs', filters] as const,
}

export function buildAuditLogsUrl(filters: AuditLogFilters, cursor?: string, limit = 50): string {
  const params = new URLSearchParams({ limit: String(limit) })
  if (filters.action) params.set('action', filters.action)
  if (filters.success) params.set('success', filters.success)
  if (filters.actorId) params.set('actorId', filters.actorId)
  if (cursor) params.set('cursor', cursor)
  return `/api/admin/audit-logs?${params.toString()}`
}

/** Audit log berhalaman (cursor) — admin. Halaman berikutnya via fetchNextPage(). */
export function useAuditLogs(filters: AuditLogFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: auditLogKeys.list(filters),
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<AuditLogList> =>
      auditLogListSchema.parse(await request<unknown>(buildAuditLogsUrl(filters, pageParam))),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export type { AuditLog }
