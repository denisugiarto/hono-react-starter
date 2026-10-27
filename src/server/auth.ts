import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { envIsTest, readAuthSecret, readBaseUrl } from './env.ts'
import { db } from './db/index.ts'
import * as schema from './db/schema.ts'

const baseURL = readBaseUrl()

export const auth = betterAuth({
  appName: 'Hono React Starter',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  // Validasi fail-fast: secret wajib minimal 32 karakter
  secret: readAuthSecret(),
  // Origin publik aplikasi. Dipakai untuk callback URL, CSRF (trustedOrigins)
  // dan menentukan cookie Secure (otomatis bila https).
  baseURL,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  advanced: {
    // Di belakang reverse proxy (nginx/Caddy/Fly/Railway/Cloudflare) IP asli
    // ada di header berikut — dipakai untuk rate limiting & tracking sesi.
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'],
    },
  },
  // Proteksi brute-force pada endpoint auth (sign-in/sign-up, dst.).
  // Dimatikan saat test agar suite tidak kena 429.
  rateLimit: {
    enabled: !envIsTest(),
    window: 60, // detik
    max: 20, // request per window per IP per endpoint
    storage: 'database', // persisten (tabel rate_limit)
  },
  plugins: [
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
    }),
  ],
})
