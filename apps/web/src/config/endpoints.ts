import { buildUrl, type QueryParams } from '@/lib/api/url'

/**
 * Semua URL endpoint API di satu tempat (pasangan `paths.ts` untuk route halaman).
 *
 * Base URL dibaca dari `VITE_API_URL` saat build. Kosong (default) = same-origin:
 * saat dev Vite memproxy `/api` ke backend, saat production API menyajikan `dist`.
 * Isi `VITE_API_URL=https://api.example.com` bila frontend di-host terpisah (CDN/
 * static hosting); cookie sesi lalu dikirim dengan `credentials: 'include'` dan
 * origin frontend harus ada di `TRUSTED_ORIGINS` backend (CORS + CSRF).
 */
export function normalizeBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? ''
  if (!trimmed) return ''
  return new URL(trimmed).origin + new URL(trimmed).pathname.replace(/\/+$/, '')
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL)
export const API_PREFIX = '/api'
export const isCrossOriginApi = API_BASE_URL !== ''
/** Mode cookie untuk fetch: same-origin (default) atau include bila API di origin lain. */
export const apiCredentials: RequestCredentials = isCrossOriginApi ? 'include' : 'same-origin'

export type AuditLogQuery = { limit?: number; action?: string; success?: 'true' | 'false'; actorId?: string; cursor?: string }

export function createEndpoints(baseUrl = API_BASE_URL) {
  const api = (path: string) => `${baseUrl}${API_PREFIX}${path}`
  return {
    base: api(''),
    health: api('/health'),
    hello: (name: string) => buildUrl(api('/hello'), { name }),
    auth: {
      /** Dipakai Better Auth client sebagai baseURL (menambahkan /api/auth sendiri). */
      baseUrl: baseUrl || undefined,
      token: api('/auth/token'),
    },
    notes: {
      list: api('/notes'),
      byId: (id: string) => api(`/notes/${encodeURIComponent(id)}`),
    },
    me: {
      permissions: api('/me/permissions'),
    },
    admin: {
      users: api('/admin/users'),
      roles: api('/admin/roles'),
      role: (name: string) => api(`/admin/roles/${encodeURIComponent(name)}`),
      auditLogs: (query: AuditLogQuery & QueryParams = {}) => buildUrl(api('/admin/audit-logs'), query),
      settings: api('/admin/settings'),
    },
  }
}

export const endpoints = createEndpoints()
export type Endpoints = ReturnType<typeof createEndpoints>
