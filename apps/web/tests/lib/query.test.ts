import { describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { createQueryKeys, optimisticMutation, optimisticUpdate, rollbackOptimistic } from '../../src/lib/query.ts'

type Note = { id: string; done: boolean }

describe('createQueryKeys', () => {
  test('kunci hierarkis', () => {
    const keys = createQueryKeys('notes')
    expect(keys.all).toEqual(['notes'])
    expect(keys.lists()).toEqual(['notes', 'list'])
    expect(keys.list({ q: 'a' })).toEqual(['notes', 'list', { q: 'a' }])
    expect(keys.details()).toEqual(['notes', 'detail'])
    expect(keys.detail('1')).toEqual(['notes', 'detail', '1'])
  })
})

describe('optimistic helpers', () => {
  const key = ['notes']
  const seed = (): [QueryClient, Note[]] => {
    const qc = new QueryClient()
    const notes: Note[] = [{ id: '1', done: false }]
    qc.setQueryData(key, notes)
    return [qc, notes]
  }

  test('optimisticUpdate mengubah cache & menyimpan snapshot; rollback mengembalikan', async () => {
    const [qc, notes] = seed()
    const snap = await optimisticUpdate<Note[]>(qc, key, (n) => n.map((x) => ({ ...x, done: true })))
    expect(snap.previous).toEqual(notes)
    expect(qc.getQueryData<Note[]>(key)?.[0]?.done).toBe(true)
    rollbackOptimistic(qc, key, snap)
    expect(qc.getQueryData<Note[]>(key)).toEqual(notes)
    rollbackOptimistic(qc, key, undefined) // tanpa snapshot: tidak terjadi apa-apa
    expect(qc.getQueryData<Note[]>(key)).toEqual(notes)
  })

  test('cache kosong → tidak menulis, snapshot undefined', async () => {
    const qc = new QueryClient()
    const snap = await optimisticUpdate<Note[]>(qc, key, (n) => n)
    expect(snap.previous).toBeUndefined()
    expect(qc.getQueryData(key)).toBeUndefined()
  })

  test('optimisticMutation: onMutate → onError rollback + callback → onSettled invalidate', async () => {
    const [qc, notes] = seed()
    let invalidated = 0
    qc.invalidateQueries = (async () => {
      invalidated++
    }) as QueryClient['invalidateQueries']
    const errors: string[] = []
    const opts = optimisticMutation<Note[], string>(qc, key, (n, id) => n.filter((x) => x.id !== id), {
      onError: (err, id) => errors.push(`${id}:${err.message}`),
    })
    const snap = await opts.onMutate('1')
    expect(qc.getQueryData<Note[]>(key)).toEqual([])
    opts.onError(new Error('gagal'), '1', snap)
    expect(qc.getQueryData<Note[]>(key)).toEqual(notes)
    expect(errors).toEqual(['1:gagal'])
    await opts.onSettled()
    expect(invalidated).toBe(1)
    // tanpa handler onError tetap aman
    const bare = optimisticMutation<Note[], string>(qc, key, (n) => n)
    bare.onError(new Error('x'), '1', undefined)
  })
})
