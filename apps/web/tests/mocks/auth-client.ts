/**
 * Mock modul `@/lib/auth-client` (Better Auth client). HARUS diimpor sebelum
 * modul aplikasi (lihat tests/utils.tsx). Ubah `sessionState` untuk
 * mensimulasikan belum login / login / sesi masih dimuat.
 */
import { mock } from 'bun:test'

export type MockUser = { id: string; name: string; email: string; role?: string }
export const sessionState: { data: { user: MockUser } | null; isPending: boolean } = {
  data: null,
  isPending: false,
}
export const authCalls: { kind: 'signIn' | 'signUp' | 'signOut' | 'jwt'; payload?: unknown }[] = []
export const authMock = {
  result: { error: null } as { error: null | { message?: string } },
  jwtShouldFail: false,
}

export const asGuest = () => {
  sessionState.data = null
  sessionState.isPending = false
}
export const asUser = (overrides: Partial<MockUser> = {}) => {
  sessionState.data = { user: { id: 'u1', name: 'Alice Wonder', email: 'alice@test.local', role: 'user', ...overrides } }
  sessionState.isPending = false
}
export const asAdmin = () => asUser({ id: 'u2', name: 'Root', email: 'root@test.local', role: 'admin' })
export const resetAuthMock = () => {
  asGuest()
  authCalls.length = 0
  authMock.result = { error: null }
  authMock.jwtShouldFail = false
}

mock.module('@/lib/auth-client', () => ({
  useSession: () => sessionState,
  signIn: {
    email: async (payload: unknown) => {
      authCalls.push({ kind: 'signIn', payload })
      return authMock.result
    },
  },
  signUp: {
    email: async (payload: unknown) => {
      authCalls.push({ kind: 'signUp', payload })
      return authMock.result
    },
  },
  signOut: async () => {
    authCalls.push({ kind: 'signOut' })
    return {}
  },
  getJwtToken: async () => {
    authCalls.push({ kind: 'jwt' })
    if (authMock.jwtShouldFail) throw new Error('token gagal')
    return 'eyJ.header.sig'
  },
  authClient: {},
}))
