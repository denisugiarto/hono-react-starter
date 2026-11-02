/**
 * Mock `fetch` untuk endpoint API: health, hello, notes (CRUD in-memory),
 * admin users. Semua respons memakai envelope standar. Atur `apiMock.fail.*`
 * untuk mensimulasikan error.
 */
import { ALL_PERMISSIONS, type Permissions } from '@hono-react-starter/shared'
import { sessionState } from './auth-client.ts'

export type Call = { method: string; url: string; body?: unknown }
export const fetchCalls: Call[] = []

type NoteRow = Record<string, unknown> & { id: string }
export const apiMock = {
  notes: [] as NoteRow[],
  fail: { create: false, update: false, delete: false, notes: false, admin: false, health: false, hello: false, audit: false, settings: false, settingsUpdate: false, permissions: false, roles: false, roleWrite: false },
  /** Permission per role untuk /api/me/permissions (role di luar daftar → kosong). */
  permissions: { admin: ALL_PERMISSIONS, user: { note: ['create', 'read', 'update', 'delete'] } } as Record<string, Permissions>,
  roles: [] as Array<{ name: string; description: string; permissions: Permissions; system: boolean; usersCount: number }>,
  settings: { requireEmailVerification: false, mailProvider: 'memory', emailVerificationReady: true, updatedAt: null as string | null, updatedBy: null as string | null },
  /** Jumlah entri audit yang disajikan (dua halaman bila > pageSize). */
  auditTotal: 3,
}

const auditItem = (i: number) => ({
  id: `a${i}`,
  at: new Date(Date.UTC(2026, 0, 1, 10, i)).toISOString(),
  actorId: i % 2 ? 'u2' : null,
  actorEmail: i % 2 ? 'root@test.local' : null,
  action: i % 2 ? 'admin.set_role' : 'auth.sign_in',
  success: i !== 2,
  targetType: i % 2 ? 'user' : null,
  targetId: i % 2 ? 'u3' : null,
  requestId: `req-${i}`,
  ip: '10.0.0.1',
  userAgent: 'test',
  metadata: i % 2 ? { role: 'admin' } : { email: 'x@test.local', status: 401 },
})

const sampleNote = (): NoteRow => ({
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'u1',
  title: 'Catatan pertama',
  content: 'isi',
  done: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const jsonResponse = (data: unknown, status = 200, message?: string) => {
  const body =
    status < 400
      ? { success: true, data, ...(message ? { message } : {}) }
      : { success: false, ...(data as Record<string, unknown>) }
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const originalFetch = globalThis.fetch

export function resetApiMock() {
  fetchCalls.length = 0
  apiMock.notes = [sampleNote()]
  apiMock.fail = {
    create: false,
    update: false,
    delete: false,
    notes: false,
    admin: false,
    health: false,
    hello: false,
    audit: false,
    settings: false,
    settingsUpdate: false,
    permissions: false,
    roles: false,
    roleWrite: false,
  }
  apiMock.permissions = { admin: ALL_PERMISSIONS, user: { note: ['create', 'read', 'update', 'delete'] } }
  apiMock.roles = [
    { name: 'admin', description: 'Akses penuh', permissions: ALL_PERMISSIONS, system: true, usersCount: 1 },
    { name: 'user', description: 'Pengguna biasa', permissions: { note: ['create', 'read', 'update', 'delete'] }, system: true, usersCount: 2 },
    { name: 'viewer', description: 'Hanya baca', permissions: { note: ['read'] }, system: false, usersCount: 0 },
  ]
  apiMock.settings = { requireEmailVerification: false, mailProvider: 'memory', emailVerificationReady: true, updatedAt: null, updatedBy: null }
  apiMock.auditTotal = 3
}

export function installFetchMock() {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    fetchCalls.push({ method, url, body })

    if (url.includes('/api/health')) {
      if (apiMock.fail.health) return new Response('x', { status: 503 })
      return jsonResponse({ status: 'ok', database: 'ok', uptime: 1.5, timestamp: new Date().toISOString() })
    }
    if (url.startsWith('/api/hello')) {
      if (apiMock.fail.hello) return jsonResponse({ code: 'INTERNAL_ERROR', message: 'rusak' }, 500)
      const name = new URL(url, 'http://x').searchParams.get('name')
      return jsonResponse({ greeting: `Hello, ${name}!`, from: 'mock', time: '' })
    }
    if (url === '/api/notes' && method === 'GET') {
      if (apiMock.fail.notes) return jsonResponse({ code: 'X', message: 'DB mati' }, 500)
      return jsonResponse(apiMock.notes)
    }
    if (url === '/api/notes' && method === 'POST') {
      if (apiMock.fail.create) return jsonResponse({ code: 'X', message: 'Gagal simpan' }, 500)
      const created = { ...sampleNote(), id: '22222222-2222-2222-2222-222222222222', ...body }
      apiMock.notes = [created, ...apiMock.notes]
      return jsonResponse(created, 201, 'Catatan dibuat')
    }
    if (url.startsWith('/api/notes/') && method === 'PATCH') {
      if (apiMock.fail.update) return jsonResponse({ code: 'X', message: 'Gagal mengubah' }, 500)
      apiMock.notes = apiMock.notes.map((n) => (url.endsWith(n.id) ? { ...n, ...body } : n))
      return jsonResponse(apiMock.notes[0])
    }
    if (url.startsWith('/api/notes/') && method === 'DELETE') {
      if (apiMock.fail.delete) return jsonResponse({ code: 'X', message: 'Gagal menghapus' }, 500)
      apiMock.notes = apiMock.notes.filter((n) => !url.endsWith(n.id))
      return jsonResponse({ id: 'x' }, 200, 'Catatan dihapus')
    }
    if (url.startsWith('/api/admin/audit-logs')) {
      if (apiMock.fail.audit) return jsonResponse({ code: 'FORBIDDEN', message: 'Audit ditolak' }, 403)
      const params = new URL(url, 'http://x').searchParams
      const pageSize = 2
      const all = Array.from({ length: apiMock.auditTotal }, (_, i) => auditItem(i))
        .filter((it) => !params.get('action') || it.action.startsWith(params.get('action')!))
        .filter((it) => !params.get('success') || String(it.success) === params.get('success'))
      const cursor = params.get('cursor')
      const start = cursor ? all.findIndex((it) => it.at === cursor) + 1 : 0
      const items = all.slice(start, start + pageSize)
      const last = items[items.length - 1]
      const nextCursor = start + pageSize < all.length && last ? last.at : null
      return jsonResponse({ items, nextCursor })
    }
    if (url === '/api/me/permissions') {
      if (apiMock.fail.permissions) return jsonResponse({ code: 'INTERNAL_ERROR', message: 'rusak' }, 500)
      const role = sessionState.data?.user.role ?? 'user'
      return jsonResponse({ role, permissions: apiMock.permissions[role] ?? {} })
    }
    if (url === '/api/admin/roles' && method === 'GET') {
      if (apiMock.fail.roles) return jsonResponse({ code: 'FORBIDDEN', message: 'Role ditolak' }, 403)
      return jsonResponse(apiMock.roles)
    }
    if (url === '/api/admin/roles' && method === 'POST') {
      if (apiMock.fail.roleWrite) return jsonResponse({ code: 'ROLE_EXISTS', message: 'Role sudah ada' }, 409)
      const input = body as { name: string; description?: string; permissions: Permissions }
      const role = { name: input.name, description: input.description ?? '', permissions: input.permissions, system: false, usersCount: 0 }
      apiMock.roles = [...apiMock.roles, role]
      return jsonResponse(role, 201, `Role "${role.name}" dibuat`)
    }
    if (url.startsWith('/api/admin/roles/') && method === 'PATCH') {
      if (apiMock.fail.roleWrite) return jsonResponse({ code: 'ROLE_LOCKED', message: 'Role admin tidak bisa diubah' }, 403)
      const name = decodeURIComponent(url.slice('/api/admin/roles/'.length))
      apiMock.roles = apiMock.roles.map((r) => (r.name === name ? { ...r, ...(body as object) } : r))
      return jsonResponse(apiMock.roles.find((r) => r.name === name), 200, 'Role disimpan')
    }
    if (url.startsWith('/api/admin/roles/') && method === 'DELETE') {
      if (apiMock.fail.roleWrite) return jsonResponse({ code: 'ROLE_IN_USE', message: 'Role masih dipakai' }, 409)
      const name = decodeURIComponent(url.slice('/api/admin/roles/'.length))
      apiMock.roles = apiMock.roles.filter((r) => r.name !== name)
      return jsonResponse({ name }, 200, `Role "${name}" dihapus`)
    }
    if (url === '/api/admin/settings' && method === 'GET') {
      if (apiMock.fail.settings) return jsonResponse({ code: 'FORBIDDEN', message: 'Pengaturan ditolak' }, 403)
      return jsonResponse(apiMock.settings)
    }
    if (url === '/api/admin/settings' && method === 'PATCH') {
      if (apiMock.fail.settingsUpdate) return jsonResponse({ code: 'MAIL_PROVIDER_REQUIRED', message: 'Butuh provider email sungguhan' }, 409)
      apiMock.settings = { ...apiMock.settings, ...(body as object), updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: 'u2' }
      return jsonResponse(apiMock.settings, 200, 'Pengaturan disimpan')
    }
    if (url === '/api/admin/users') {
      if (apiMock.fail.admin) return jsonResponse({ code: 'FORBIDDEN', message: 'Forbidden' }, 403)
      return jsonResponse([
        { id: 'u2', name: 'Root', email: 'root@x', role: 'admin', banned: false, createdAt: '' },
        { id: 'u3', name: 'Nakal', email: 'nakal@x', role: 'user', banned: true, createdAt: '' },
      ])
    }
    return jsonResponse({ code: 'NOT_FOUND', message: 'Not Found' }, 404)
  }) as typeof fetch
}

export function restoreFetch() {
  globalThis.fetch = originalFetch
}
