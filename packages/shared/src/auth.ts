import { z } from 'zod'
import { USER_ROLES } from './permissions.ts'

/**
 * Schema & tipe untuk autentikasi & RBAC.
 * Dipakai server (middleware) dan client (UI role, daftar user).
 */
export { USER_ROLES, type UserRole } from './permissions.ts'

/** Baris user untuk endpoint admin (GET /api/admin/users) */
export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES).nullable(),
  banned: z.boolean(),
  createdAt: z.string(),
})
export type AdminUser = z.infer<typeof adminUserSchema>

/**
 * Payload JWT yang diterbitkan server (lihat `definePayload` di apps/api/src/auth.ts).
 * Klaim standar (sub, iss, aud, exp, iat) ditambah identitas + role untuk RBAC
 * stateless.
 */
export const jwtPayloadSchema = z.object({
  sub: z.string(),
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(USER_ROLES),
  exp: z.number().optional(),
  iat: z.number().optional(),
})
export type JwtPayload = z.infer<typeof jwtPayloadSchema>

/** Respons GET /api/auth/token */
export const tokenResponseSchema = z.object({ token: z.string() })

/** Form daftar akun (validasi client via React Hook Form + Zod) */
export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama terlalu panjang'),
  email: z.string().trim().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})
export type SignUpInput = z.infer<typeof signUpSchema>

/** Form masuk akun */
export const signInSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})
export type SignInInput = z.infer<typeof signInSchema>

/** Form lupa password (minta tautan reset) */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

const newPasswordField = z.string().min(8, 'Password minimal 8 karakter').max(128, 'Password terlalu panjang')

/** Form atur password baru (dari tautan reset) */
export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Konfirmasi password tidak sama',
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/** Form ganti password (sudah login) */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: newPasswordField,
    revokeOtherSessions: z.boolean().default(true),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Password baru harus berbeda',
    path: ['newPassword'],
  })
export type ChangePasswordInput = z.input<typeof changePasswordSchema>

/** Kode TOTP 6 digit (aplikasi authenticator) */
export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Kode harus 6 digit angka'),
})
/** Kode cadangan (backup code) — format bebas, minimal 6 karakter */
export const backupCodeSchema = z.object({
  code: z.string().trim().min(6, 'Kode cadangan tidak valid'),
})
/** Password untuk aksi sensitif (aktif/nonaktifkan 2FA) */
export const passwordConfirmSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi'),
})
