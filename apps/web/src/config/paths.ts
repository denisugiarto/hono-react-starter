/**
 * Semua path route di satu tempat — dipakai router, navigasi, dan redirect.
 * Hindari string path tersebar di komponen.
 */
export const paths = {
  home: '/',
  login: '/login',
  /** Langkah kedua login untuk akun ber-2FA (kode TOTP / backup code). */
  twoFactor: '/login/two-factor',
  forgotPassword: '/forgot-password',
  /** Tujuan tautan di email reset (?token=…). */
  resetPassword: '/reset-password',
  /** Tujuan tautan di email verifikasi (?error=… bila gagal). */
  verifyEmail: '/verify-email',
  notes: '/notes',
  apiToken: '/settings/api-token',
  /** Ganti password, 2FA, status verifikasi email. */
  security: '/settings/security',
  adminUsers: '/admin/users',
  adminAuditLogs: '/admin/audit-logs',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]
