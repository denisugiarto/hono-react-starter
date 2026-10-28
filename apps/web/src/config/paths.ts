/**
 * Semua path route di satu tempat — dipakai router, navigasi, dan redirect.
 * Hindari string path tersebar di komponen.
 */
export const paths = {
  home: '/',
  login: '/login',
  notes: '/notes',
  apiToken: '/settings/api-token',
  adminUsers: '/admin/users',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]
