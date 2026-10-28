import { Hono } from 'hono'
import { z } from 'zod'
import { apiErrorSchema, healthResponseSchema, helloResponseSchema, livenessResponseSchema } from '@hono-react-starter/shared/api'
import { adminUserSchema } from '@hono-react-starter/shared/auth'
import { auditLogListSchema, auditLogQuerySchema } from '@hono-react-starter/shared/audit'
import { noteCreateSchema, noteSchema, noteUpdateSchema } from '@hono-react-starter/shared/notes'
import { APP_NAME } from './auth.ts'
import type { AppEnv } from './types.ts'

/**
 * Dokumentasi OpenAPI 3.0 dibangun dari schema Zod di packages/shared (satu
 * sumber kebenaran dengan validasi runtime). Endpoint Better Auth
 * (`/api/auth/*`) didokumentasikan ringkas di sini; referensi lengkapnya ada di
 * https://www.better-auth.com/docs (pola body/respons mengikuti plugin yang dipakai).
 *
 *   GET /api/openapi.json → spesifikasi
 *   GET /api/docs         → UI (Scalar, dimuat dari CDN; tanpa dependency server)
 *
 * Diaktifkan lewat API_DOCS_ENABLED (default: nonaktif di production).
 */

type JsonSchema = Record<string, unknown>

const toSchema = (schema: z.ZodType, io: 'input' | 'output' = 'output'): JsonSchema =>
  z.toJSONSchema(schema, { target: 'openapi-3.0', io, unrepresentable: 'any' }) as JsonSchema

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const jsonBody = (schema: JsonSchema, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
})

const errorRef = (description: string) => jsonBody(ref('ApiError'), description)

/** Envelope sukses dengan `data` bertipe tertentu. */
function envelope(data: JsonSchema): JsonSchema {
  return {
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data,
      message: { type: 'string' },
    },
  }
}

const STANDARD_ERRORS = {
  401: errorRef('Belum login (sesi atau Bearer JWT)'),
  403: errorRef('Tidak punya permission'),
  429: errorRef('Rate limit (lihat header Retry-After)'),
}

/** Bangun dokumen OpenAPI (tanpa state; dipanggil sekali lalu di-cache). */
export function buildOpenApiDocument(): Record<string, unknown> {
  const Note = toSchema(noteSchema)
  const NoteList = { type: 'array', items: ref('Note') }
  const AuditLogList = toSchema(auditLogListSchema)
  const AdminUser = toSchema(adminUserSchema)
  const AuditQuery = toSchema(auditLogQuerySchema, 'input') as { properties: Record<string, JsonSchema> }

  const queryParams = Object.entries(AuditQuery.properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: false,
    schema,
  }))

  return {
    openapi: '3.0.3',
    info: {
      title: `${APP_NAME} API`,
      version: '1.0.0',
      description: [
        'Semua endpoint `/api/*` (selain `/api/auth/*`) memakai envelope standar:',
        '`{ success: true, data, message? }` atau `{ success: false, code, message, details? }`.',
        'Autentikasi: cookie sesi (browser) atau `Authorization: Bearer <JWT>` dari `GET /api/auth/token`.',
      ].join(' '),
    },
    servers: [{ url: '/', description: 'Origin saat ini' }],
    tags: [
      { name: 'system', description: 'Health check & contoh' },
      { name: 'auth', description: 'Better Auth (email/password, 2FA, JWT, admin)' },
      { name: 'notes', description: 'Catatan milik pengguna (login wajib)' },
      { name: 'admin', description: 'Endpoint admin (permission RBAC)' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiError: toSchema(apiErrorSchema),
        Note,
        NoteCreate: toSchema(noteCreateSchema, 'input'),
        NoteUpdate: toSchema(noteUpdateSchema, 'input'),
        AdminUser,
        AuditLogList,
        Liveness: toSchema(livenessResponseSchema),
        Readiness: toSchema(healthResponseSchema),
        Hello: toSchema(helloResponseSchema),
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    paths: {
      '/api/health/live': {
        get: {
          tags: ['system'],
          summary: 'Liveness (tanpa cek DB)',
          security: [],
          responses: { 200: jsonBody(envelope(ref('Liveness'))) },
        },
      },
      '/api/health/ready': {
        get: {
          tags: ['system'],
          summary: 'Readiness (DB terhubung); alias: /api/health',
          security: [],
          responses: {
            200: jsonBody(envelope(ref('Readiness'))),
            503: errorRef('Database tidak dapat dihubungi'),
          },
        },
      },
      '/api/hello': {
        get: {
          tags: ['system'],
          summary: 'Contoh respons sukses + message',
          security: [],
          parameters: [{ name: 'name', in: 'query', required: false, schema: { type: 'string' } }],
          responses: { 200: jsonBody(envelope(ref('Hello'))) },
        },
      },
      '/api/echo': {
        post: {
          tags: ['system'],
          summary: 'Pantulkan body JSON (201)',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: {} } } },
          responses: {
            201: jsonBody(envelope({ type: 'object', properties: { echoed: {} } })),
            400: errorRef('Body bukan JSON valid'),
          },
        },
      },
      '/api/notes': {
        get: {
          tags: ['notes'],
          summary: 'Daftar catatan milik pengguna (terbaru dulu)',
          responses: { 200: jsonBody(envelope(NoteList)), ...STANDARD_ERRORS },
        },
        post: {
          tags: ['notes'],
          summary: 'Buat catatan',
          requestBody: { required: true, content: { 'application/json': { schema: ref('NoteCreate') } } },
          responses: {
            201: jsonBody(envelope(ref('Note')), 'Dibuat'),
            400: errorRef('VALIDATION_ERROR (details = fieldErrors)'),
            ...STANDARD_ERRORS,
          },
        },
      },
      '/api/notes/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        patch: {
          tags: ['notes'],
          summary: 'Ubah sebagian field catatan (milik sendiri)',
          requestBody: { required: true, content: { 'application/json': { schema: ref('NoteUpdate') } } },
          responses: {
            200: jsonBody(envelope(ref('Note'))),
            400: errorRef('VALIDATION_ERROR'),
            404: errorRef('Tidak ditemukan / bukan milik pengguna'),
            ...STANDARD_ERRORS,
          },
        },
        delete: {
          tags: ['notes'],
          summary: 'Hapus catatan (milik sendiri)',
          responses: {
            200: jsonBody(envelope({ type: 'object', properties: { id: { type: 'string' } } })),
            404: errorRef('Tidak ditemukan / bukan milik pengguna'),
            ...STANDARD_ERRORS,
          },
        },
      },
      '/api/admin/me': {
        get: {
          tags: ['admin'],
          summary: 'Identitas pemanggil + cara autentikasi (session/jwt)',
          responses: {
            200: jsonBody(
              envelope({
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'admin'] },
                  authMethod: { type: 'string', enum: ['session', 'jwt'] },
                },
              }),
            ),
            ...STANDARD_ERRORS,
          },
        },
      },
      '/api/admin/users': {
        get: {
          tags: ['admin'],
          summary: 'Daftar semua pengguna (permission user:list)',
          responses: { 200: jsonBody(envelope({ type: 'array', items: ref('AdminUser') })), ...STANDARD_ERRORS },
        },
      },
      '/api/admin/audit-logs': {
        get: {
          tags: ['admin'],
          summary: 'Audit log, terbaru dulu, paginasi cursor (permission audit:list)',
          parameters: queryParams,
          responses: {
            200: jsonBody(envelope(ref('AuditLogList'))),
            400: errorRef('Query tidak valid'),
            ...STANDARD_ERRORS,
          },
        },
      },
      ...authPaths(),
    },
  }
}

/** Ringkasan endpoint Better Auth yang dipakai aplikasi (format body/respons milik Better Auth). */
function authPaths(): Record<string, unknown> {
  const authOp = (summary: string, body?: Record<string, JsonSchema>, required: string[] = [], secured = false) => ({
    tags: ['auth'],
    summary,
    security: secured ? undefined : [],
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required, properties: body } } },
          },
        }
      : {}),
    responses: {
      200: { description: 'OK (format Better Auth)' },
      400: { description: 'Input tidak valid / kredensial salah' },
      401: { description: 'Sesi tidak valid' },
      403: { description: 'Ditolak (mis. EMAIL_NOT_VERIFIED, BANNED_USER)' },
      429: { description: 'Rate limit Better Auth' },
    },
  })
  const str = (description?: string): JsonSchema => (description ? { type: 'string', description } : { type: 'string' })
  const bool: JsonSchema = { type: 'boolean' }

  return {
    '/api/auth/sign-up/email': {
      post: authOp(
        'Daftar akun. Dengan AUTH_REQUIRE_EMAIL_VERIFICATION=true, `token` null sampai email diverifikasi.',
        { name: str(), email: str(), password: str('min 8 karakter'), callbackURL: str('tujuan setelah verifikasi') },
        ['name', 'email', 'password'],
      ),
    },
    '/api/auth/sign-in/email': {
      post: authOp(
        'Masuk. Akun ber-2FA → `{ twoFactorRedirect: true }`; non-browser: header `set-auth-token` berisi session token.',
        { email: str(), password: str(), callbackURL: str() },
        ['email', 'password'],
      ),
    },
    '/api/auth/sign-out': { post: authOp('Keluar (cabut sesi aktif)', undefined, [], true) },
    '/api/auth/get-session': { get: authOp('Sesi + user saat ini (null bila tidak login)', undefined, [], true) },
    '/api/auth/token': { get: authOp('Tukar sesi menjadi JWT (EdDSA, 15 menit)', undefined, [], true) },
    '/api/auth/jwks': { get: authOp('Kunci publik untuk verifikasi JWT') },
    '/api/auth/send-verification-email': {
      post: authOp('Kirim ulang email verifikasi', { email: str(), callbackURL: str() }, ['email']),
    },
    '/api/auth/verify-email': {
      get: {
        ...authOp('Verifikasi email dari tautan (redirect ke callbackURL)'),
        parameters: [
          { name: 'token', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'callbackURL', in: 'query', required: false, schema: { type: 'string' } },
        ],
      },
    },
    '/api/auth/request-password-reset': {
      post: authOp('Minta tautan reset password (selalu 200 agar email tidak bisa ditebak)', { email: str(), redirectTo: str() }, ['email']),
    },
    '/api/auth/reset-password': {
      post: authOp('Atur password baru dari token tautan', { newPassword: str(), token: str() }, ['newPassword', 'token']),
    },
    '/api/auth/change-password': {
      post: authOp(
        'Ganti password (login)',
        { currentPassword: str(), newPassword: str(), revokeOtherSessions: bool },
        ['currentPassword', 'newPassword'],
        true,
      ),
    },
    '/api/auth/two-factor/enable': {
      post: authOp('Mulai aktivasi 2FA → `{ totpURI, backupCodes }` (aktif setelah verify-totp)', { password: str() }, ['password'], true),
    },
    '/api/auth/two-factor/verify-totp': {
      post: authOp('Verifikasi kode 6 digit (aktivasi atau langkah kedua login)', { code: str(), trustDevice: bool }, ['code']),
    },
    '/api/auth/two-factor/verify-backup-code': {
      post: authOp('Langkah kedua login dengan kode cadangan (sekali pakai)', { code: str(), trustDevice: bool }, ['code']),
    },
    '/api/auth/two-factor/disable': { post: authOp('Nonaktifkan 2FA', { password: str() }, ['password'], true) },
    '/api/auth/admin/list-users': { get: authOp('Admin: daftar user (plugin admin)', undefined, [], true) },
    '/api/auth/admin/set-role': {
      post: authOp('Admin: ubah role', { userId: str(), role: str('user | admin') }, ['userId', 'role'], true),
    },
    '/api/auth/admin/ban-user': {
      post: authOp('Admin: blokir user', { userId: str(), banReason: str() }, ['userId'], true),
    },
    '/api/auth/admin/unban-user': { post: authOp('Admin: buka blokir', { userId: str() }, ['userId'], true) },
  }
}

const SCALAR_VERSION = '1.25.0'

/** Halaman HTML yang memuat Scalar API Reference dari CDN dan menunjuk ke /api/openapi.json. */
export function docsHtml(specUrl = '/api/openapi.json'): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME} — API Docs</title>
</head>
<body>
  <script id="api-reference" data-url="${specUrl}" data-configuration='{"theme":"default","layout":"modern"}'></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}"></script>
</body>
</html>`
}

/** Route dokumentasi: dipasang di /api oleh createApp bila docs aktif. */
export function createDocsRoutes() {
  const routes = new Hono<AppEnv>()
  let cached: Record<string, unknown> | undefined
  routes.get('/openapi.json', (c) => {
    cached ??= buildOpenApiDocument()
    return c.json(cached)
  })
  routes.get('/docs', (c) => c.html(docsHtml()))
  return routes
}
