import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Test interaksi: form auth, hello API, CRUD notes, JWT, panel admin, sign-out.
 * auth-client dan fetch di-mock; setiap panggilan dicatat untuk diverifikasi.
 */
const sessionState: { data: unknown; isPending: boolean } = { data: null, isPending: false }
const authCalls: { kind: string; payload?: unknown }[] = []
let authResult: { error: null | { message?: string } } = { error: null }
let jwtShouldFail = false

mock.module('@/lib/auth-client', () => ({
  useSession: () => sessionState,
  signIn: {
    email: async (payload: unknown) => {
      authCalls.push({ kind: 'signIn', payload })
      return authResult
    },
  },
  signUp: {
    email: async (payload: unknown) => {
      authCalls.push({ kind: 'signUp', payload })
      return authResult
    },
  },
  signOut: async () => {
    authCalls.push({ kind: 'signOut' })
    return {}
  },
  getJwtToken: async () => {
    authCalls.push({ kind: 'jwt' })
    if (jwtShouldFail) throw new Error('token gagal')
    return 'eyJ.header.sig'
  },
  authClient: {},
}))

const { default: App } = await import('../../src/App.tsx')

type Call = { method: string; url: string; body?: unknown }
const fetchCalls: Call[] = []
let notes: Record<string, unknown>[] = []
let failNextCreate = false

/** Bungkus dalam envelope standar: sukses → { success, data, message }, gagal → { success:false, code, message }. */
const jsonResponse = (data: unknown, status = 200, message?: string) => {
  const body =
    status < 400
      ? { success: true, data, ...(message ? { message } : {}) }
      : { success: false, ...(data as Record<string, unknown>) }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchCalls.length = 0
  authCalls.length = 0
  authResult = { error: null }
  jwtShouldFail = false
  failNextCreate = false
  notes = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      userId: 'u1',
      title: 'Catatan pertama',
      content: 'isi',
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    fetchCalls.push({ method, url, body })

    if (url.includes('/api/health')) {
      return jsonResponse({ status: 'ok', database: 'ok', uptime: 1, timestamp: new Date().toISOString() })
    }
    if (url.startsWith('/api/hello')) {
      const name = new URL(url, 'http://x').searchParams.get('name')
      return jsonResponse({ greeting: `Hello, ${name}!`, from: 'mock', time: '' })
    }
    if (url === '/api/notes' && method === 'GET') return jsonResponse(notes)
    if (url === '/api/notes' && method === 'POST') {
      if (failNextCreate) return jsonResponse({ code: 'X', message: 'Gagal simpan' }, 500)
      const created = { ...notes[0], id: '22222222-2222-2222-2222-222222222222', ...body }
      notes = [created, ...notes]
      return jsonResponse(created, 201, 'Catatan dibuat')
    }
    if (url.startsWith('/api/notes/') && method === 'PATCH') {
      notes = notes.map((n) => (url.endsWith(String(n.id)) ? { ...n, ...body } : n))
      return jsonResponse(notes[0])
    }
    if (url.startsWith('/api/notes/') && method === 'DELETE') {
      notes = notes.filter((n) => !url.endsWith(String(n.id)))
      return jsonResponse({ id: 'x' }, 200, 'Catatan dihapus')
    }
    if (url === '/api/admin/users') {
      return jsonResponse([
        { id: 'u2', name: 'Root', email: 'root@x', role: 'admin', banned: false, createdAt: '' },
        { id: 'u3', name: 'Nakal', email: 'nakal@x', role: 'user', banned: true, createdAt: '' },
      ])
    }
    return jsonResponse({ code: 'NOT_FOUND', message: 'Not Found' }, 404)
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

const typeInto = (el: HTMLElement, value: string) => fireEvent.input(el, { target: { value } })

describe('<App> — autentikasi', () => {
  test('masuk: validasi zod lalu signIn.email dipanggil', async () => {
    sessionState.data = null
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Email tidak valid')).toBeTruthy())
    expect(authCalls.length).toBe(0)

    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(authCalls[0]?.kind).toBe('signIn'))
    expect(authCalls[0]?.payload).toEqual({ email: 'alice@test.local', password: 'password123' })
  })

  test('daftar: pindah mode, nama wajib, signUp.email dipanggil', async () => {
    sessionState.data = null
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Daftar akun baru' }))
    // "Nama" juga label input Hello API → pakai placeholder form daftar
    expect(screen.getByPlaceholderText('Budi')).toBeTruthy()

    typeInto(screen.getByLabelText('Email'), 'bob@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    await waitFor(() => expect(screen.getByText('Nama wajib diisi')).toBeTruthy())

    typeInto(screen.getByPlaceholderText('Budi'), 'Bob')
    fireEvent.click(screen.getByRole('button', { name: 'Daftar' }))
    await waitFor(() => expect(authCalls[0]?.kind).toBe('signUp'))

    // kembali ke mode masuk
    fireEvent.click(screen.getByRole('button', { name: 'Sudah punya akun' }))
    expect(screen.queryByPlaceholderText('Budi')).toBeNull()
  })

  test('error dari Better Auth ditampilkan', async () => {
    sessionState.data = null
    authResult = { error: { message: 'Invalid email or password' } }
    renderApp()
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'salah-sekali')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeTruthy())
  })

  test('error tanpa pesan → fallback "Gagal autentikasi"', async () => {
    sessionState.data = null
    authResult = { error: {} }
    renderApp()
    typeInto(screen.getByLabelText('Email'), 'alice@test.local')
    typeInto(screen.getByLabelText('Password'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    await waitFor(() => expect(screen.getByText('Gagal autentikasi')).toBeTruthy())
  })

  test('keluar: signOut dipanggil', async () => {
    sessionState.data = { user: { id: 'u1', name: 'Alice', email: 'a@x', role: 'user' } }
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Keluar' }))
    await waitFor(() => expect(authCalls.some((c) => c.kind === 'signOut')).toBe(true))
  })

  test('sesi masih dimuat → skeleton, tanpa form', () => {
    sessionState.data = null
    sessionState.isPending = true
    renderApp()
    expect(screen.queryByRole('button', { name: 'Masuk' })).toBeNull()
    sessionState.isPending = false
  })
})

describe('<App> — JWT', () => {
  test('Buat token → token tampil, lalu "Perbarui token"', async () => {
    sessionState.data = { user: { id: 'u1', name: 'Alice', email: 'a@x', role: 'user' } }
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Buat token' }))
    await waitFor(() => expect(screen.getByText('eyJ.header.sig')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Perbarui token' })).toBeTruthy()
  })

  test('gagal membuat token → pesan error', async () => {
    sessionState.data = { user: { id: 'u1', name: 'Alice', email: 'a@x', role: 'user' } }
    jwtShouldFail = true
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Buat token' }))
    await waitFor(() => expect(screen.getByText('token gagal')).toBeTruthy())
  })
})

describe('<App> — Hello API', () => {
  test('tombol Kirim & Enter memanggil /api/hello', async () => {
    sessionState.data = null
    renderApp()
    typeInto(screen.getByPlaceholderText('World'), 'Budi')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(screen.getByText(/Hello, Budi!/)).toBeTruthy())

    typeInto(screen.getByPlaceholderText('World'), '')
    fireEvent.keyDown(screen.getByPlaceholderText('World'), { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(/Hello, World!/)).toBeTruthy())
  })

  test('API gagal → pesan gagal', async () => {
    sessionState.data = null
    const base = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.startsWith('/api/hello')) return jsonResponse({ code: 'INTERNAL_ERROR', message: 'rusak' }, 500)
      return base(input, init)
    }) as typeof fetch
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(screen.getByText('Gagal memanggil /api/hello')).toBeTruthy())
  })
})

describe('<App> — Notes', () => {
  const login = () => {
    sessionState.data = { user: { id: 'u1', name: 'Alice', email: 'a@x', role: 'user' } }
  }

  test('tambah catatan: validasi judul, lalu POST + refresh daftar', async () => {
    login()
    renderApp()
    await waitFor(() => expect(screen.getByText('Catatan pertama')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('title wajib diisi')).toBeTruthy())

    typeInto(screen.getByLabelText('Judul'), 'Catatan baru')
    typeInto(screen.getByLabelText('Isi (opsional)'), 'detail')
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('Catatan baru')).toBeTruthy())
    // pesan sukses dari envelope server ditampilkan
    expect(screen.getByRole('status').textContent).toBe('Catatan dibuat')
    const post = fetchCalls.find((c) => c.method === 'POST')
    expect(post?.body).toEqual({ title: 'Catatan baru', content: 'detail' })
  })

  test('tambah gagal → error mutation tampil', async () => {
    login()
    failNextCreate = true
    renderApp()
    typeInto(screen.getByLabelText('Judul'), 'X')
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }))
    await waitFor(() => expect(screen.getByText('Gagal simpan')).toBeTruthy())
  })

  test('toggle selesai → PATCH {done:true}', async () => {
    login()
    renderApp()
    const box = await screen.findByLabelText('Tandai "Catatan pertama" selesai')
    fireEvent.click(box)
    await waitFor(() => expect(fetchCalls.some((c) => c.method === 'PATCH')).toBe(true))
    expect(fetchCalls.find((c) => c.method === 'PATCH')?.body).toEqual({ done: true })
  })

  test('hapus → DELETE lalu daftar kosong', async () => {
    login()
    renderApp()
    fireEvent.click(await screen.findByLabelText('Hapus "Catatan pertama"'))
    await waitFor(() => expect(screen.getByText(/Belum ada catatan/)).toBeTruthy())
    expect(fetchCalls.some((c) => c.method === 'DELETE')).toBe(true)
  })

  test('daftar gagal dimuat → pesan error', async () => {
    login()
    const base = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url === '/api/notes') return jsonResponse({ code: 'X', message: 'DB mati' }, 500)
      return base(input, init)
    }) as typeof fetch
    renderApp()
    await waitFor(() => expect(screen.getByText('DB mati')).toBeTruthy())
  })
})

describe('<App> — panel admin & health', () => {
  test('admin: daftar user dengan badge role & banned', async () => {
    sessionState.data = { user: { id: 'u2', name: 'Root', email: 'root@x', role: 'admin' } }
    renderApp()
    await waitFor(() => expect(screen.getByText('Nakal')).toBeTruthy())
    expect(screen.getByText('banned')).toBeTruthy()
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
  })

  test('admin: endpoint gagal → error tampil', async () => {
    sessionState.data = { user: { id: 'u2', name: 'Root', email: 'root@x', role: 'admin' } }
    const base = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url === '/api/admin/users') return jsonResponse({ code: 'FORBIDDEN', message: 'Forbidden' }, 403)
      return base(input, init)
    }) as typeof fetch
    renderApp()
    await waitFor(() => expect(screen.getByText('Forbidden')).toBeTruthy())
  })

  test('health gagal → pesan HTTP', async () => {
    sessionState.data = null
    const base = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/api/health')) return new Response('x', { status: 503 })
      return base(input, init)
    }) as typeof fetch
    renderApp()
    await waitFor(() => expect(screen.getByText('HTTP 503')).toBeTruthy())
  })
})
