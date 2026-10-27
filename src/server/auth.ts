import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { bearer } from 'better-auth/plugins/bearer'
import { jwt } from 'better-auth/plugins/jwt'
import { ac, roles } from '../shared/permissions.ts'
import { envIsTest, readAuthSecret, readBaseUrl } from './env.ts'
import { db } from './db/index.ts'
import * as schema from './db/schema.ts'

const baseURL = readBaseUrl()

/** Masa berlaku JWT. Pendek karena stateless (tidak bisa dicabut sebelum expired). */
export const JWT_EXPIRATION = '15m'

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
    storage: 'database', // tabel rate_limit
  },
  plugins: [
    // RBAC: role di kolom user.role + permission (ac/roles dari src/shared/permissions.ts)
    admin({
      defaultRole: 'user',
      adminRoles: ['admin'],
      ac,
      roles,
    }),
    // Bearer: klien non-browser bisa memakai `Authorization: Bearer <session token>`
    // (token dari header `set-auth-token` saat sign-in) ke endpoint auth & API.
    bearer(),
    // JWT: `GET /api/auth/token` menerbitkan JWT (EdDSA) yang ditandatangani
    // kunci di tabel `jwks`; verifikasi publik via `GET /api/auth/jwks`.
    jwt({
      jwt: {
        issuer: baseURL,
        audience: baseURL,
        expirationTime: JWT_EXPIRATION,
        // Klaim minimal yang dibutuhkan RBAC stateless (lihat jwtPayloadSchema)
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? 'user',
        }),
      },
    }),
  ],
})
