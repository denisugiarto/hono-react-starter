import { z } from 'zod'

/**
 * Schema & tipe untuk autentikasi & RBAC.
 * Dipakai server (middleware) dan client (UI role, daftar user).
 */

export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

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
