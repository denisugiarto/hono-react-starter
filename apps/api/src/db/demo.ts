import { eq } from 'drizzle-orm'
import { symmetricEncrypt } from 'better-auth/crypto'
import { createOTP } from '@better-auth/utils/otp'
import { DEMO_ACCOUNTS, DEMO_BACKUP_CODES, DEMO_NOTES, demoAccount, type DemoAccount } from '@hono-react-starter/shared/demo'
import { auth } from '../auth.ts'
import { readAuthSecret } from '../env.ts'
import { db } from './index.ts'
import { notes, twoFactor, user } from './schema.ts'

/**
 * Seed data demo untuk tester / E2E / staging — BUKAN untuk production
 * (password publik; lihat readDemoSeedAllowed di env.ts). Daftar akun ada di
 * packages/shared/src/demo.ts agar E2E (apps/e2e) memakai konstanta yang sama.
 *
 * Idempoten: akun yang sudah ada diperbarui (role, status, 2FA, catatan)
 * sehingga `bun run db:seed:demo` bisa dijalankan berulang untuk mereset
 * skenario uji.
 */
export { DEMO_ACCOUNTS, DEMO_BACKUP_CODES, DEMO_NOTES, demoAccount, type DemoAccount }

/** Kode TOTP saat ini untuk akun totp (dipakai test & E2E). */
export const demoTotpCode = (secret = demoAccount('totp').totpSecret!) => createOTP(secret, { digits: 6, period: 30 }).totp()

/** otpauth:// URI untuk dipindai aplikasi authenticator. */
export const demoTotpUri = (issuer: string, account = demoAccount('totp')) =>
  createOTP(account.totpSecret!, { digits: 6, period: 30 }).url(issuer, account.email)

/** Pastikan user ada dengan role/status sesuai; dibuat lewat Better Auth agar password ter-hash. */
export async function ensureUser(account: DemoAccount): Promise<string> {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, account.email)).limit(1)
  let id = existing[0]?.id
  if (!id) {
    const created = await auth.api.signUpEmail({
      body: { email: account.email, password: account.password, name: account.name },
    })
    id = created.user.id
  }
  await db
    .update(user)
    .set({
      name: account.name,
      role: account.role,
      emailVerified: true,
      banned: account.banned ?? false,
      banReason: account.banned ? 'Akun demo untuk menguji alur pemblokiran' : null,
      banExpires: null,
      twoFactorEnabled: Boolean(account.totpSecret),
    })
    .where(eq(user.id, id))
  return id
}

/** Pasang 2FA dengan secret & kode cadangan tetap (menimpa yang lama). */
export async function ensureTwoFactor(userId: string, secret: string, backupCodes: readonly string[]) {
  await db.delete(twoFactor).where(eq(twoFactor.userId, userId))
  await db.insert(twoFactor).values({
    id: crypto.randomUUID(),
    userId,
    // Format sama dengan plugin twoFactor: secret dan JSON kode cadangan
    // dienkripsi simetris dengan BETTER_AUTH_SECRET (storeBackupCodes default = encrypted).
    secret: await symmetricEncrypt({ key: readAuthSecret(), data: secret }),
    backupCodes: await symmetricEncrypt({ key: readAuthSecret(), data: JSON.stringify(backupCodes) }),
    verified: true,
  })
}

/** Reset catatan user ke daftar yang diberikan. */
export async function ensureNotes(userId: string, items: readonly { title: string; content: string; done: boolean }[]) {
  await db.delete(notes).where(eq(notes.userId, userId))
  if (items.length === 0) return
  await db.insert(notes).values(items.map((n) => ({ ...n, userId })))
}

export type DemoSeedResult = { users: Record<DemoAccount['key'], string>; notes: number }

/** Jalankan seluruh seed demo. */
export async function seedDemo(): Promise<DemoSeedResult> {
  const users = {} as DemoSeedResult['users']
  for (const account of DEMO_ACCOUNTS) {
    const id = await ensureUser(account)
    users[account.key] = id
    if (account.totpSecret) await ensureTwoFactor(id, account.totpSecret, DEMO_BACKUP_CODES)
  }
  await ensureNotes(users.user, DEMO_NOTES)
  return { users, notes: DEMO_NOTES.length }
}
