import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Contoh test komponen dengan API & sesi di-mock.
 * Pola: mock modul auth-client (useSession) + fetch global.
 */
const sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false }

mock.module('@/lib/auth-client', () => ({
  useSession: () => sessionState,
  signIn: { email: async () => ({ error: null }) },
  signUp: { email: async () => ({ error: null }) },
  signOut: async () => ({}),
  getJwtToken: async () => 'header.payload.signature',
  authClient: {},
}))

const { default: App } = await import('../../src/App.tsx')

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.includes('/api/health')) {
      return jsonResponse({ status: 'ok', uptime: 1.5, timestamp: new Date().toISOString() })
    }
    if (url.includes('/api/notes')) {
      return jsonResponse([
        {
          id: '1',
          userId: 'u1',
          title: 'Catatan pertama',
          content: '',
          done: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
    }
    return jsonResponse({ error: 'Not Found', code: 'NOT_FOUND' }, 404)
  }) as typeof fetch
})

afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

describe('<App>', () => {
  test('belum login: form masuk tampil, notes meminta login', async () => {
    sessionState.data = null
    renderApp()
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeTruthy()
    expect(screen.getByText(/Masuk terlebih dahulu/)).toBeTruthy()
    await waitFor(() => expect(screen.getByText('ok')).toBeTruthy())
  })

  test('sudah login: menampilkan nama user dan daftar notes', async () => {
    sessionState.data = {
      user: { id: 'u1', name: 'Alice', email: 'alice@test.local', role: 'user' },
    }
    renderApp()
    expect(screen.getByText('Alice')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Catatan pertama')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Buat token' })).toBeTruthy()
    // user biasa: tidak punya permission user:list → panel admin disembunyikan
    expect(screen.queryByText(/Panel Admin/)).toBeNull()
  })

  test('admin: panel admin tampil (permission user:list)', async () => {
    sessionState.data = {
      user: { id: 'u2', name: 'Root', email: 'root@test.local', role: 'admin' },
    }
    renderApp()
    expect(screen.getByText(/Panel Admin/)).toBeTruthy()
  })
})
