import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Pabrik query key hierarkis agar invalidasi konsisten:
 *   const keys = createQueryKeys('notes')
 *   keys.all          → ['notes']
 *   keys.list({ q })  → ['notes', 'list', { q }]
 *   keys.detail(id)   → ['notes', 'detail', id]
 * `invalidateQueries({ queryKey: keys.all })` menyentuh semuanya.
 */
export function createQueryKeys<const S extends string>(scope: S) {
  const all = [scope] as const
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: <P>(params: P) => [...all, 'list', params] as const,
    details: () => [...all, 'detail'] as const,
    detail: (id: string | number) => [...all, 'detail', id] as const,
  }
}

export type OptimisticSnapshot<T> = { previous: T | undefined }

/**
 * Ubah cache seketika dan simpan snapshot untuk rollback (langkah `onMutate`).
 */
export async function optimisticUpdate<T>(
  qc: QueryClient,
  queryKey: QueryKey,
  update: (current: T) => T,
): Promise<OptimisticSnapshot<T>> {
  await qc.cancelQueries({ queryKey })
  const previous = qc.getQueryData<T>(queryKey)
  if (previous !== undefined) qc.setQueryData<T>(queryKey, update(previous))
  return { previous }
}

/** Kembalikan cache ke snapshot (langkah `onError`). */
export function rollbackOptimistic<T>(qc: QueryClient, queryKey: QueryKey, snapshot: OptimisticSnapshot<T> | undefined) {
  if (snapshot?.previous !== undefined) qc.setQueryData(queryKey, snapshot.previous)
}

/**
 * Opsi `useMutation` siap pakai untuk pola optimistic update:
 *   useMutation({ mutationFn, ...optimisticMutation(qc, keys.all, (notes, id) => notes.filter(n => n.id !== id), { onError }) })
 * onMutate → ubah cache, onError → rollback (+ callback), onSettled → invalidate.
 */
export function optimisticMutation<TData, TVars>(
  qc: QueryClient,
  queryKey: QueryKey,
  update: (current: TData, vars: TVars) => TData,
  handlers: { onError?: (err: Error, vars: TVars) => void } = {},
) {
  return {
    onMutate: (vars: TVars) => optimisticUpdate<TData>(qc, queryKey, (current) => update(current, vars)),
    onError: (err: Error, vars: TVars, snapshot: OptimisticSnapshot<TData> | undefined) => {
      rollbackOptimistic(qc, queryKey, snapshot)
      handlers.onError?.(err, vars)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  }
}
