import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

/**
 * Client Better Auth untuk frontend.
 * baseURL otomatis diambil dari window.location.origin,
 * jadi request mengarah ke /api/auth/* di origin yang sama.
 *
 * adminClient menambah method admin: authClient.admin.listUsers(),
 * authClient.admin.setRole(), authClient.admin.banUser(), dll.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
