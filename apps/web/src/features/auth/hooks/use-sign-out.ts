import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { paths } from '@/config/paths'
import { signOut } from '@/lib/auth-client'

/**
 * Keluar: hapus sesi, buang seluruh cache query (data per-user tidak bocor ke
 * sesi berikutnya di browser yang sama), lalu kembali ke beranda.
 */
export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useCallback(async () => {
    await signOut()
    queryClient.clear()
    toast.success('Anda telah keluar')
    navigate(paths.home, { replace: true })
  }, [queryClient, navigate])
}
