import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app.ts'
import { buildOpenApiDocument, docsHtml } from '../src/openapi.ts'
import { call, readJson } from './helpers.ts'

describe('OpenAPI & docs', () => {
  test('GET /api/openapi.json → dokumen OpenAPI 3.0 dari schema shared (di-cache)', async () => {
    const res = await call('/api/openapi.json')
    expect(res.status).toBe(200)
    const doc = await readJson(res)
    expect(doc.openapi).toBe('3.0.3')
    expect(doc.info.title).toContain('Hono React Starter')
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining(['/api/health/live', '/api/notes', '/api/notes/{id}', '/api/admin/audit-logs', '/api/auth/sign-in/email']),
    )
    expect(doc.components.schemas.Note.properties).toHaveProperty('title')
    expect(doc.components.schemas.NoteCreate.required).toEqual(['title'])
    expect(doc.components.securitySchemes).toHaveProperty('bearerAuth')
    // Query audit log diturunkan dari auditLogQuerySchema
    const params = doc.paths['/api/admin/audit-logs'].get.parameters.map((p: { name: string }) => p.name)
    expect(params).toEqual(expect.arrayContaining(['limit', 'cursor', 'action', 'actorId', 'success']))

    const again = await readJson(await call('/api/openapi.json'))
    expect(again).toEqual(doc)
  })

  test('GET /api/docs → HTML yang memuat Scalar dan menunjuk ke /api/openapi.json', async () => {
    const res = await call('/api/docs')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('data-url="/api/openapi.json"')
    expect(html).toContain('@scalar/api-reference')
    expect(docsHtml('/x.json')).toContain('data-url="/x.json"')
  })

  test('docs nonaktif (docs: false) → 404 JSON', async () => {
    const app = createApp({ docs: false, silent: true })
    const res = await app.fetch(new Request('http://localhost/api/docs'))
    expect(res.status).toBe(404)
    expect((await readJson(res)).code).toBe('NOT_FOUND')
    const spec = await app.fetch(new Request('http://localhost/api/openapi.json'))
    expect(spec.status).toBe(404)
  })

  test('buildOpenApiDocument: setiap operasi punya tag & responses', () => {
    const doc = buildOpenApiDocument() as { paths: Record<string, Record<string, { tags?: string[]; responses?: object }>> }
    for (const [path, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item)) {
        if (method === 'parameters') continue
        expect(op.tags?.length, `${method} ${path}`).toBeGreaterThan(0)
        expect(op.responses, `${method} ${path}`).toBeDefined()
      }
    }
  })
})
