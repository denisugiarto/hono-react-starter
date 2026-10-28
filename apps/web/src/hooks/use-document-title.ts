import { useEffect } from 'react'
import { siteConfig } from '@/config/site'

/** Set judul tab: "<title> · <nama app>" (hanya nama app bila title kosong). */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${siteConfig.name}` : siteConfig.name
  }, [title])
}
