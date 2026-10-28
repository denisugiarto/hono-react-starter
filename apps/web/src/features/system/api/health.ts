import { useQuery } from '@tanstack/react-query'
import { healthResponseSchema, helloResponseSchema } from '@hono-react-starter/shared'
import { request } from '@/lib/api/request'

export const systemKeys = {
  health: ['system', 'health'] as const,
}

/** GET /api/health — status server & database (polling tiap 30 detik). */
export function useHealth() {
  return useQuery({
    queryKey: systemKeys.health,
    queryFn: async () => healthResponseSchema.parse(await request<unknown>('/api/health')),
    refetchInterval: 30_000,
  })
}

/** GET /api/hello?name=… — contoh pemanggilan API dengan validasi schema shared. */
export async function fetchHello(name: string) {
  const query = encodeURIComponent(name || 'World')
  return helloResponseSchema.parse(await request<unknown>(`/api/hello?name=${query}`))
}
