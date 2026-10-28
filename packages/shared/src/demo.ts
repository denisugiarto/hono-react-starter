/**
 * Akun & data demo untuk tester, E2E (apps/e2e), dan staging — BUKAN production.
 * Dibuat/direset oleh `bun run db:seed:demo` (apps/api/src/db/demo.ts).
 * Hanya konstanta murni di sini agar bisa diimpor Playwright tanpa menarik DB.
 */

export type DemoAccountKey = 'admin' | 'user' | 'totp' | 'banned'

export type DemoAccount = {
  key: DemoAccountKey
  email: string
  password: string
  name: string
  role: 'admin' | 'user'
  banned?: boolean
  /** Secret TOTP mentah (32 karakter) — tetap agar tester bisa memasangnya di authenticator. */
  totpSecret?: string
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { key: 'admin', email: 'admin@example.com', password: 'admin123456', name: 'Admin Demo', role: 'admin' },
  { key: 'user', email: 'user@example.com', password: 'user123456', name: 'Budi Pengguna', role: 'user' },
  {
    key: 'totp',
    email: 'totp@example.com',
    password: 'totp123456',
    name: 'Tari Dua Faktor',
    role: 'user',
    totpSecret: 'HONOREACTSTARTERDEMOTOTPSECRET32',
  },
  { key: 'banned', email: 'banned@example.com', password: 'banned123456', name: 'Bambang Diblokir', role: 'user', banned: true },
]

/** Kode cadangan tetap untuk akun totp (format sama dengan generator Better Auth). */
export const DEMO_BACKUP_CODES = ['demo1-aaaaa', 'demo2-bbbbb', 'demo3-ccccc', 'demo4-ddddd', 'demo5-eeeee'] as const

/** Catatan contoh milik akun `user` (selalu direset ke daftar ini). */
export const DEMO_NOTES = [
  { title: 'Coba alur login', content: 'Masuk dengan user@example.com lalu buka halaman Catatan.', done: true },
  { title: 'Uji tandai selesai', content: 'Klik kotak centang untuk menandai catatan ini.', done: false },
  { title: 'Uji hapus catatan', content: 'Hapus catatan ini dan pastikan toast muncul.', done: false },
] as const

export const demoAccount = (key: DemoAccountKey): DemoAccount => DEMO_ACCOUNTS.find((a) => a.key === key)!
