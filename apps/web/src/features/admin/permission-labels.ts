import type { Resource } from '@hono-react-starter/shared'

/** Label Indonesia untuk matriks permission (katalog di packages/shared/src/permissions.ts). */
export const RESOURCE_LABELS: Record<Resource, string> = {
  user: 'Pengguna',
  session: 'Sesi',
  note: 'Catatan',
  audit: 'Audit log',
  settings: 'Pengaturan aplikasi',
  role: 'Role & permission',
}

export const ACTION_LABELS: Record<string, string> = {
  create: 'buat',
  read: 'baca',
  update: 'ubah',
  delete: 'hapus',
  list: 'lihat daftar',
  get: 'lihat detail',
  ban: 'blokir',
  'set-role': 'atur role',
  'set-password': 'atur password',
  'set-email': 'atur email',
  revoke: 'cabut',
}

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action
