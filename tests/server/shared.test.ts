import { describe, expect, test } from 'bun:test'
import { noteCreateSchema, noteUpdateSchema, signInSchema, signUpSchema } from '../../src/shared/index.ts'

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
