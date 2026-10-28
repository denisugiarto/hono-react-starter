import { describe, expect, test } from 'bun:test'
import { noteCreateSchema, noteUpdateSchema, signInSchema, signUpSchema } from '../src/index.ts'

describe('Shared schema — notes', () => {
  test('create: trim title, default content', () => {
    const r = noteCreateSchema.parse({ title: '  Halo  ' })
    expect(r).toEqual({ title: 'Halo', content: '' })
  })

  test('create: title kosong / terlalu panjang ditolak', () => {
    expect(noteCreateSchema.safeParse({ title: '   ' }).success).toBe(false)
    expect(noteCreateSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false)
  })

  test('update: semua field opsional', () => {
    expect(noteUpdateSchema.parse({})).toEqual({})
    expect(noteUpdateSchema.parse({ done: true })).toEqual({ done: true })
    expect(noteUpdateSchema.safeParse({ done: 'ya' }).success).toBe(false)
  })
})

describe('Shared schema — auth', () => {
  test('signUp: email valid, password ≥ 8', () => {
    expect(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: '12345678' }).success).toBe(true)
    expect(signUpSchema.safeParse({ name: 'A', email: 'bukan-email', password: '12345678' }).success).toBe(false)
    expect(signUpSchema.safeParse({ name: 'A', email: 'a@b.co', password: '1234567' }).success).toBe(false)
  })

  test('signIn: password wajib', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false)
  })
})

describe('Shared permissions — RBAC', () => {
  test('user: penuh atas note, tidak bisa kelola user', async () => {
    const { can } = await import('../src/permissions.ts')
    expect(can('user', { note: ['create', 'read', 'update', 'delete'] })).toBe(true)
    expect(can('user', { user: ['list'] })).toBe(false)
    expect(can('user', { note: ['read'], user: ['list'] })).toBe(false)
  })

  test('admin: kelola user + note', async () => {
    const { can } = await import('../src/permissions.ts')
    expect(can('admin', { user: ['list', 'ban', 'set-role'] })).toBe(true)
    expect(can('admin', { note: ['delete'] })).toBe(true)
  })

  test('role tak dikenal / kosong → false', async () => {
    const { can } = await import('../src/permissions.ts')
    expect(can('superuser', { note: ['read'] })).toBe(false)
    expect(can(null, { note: ['read'] })).toBe(false)
    expect(can(undefined, {})).toBe(false)
  })
})
