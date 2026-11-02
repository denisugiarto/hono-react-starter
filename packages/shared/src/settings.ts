import { z } from 'zod'

/**
 * Pengaturan aplikasi yang bisa diubah admin saat runtime (tabel `app_setting`),
 * tanpa deploy ulang. Nilai awal diambil dari env (lihat apps/api/src/settings.ts).
 */
export const appSettingsSchema = z.object({
  /** Tolak sign-in sebelum email diverifikasi (403 EMAIL_NOT_VERIFIED + kirim ulang email). */
  requireEmailVerification: z.boolean(),
})
export type AppSettings = z.infer<typeof appSettingsSchema>

export const DEFAULT_APP_SETTINGS: AppSettings = { requireEmailVerification: false }
export const APP_SETTING_KEYS = Object.keys(appSettingsSchema.shape) as Array<keyof AppSettings>

/** PATCH /api/admin/settings — field opsional eksplisit; minimal satu field. */
export const appSettingsUpdateSchema = z
  .object({ requireEmailVerification: z.boolean().optional() })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Tidak ada perubahan' })
export type AppSettingsUpdate = z.infer<typeof appSettingsUpdateSchema>

export const MAIL_PROVIDERS = ['console', 'resend', 'memory'] as const
export type MailProvider = (typeof MAIL_PROVIDERS)[number]

/** GET /api/admin/settings — nilai + kesiapan infra agar UI bisa menonaktifkan saklar. */
export const appSettingsViewSchema = appSettingsSchema.extend({
  mailProvider: z.enum(MAIL_PROVIDERS),
  /** Boleh mewajibkan verifikasi email: di production butuh provider email sungguhan. */
  emailVerificationReady: z.boolean(),
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
})
export type AppSettingsView = z.infer<typeof appSettingsViewSchema>
