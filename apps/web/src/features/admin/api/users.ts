import { useQuery } from '@tanstack/react-query'
import { adminUserSchema, type AdminUser } from '@hono-react-starter/shared'
import { request } from '@/lib/api/request'

export const adminKeys = {
  users: ['admin', 'users'] as const,
}

/**
 * Daftar semua user — hanya untuk admin.
 * `enabled` dikontrol dari luar (hanya query saat pengguna ber-role admin).
 */
export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.users,
    enabled,
    queryFn: async () => {
      const data = await request<unknown>('/api/admin/users')
      return adminUserSchema.array().parse(data)
    },
  })
}

export type { AdminUser }
