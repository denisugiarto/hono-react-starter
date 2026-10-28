/**
 * Mock `fetch` untuk endpoint API: health, hello, notes (CRUD in-memory),
 * admin users. Semua respons memakai envelope standar. Atur `apiMock.fail.*`
 * untuk mensimulasikan error.
 */
export type Call = { method: string; url: string; body?: unknown }
export const fetchCalls: Call[] = []

type NoteRow = Record<string, unknown> & { id: string }
export const apiMock = {
  notes: [] as NoteRow[],
  fail: { create: false, notes: false, admin: false, health: false, hello: false },
}

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
  apiMock.fail = { create: false, notes: false, admin: false, health: false, hello: false }
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
      apiMock.notes = apiMock.notes.map((n) => (url.endsWith(n.id) ? { ...n, ...body } : n))
      return jsonResponse(apiMock.notes[0])
    }
    if (url.startsWith('/api/notes/') && method === 'DELETE') {
      apiMock.notes = apiMock.notes.filter((n) => !url.endsWith(n.id))
      return jsonResponse({ id: 'x' }, 200, 'Catatan dihapus')
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
