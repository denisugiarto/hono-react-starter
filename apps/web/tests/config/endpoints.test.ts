import { describe, expect, test } from 'bun:test'
import { API_BASE_URL, API_PREFIX, apiCredentials, createEndpoints, endpoints, isCrossOriginApi, normalizeBaseUrl } from '../../src/config/endpoints.ts'
import { buildAuditLogsUrl } from '../../src/features/admin/api/audit-logs.ts'

describe('config/endpoints', () => {
  test('default same-origin: prefix /api, credentials same-origin', () => {
    expect(API_BASE_URL).toBe('')
    expect(API_PREFIX).toBe('/api')
    expect(isCrossOriginApi).toBe(false)
    expect(apiCredentials).toBe('same-origin')
    expect(endpoints.base).toBe('/api')
    expect(endpoints.health).toBe('/api/health')
    expect(endpoints.hello('Deni S')).toBe('/api/hello?name=Deni+S')
    expect(endpoints.auth.baseUrl).toBeUndefined()
    expect(endpoints.auth.token).toBe('/api/auth/token')
    expect(endpoints.notes.list).toBe('/api/notes')
    expect(endpoints.notes.byId('a/b')).toBe('/api/notes/a%2Fb')
    expect(endpoints.admin.users).toBe('/api/admin/users')
    expect(endpoints.admin.auditLogs()).toBe('/api/admin/audit-logs')
    expect(endpoints.admin.auditLogs({ limit: 50, action: 'auth.', cursor: 'c1' })).toBe('/api/admin/audit-logs?limit=50&action=auth.&cursor=c1')
  })

  test('API di origin lain: base URL diawalkan, baseUrl Better Auth terisi', () => {
    const e = createEndpoints('https://api.example.com')
    expect(e.notes.list).toBe('https://api.example.com/api/notes')
    expect(e.auth.baseUrl).toBe('https://api.example.com')
    expect(e.auth.token).toBe('https://api.example.com/api/auth/token')
    expect(createEndpoints('https://example.com/backend').health).toBe('https://example.com/backend/api/health')
  })

  test('normalizeBaseUrl: kosong/spasi → "", trailing slash dibuang, path dipertahankan', () => {
    expect(normalizeBaseUrl(undefined)).toBe('')
    expect(normalizeBaseUrl('   ')).toBe('')
    expect(normalizeBaseUrl('https://api.example.com/')).toBe('https://api.example.com')
    expect(normalizeBaseUrl('https://api.example.com/v1/')).toBe('https://api.example.com/v1')
    expect(() => normalizeBaseUrl('bukan url')).toThrow()
  })

  test('buildAuditLogsUrl memakai endpoints + buildUrl (filter kosong dilewati)', () => {
    expect(buildAuditLogsUrl({})).toBe('/api/admin/audit-logs?limit=50')
    expect(buildAuditLogsUrl({ action: 'admin.', success: 'false', actorId: 'u1' }, 'cur', 10)).toBe(
      '/api/admin/audit-logs?limit=10&action=admin.&success=false&actorId=u1&cursor=cur',
    )
  })
})
