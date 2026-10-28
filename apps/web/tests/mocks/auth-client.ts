/**
 * Mock modul `@/lib/auth-client` (Better Auth client). HARUS diimpor sebelum
 * modul aplikasi (lihat tests/utils.tsx). Ubah `sessionState` untuk
 * mensimulasikan belum login / login / sesi masih dimuat; `authMock.result`
 * untuk hasil sign-in/up; `authMock.responses` untuk method akun lain.
 */
import { mock } from 'bun:test'

export type MockUser = {
  id: string
  name: string
  email: string
  role?: string
  emailVerified?: boolean
  twoFactorEnabled?: boolean | null
}
export const sessionState: { data: { user: MockUser } | null; isPending: boolean } = {
  data: null,
  isPending: false,
}
export type AuthCallKind =
  | 'signIn'
  | 'signUp'
  | 'signOut'
  | 'jwt'
  | 'requestPasswordReset'
  | 'resetPassword'
  | 'sendVerificationEmail'
  | 'changePassword'
  | 'twoFactor.enable'
  | 'twoFactor.verifyTotp'
  | 'twoFactor.verifyBackupCode'
  | 'twoFactor.disable'
export const authCalls: { kind: AuthCallKind; payload?: unknown }[] = []

type Result = { data?: unknown; error: null | { message?: string; code?: string } }
export const authMock = {
  /** Hasil signIn.email / signUp.email */
  result: { error: null } as Result,
  jwtShouldFail: false,
  /** Hasil per method akun; default sukses tanpa data. */
  responses: {} as Partial<Record<AuthCallKind, Result>>,
}

const record = (kind: AuthCallKind) => async (payload: unknown) => {
  authCalls.push({ kind, payload })
  return authMock.responses[kind] ?? { data: {}, error: null }
}

export const asGuest = () => {
  sessionState.data = null
  sessionState.isPending = false
}
export const asUser = (overrides: Partial<MockUser> = {}) => {
  sessionState.data = {
    user: { id: 'u1', name: 'Alice Wonder', email: 'alice@test.local', role: 'user', emailVerified: true, ...overrides },
  }
  sessionState.isPending = false
}
export const asAdmin = () => asUser({ id: 'u2', name: 'Root', email: 'root@test.local', role: 'admin' })
export const resetAuthMock = () => {
  asGuest()
  authCalls.length = 0
  authMock.result = { error: null }
  authMock.jwtShouldFail = false
  authMock.responses = {}
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
  absoluteUrl: (path: string) => `http://localhost:5173${path}`,
  requestPasswordReset: record('requestPasswordReset'),
  resetPassword: record('resetPassword'),
  sendVerificationEmail: record('sendVerificationEmail'),
  changePassword: record('changePassword'),
  twoFactor: {
    enable: record('twoFactor.enable'),
    verifyTotp: record('twoFactor.verifyTotp'),
    verifyBackupCode: record('twoFactor.verifyBackupCode'),
    disable: record('twoFactor.disable'),
  },
  authClient: {},
}))
