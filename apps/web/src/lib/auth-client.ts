import { createAuthClient } from 'better-auth/react'
import { adminClient, jwtClient, twoFactorClient } from 'better-auth/client/plugins'
import { ac, roles } from '@hono-react-starter/shared/permissions'
import { tokenResponseSchema } from '@hono-react-starter/shared/auth'

/**
 * Client Better Auth untuk frontend.
 * baseURL otomatis diambil dari window.location.origin,
 * jadi request mengarah ke /api/auth/* di origin yang sama.
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
  const res = await fetch('/api/auth/token', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Gagal membuat token (HTTP ${res.status})`)
  return tokenResponseSchema.parse(await res.json()).token
}
