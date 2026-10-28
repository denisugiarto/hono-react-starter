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

describe('Shared schema — audit', () => {
  test('query: default limit 50, coerce angka, success → boolean, batas limit', async () => {
    const { auditLogQuerySchema } = await import('../src/audit.ts')
    expect(auditLogQuerySchema.parse({})).toEqual({ limit: 50 })
    expect(auditLogQuerySchema.parse({ limit: '10', success: 'false', action: ' auth. ' })).toEqual({
      limit: 10,
      success: false,
      action: 'auth.',
    })
    expect(auditLogQuerySchema.parse({ success: 'true' }).success).toBe(true)
    expect(auditLogQuerySchema.safeParse({ limit: '0' }).success).toBe(false)
    expect(auditLogQuerySchema.safeParse({ limit: '201' }).success).toBe(false)
    expect(auditLogQuerySchema.safeParse({ cursor: 'kemarin' }).success).toBe(false)
    expect(auditLogQuerySchema.safeParse({ cursor: '2026-01-01T00:00:00.000Z' }).success).toBe(true)
  })

  test('daftar: item sesuai DTO; nextCursor nullable', async () => {
    const { auditLogListSchema, AUDIT_ACTIONS } = await import('../src/audit.ts')
    const item = {
      id: '1',
      at: '2026-01-01T00:00:00.000Z',
      actorId: null,
      actorEmail: null,
      action: 'auth.sign_in',
      success: false,
      targetType: null,
      targetId: null,
      requestId: 'r',
      ip: '1.1.1.1',
      userAgent: null,
      metadata: { email: 'a@b.co' },
    }
    expect(auditLogListSchema.parse({ items: [item], nextCursor: null }).items.length).toBe(1)
    expect(auditLogListSchema.safeParse({ items: [{ ...item, success: 'ya' }], nextCursor: null }).success).toBe(false)
    expect(AUDIT_ACTIONS).toContain('note.created')
  })

  test('permission audit:list hanya admin', async () => {
    const { can } = await import('../src/permissions.ts')
    expect(can('admin', { audit: ['list'] })).toBe(true)
    expect(can('user', { audit: ['list'] })).toBe(false)
  })
})

describe('Shared schema — form akun', () => {
  test('forgot/reset: email valid; konfirmasi harus sama; min 8', async () => {
    const { forgotPasswordSchema, resetPasswordSchema } = await import('../src/auth.ts')
    expect(forgotPasswordSchema.safeParse({ email: ' a@b.co ' }).data).toEqual({ email: 'a@b.co' })
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false)
    expect(resetPasswordSchema.safeParse({ newPassword: 'password1', confirmPassword: 'password1' }).success).toBe(true)
    const mismatch = resetPasswordSchema.safeParse({ newPassword: 'password1', confirmPassword: 'password2' })
    expect(mismatch.success).toBe(false)
    expect(mismatch.error!.issues[0]!.path).toEqual(['confirmPassword'])
    expect(resetPasswordSchema.safeParse({ newPassword: 'pendek', confirmPassword: 'pendek' }).success).toBe(false)
  })

  test('changePassword: default revokeOtherSessions true; baru harus beda', async () => {
    const { changePasswordSchema } = await import('../src/auth.ts')
    expect(changePasswordSchema.parse({ currentPassword: 'lama-1234', newPassword: 'baru-1234' })).toEqual({
      currentPassword: 'lama-1234',
      newPassword: 'baru-1234',
      revokeOtherSessions: true,
    })
    const same = changePasswordSchema.safeParse({ currentPassword: 'sama-1234', newPassword: 'sama-1234' })
    expect(same.success).toBe(false)
    expect(same.error!.issues[0]!.path).toEqual(['newPassword'])
    expect(changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'baru-1234' }).success).toBe(false)
  })

  test('totp 6 digit, backup code ≥ 6, password konfirmasi wajib', async () => {
    const { totpCodeSchema, backupCodeSchema, passwordConfirmSchema } = await import('../src/auth.ts')
    expect(totpCodeSchema.parse({ code: ' 123456 ' })).toEqual({ code: '123456' })
    expect(totpCodeSchema.safeParse({ code: '12345' }).success).toBe(false)
    expect(totpCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false)
    expect(backupCodeSchema.safeParse({ code: 'abcde-fghij' }).success).toBe(true)
    expect(backupCodeSchema.safeParse({ code: 'abc' }).success).toBe(false)
    expect(passwordConfirmSchema.safeParse({ password: '' }).success).toBe(false)
  })
})
