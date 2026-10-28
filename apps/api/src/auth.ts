import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { bearer } from 'better-auth/plugins/bearer'
import { jwt } from 'better-auth/plugins/jwt'
import { twoFactor } from 'better-auth/plugins/two-factor'
import { ac, roles } from '@hono-react-starter/shared/permissions'
import {
  readAuthRateLimit,
  readAuthSecret,
  readBaseUrl,
  readEmailVerificationRequired,
  readSessionCacheSeconds,
  readTrustedOrigins,
  type AuthRateLimitConfig,
} from './env.ts'
import { db } from './db/index.ts'
import * as schema from './db/schema.ts'
import { resetPasswordEmail, verificationEmail } from './lib/emails.ts'
import type { Mailer } from './lib/mailer.ts'
import { mailer as defaultMailer } from './mailer.ts'

export const APP_NAME = 'Hono React Starter'

/** Masa berlaku JWT. Pendek karena stateless (tidak bisa dicabut sebelum expired). */
export const JWT_EXPIRATION = '15m'
/** Masa berlaku tautan verifikasi email (detik). */
export const EMAIL_VERIFICATION_EXPIRES_IN = 60 * 60 * 24
/** Masa berlaku tautan reset password (detik). */
export const PASSWORD_RESET_EXPIRES_IN = 60 * 60

export type AuthOptions = {
  /** Tolak sign-in sebelum email diverifikasi. Default dari env AUTH_REQUIRE_EMAIL_VERIFICATION. */
  requireEmailVerification?: boolean
  /** Pengirim email. Default: singleton src/mailer.ts (provider dari MAIL_PROVIDER). */
  mailer?: Mailer
  /** Rate limit /api/auth/*. Default dari env AUTH_RATE_LIMIT_* (nonaktif saat test); `false` mematikan. */
  rateLimit?: AuthRateLimitConfig | false
  /** Cookie cache sesi (detik). Default dari env AUTH_SESSION_CACHE_SECONDS; 0 = nonaktif. */
  sessionCacheSeconds?: number
}

/**
 * Bangun instance Better Auth. `auth` (di bawah) dipakai runtime; `createAuth()`
 * dipakai test untuk mencoba konfigurasi lain (mis. wajib verifikasi email)
 * tanpa mengubah env.
 */
export function createAuth(options: AuthOptions = {}) {
  const baseURL = readBaseUrl()
  const mailer = options.mailer ?? defaultMailer
  const requireEmailVerification = options.requireEmailVerification ?? readEmailVerificationRequired()
  const rateLimit = options.rateLimit ?? readAuthRateLimit()
  const sessionCacheSeconds = options.sessionCacheSeconds ?? readSessionCacheSeconds()

  return betterAuth({
    appName: APP_NAME,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    // Validasi fail-fast: secret wajib minimal 32 karakter
    secret: readAuthSecret(),
    // Origin publik aplikasi. Dipakai untuk callback URL, CSRF (trustedOrigins)
    // dan menentukan cookie Secure (otomatis bila https). TRUSTED_ORIGINS
    // menambah origin lain (default dev: Vite http://localhost:5173).
    baseURL,
    trustedOrigins: [baseURL, ...readTrustedOrigins()],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Bila true: sign-in sebelum verifikasi → 403 EMAIL_NOT_VERIFIED (+ email dikirim ulang).
      requireEmailVerification,
      // Reset password: POST /request-password-reset { email, redirectTo } → email berisi
      // tautan → redirect ke redirectTo?token=… → POST /reset-password { newPassword, token }.
      sendResetPassword: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...resetPasswordEmail({ appName: APP_NAME, name: user.name, url }) })
      },
      resetPasswordTokenExpiresIn: PASSWORD_RESET_EXPIRES_IN,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      // Dikirim saat sign-up (sendOnSignUp) dan via POST /send-verification-email.
      // Tautan: GET /api/auth/verify-email?token=…&callbackURL=… → redirect ke callbackURL.
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send({ to: user.email, ...verificationEmail({ appName: APP_NAME, name: user.name, url }) })
      },
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: EMAIL_VERIFICATION_EXPIRES_IN,
    },
    session: {
      // Cookie cache: salinan sesi+user di cookie bertanda tangan (better-auth.session_data)
      // selama N detik → getSession tanpa query DB. Dicabut saat sign-out/ganti password;
      // perubahan role/ban terasa paling lama N detik kemudian (AUTH_SESSION_CACHE_SECONDS).
      cookieCache: { enabled: sessionCacheSeconds > 0, maxAge: sessionCacheSeconds },
    },
    advanced: {
      // Di belakang reverse proxy (nginx/Caddy/Fly/Railway/Cloudflare) IP asli
      // ada di header berikut — dipakai untuk rate limiting & tracking sesi.
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'],
      },
    },
    // Proteksi brute-force pada endpoint auth (sign-in/sign-up, dst.), per IP
    // per endpoint. Konfigurasi dari AUTH_RATE_LIMIT_* (nonaktif saat test agar
    // suite tidak kena 429). /get-session dikecualikan: dipanggil SPA berulang
    // (tiap tab/refresh) dan tidak berguna untuk menebak kredensial — tanpa
    // pengecualian ini banyak pengguna di balik satu NAT akan "terlempar" dari sesi.
    rateLimit: {
      enabled: rateLimit !== false,
      window: rateLimit ? rateLimit.windowSeconds : 60,
      max: rateLimit ? rateLimit.max : 20,
      storage: 'database', // tabel rate_limit
      customRules: { '/get-session': false },
    },
    plugins: [
      // RBAC: role di kolom user.role + permission (ac/roles dari packages/shared/src/permissions.ts)
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
      // 2FA TOTP (Google Authenticator, 1Password, dst.) + backup code.
      // enable {password} → { totpURI, backupCodes } → verify-totp {code} mengaktifkan.
      // Sign-in akun ber-2FA → { twoFactorRedirect: true } → verify-totp / verify-backup-code.
      // Tabel: two_factor (secret & backup code terenkripsi dengan secret aplikasi).
      twoFactor({
        issuer: APP_NAME,
        // Setelah 10 kode salah berturut-turut akun dikunci 15 menit (default plugin).
      }),
    ],
  })
}

export const auth = createAuth()
export type Auth = typeof auth
