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
 * Payload JWT yang diterbitkan server (lihat `definePayload` di src/server/auth.ts).
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
