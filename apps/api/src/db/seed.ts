import { eq } from 'drizzle-orm'
import { auth } from '../auth.ts'
import { envIsProd } from '../env.ts'
import { db, client } from './index.ts'
import { user } from './schema.ts'

/**
 * Seed akun admin.
 *
 *   bun run db:seed
 *
 * Env opsional: ADMIN_EMAIL (default admin@example.com),
 *               ADMIN_PASSWORD (default admin123456 — dev saja),
 *               ADMIN_NAME (default Admin)
 * Jika email sudah ada, role-nya di-upgrade menjadi admin.
 * Di production ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi (tanpa default).
 */
const DEFAULT_PASSWORD = 'admin123456'

const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
const password = process.env.ADMIN_PASSWORD ?? DEFAULT_PASSWORD
const name = process.env.ADMIN_NAME ?? 'Admin'

if (envIsProd() && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  console.error('[seed] ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi di production')
  process.exit(1)
}
if (password.length < 8) {
  console.error('[seed] ADMIN_PASSWORD minimal 8 karakter')
  process.exit(1)
}

const existing = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, email))
  .limit(1)

if (existing.length > 0) {
  await db.update(user).set({ role: 'admin' }).where(eq(user.email, email))
  console.log(`Role ${email} di-upgrade menjadi admin ✔`)
} else {
  // Buat user baru lewat Better Auth API agar password ter-hash otomatis
  await auth.api.signUpEmail({
    body: { email, password, name },
  })
  await db.update(user).set({ role: 'admin' }).where(eq(user.email, email))
  console.log(`Admin dibuat: ${email} ✔`)
  if (password === DEFAULT_PASSWORD) {
    console.warn('[seed] Memakai password default — ganti segera (ADMIN_PASSWORD).')
  }
}

await client.end()
process.exit(0)
