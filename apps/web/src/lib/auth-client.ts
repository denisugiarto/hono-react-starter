import { createAuthClient } from 'better-auth/react'
import { adminClient, jwtClient, twoFactorClient } from 'better-auth/client/plugins'
import { ac, roles } from '@hono-react-starter/shared/permissions'
import { tokenResponseSchema } from '@hono-react-starter/shared/auth'
import { apiCredentials, endpoints } from '@/config/endpoints'

/**
 * Client Better Auth untuk frontend.
 * baseURL mengikuti `config/endpoints` (VITE_API_URL): kosong → window.location.origin
 * (request ke /api/auth/* same-origin); terisi → API di origin lain dengan cookie `include`.
 *
 * - adminClient({ ac, roles }): method admin (listUsers, setRole, banUser, …)
 *   + `authClient.admin.checkRolePermission` dengan role/permission shared.
 * - jwtClient(): `authClient.jwks()`; token diambil lewat `getJwtToken()` di bawah.
 * - twoFactorClient(): `twoFactor.enable/verifyTotp/verifyBackupCode/disable`.
 *
 * Komponen mengimpor fungsi bernama di bawah (bukan `authClient.*` langsung)
 * supaya mudah di-mock di test (tests/mocks/auth-client.ts).
 */
export const authClient = createAuthClient({
  baseURL: endpoints.auth.baseUrl,
  fetchOptions: { credentials: apiCredentials },
  plugins: [adminClient({ ac, roles }), jwtClient(), twoFactorClient()],
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  changePassword,
  twoFactor,
} = authClient

/** URL absolut di origin frontend — untuk callbackURL/redirectTo di email. */
export const absoluteUrl = (path: string) => new URL(path, window.location.origin).toString()

/**
 * Terbitkan JWT untuk sesi saat ini (GET /api/auth/token).
 * Dipakai API client non-browser: `Authorization: Bearer <token>`.
 */
export async function getJwtToken(): Promise<string> {
  const res = await fetch(endpoints.auth.token, { credentials: apiCredentials })
  if (!res.ok) throw new Error(`Gagal membuat token (HTTP ${res.status})`)
  return tokenResponseSchema.parse(await res.json()).token
}
