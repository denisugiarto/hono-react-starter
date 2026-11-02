import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

/**
 * `useState` yang bertahan di localStorage (JSON) dan sinkron antar tab lewat event `storage`.
 * Gagal baca/tulis (private mode, kuota) diabaikan — nilai tetap di memori.
 *   const [pageSize, setPageSize] = useLocalStorage('users.pageSize', 10)
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => read(key, initialValue))

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // abaikan: storage penuh / tidak tersedia
    }
  }, [key, value])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read(key, initialValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, initialValue])

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // abaikan
    }
    setValue(initialValue)
  }, [key, initialValue])

  return [value, setValue, remove]
}
