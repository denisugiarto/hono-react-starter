import { APP_NAME } from '../auth.ts'
import { readDemoSeedAllowed } from '../env.ts'
import { client } from './index.ts'
import { DEMO_ACCOUNTS, DEMO_BACKUP_CODES, demoAccount, demoTotpUri, seedDemo } from './demo.ts'

/**
 * Seed akun & data demo untuk tester, E2E, dan staging.
 *
 *   bun run db:seed:demo
 *
 * Idempoten (boleh diulang untuk mereset skenario). Di production ditolak
 * kecuali ALLOW_DEMO_SEED=true karena password akun ini publik (lihat docs/QA.md).
 */
if (!readDemoSeedAllowed()) {
  console.error('[seed:demo] Ditolak di production. Set ALLOW_DEMO_SEED=true hanya untuk staging.')
  process.exit(1)
}

const result = await seedDemo()
const totp = demoAccount('totp')

console.log('Akun demo siap ✔')
console.table(DEMO_ACCOUNTS.map((a) => ({ akun: a.key, email: a.email, password: a.password, role: a.role, status: a.banned ? 'banned' : a.totpSecret ? '2FA' : 'aktif' })))
console.log(`Catatan contoh untuk ${demoAccount('user').email}: ${result.notes}`)
console.log(`2FA ${totp.email}\n  otpauth : ${demoTotpUri(APP_NAME)}\n  backup  : ${DEMO_BACKUP_CODES.join(', ')}`)

await client.end()
process.exit(0)
