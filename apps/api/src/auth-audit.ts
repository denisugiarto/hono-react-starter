import type { Context } from 'hono'
import type { AuditAction } from '@hono-react-starter/shared/audit'
import { auditFromContext, type AuditActor, type AuditDeps } from './lib/audit.ts'
import { resolveUser } from './middleware/auth.ts'
import type { AppEnv } from './types.ts'

/**
 * Audit untuk endpoint Better Auth (/api/auth/*). Dipasang sebagai pembungkus
 * `auth.handler` di app.ts — bukan hook Better Auth — supaya kegagalan
 * (password salah, kode TOTP salah, token kedaluwarsa) ikut tercatat dan
 * pelaku bisa diambil dari sesi SEBELUM aksi (sign-out, ganti password, dst).
 *
 * Sumber pelaku:
 * - `session`: sesi/JWT pada request (aksi oleh pengguna yang sudah login)
 * - `response`: `user` di body respons (sign-up, sign-in → sesi baru)
 * - `either`: sesi bila ada, selain itu dari respons (verify-totp dipakai saat
 *   mengaktifkan 2FA — ada sesi — maupun saat login — belum ada sesi)
 * - `none`: anonim (reset password, verifikasi email)
 */
type Rule = {
  action: AuditAction
  actor: 'session' | 'response' | 'either' | 'none'
  /** Target = user lain (aksi admin): id dari body.userId atau respons. */
  targetUser?: boolean
  /** Field body yang disalin ke metadata (bukan rahasia). */
  meta?: readonly string[]
}

const RULES: Record<string, Rule> = {
  '/sign-up/email': { action: 'auth.sign_up', actor: 'response', meta: ['email'] },
  '/sign-in/email': { action: 'auth.sign_in', actor: 'response', meta: ['email'] },
  '/sign-out': { action: 'auth.sign_out', actor: 'session' },
  '/verify-email': { action: 'auth.email_verified', actor: 'none' },
  '/send-verification-email': { action: 'auth.verification_email_sent', actor: 'none', meta: ['email'] },
  '/request-password-reset': { action: 'auth.password_reset_requested', actor: 'none', meta: ['email'] },
  '/reset-password': { action: 'auth.password_reset_completed', actor: 'none' },
  '/change-password': { action: 'auth.password_changed', actor: 'session', meta: ['revokeOtherSessions'] },
  '/change-email': { action: 'auth.email_change_requested', actor: 'session', meta: ['newEmail'] },
  '/update-user': { action: 'auth.profile_updated', actor: 'session' },
  '/delete-user': { action: 'auth.account_deleted', actor: 'session' },
  '/revoke-session': { action: 'auth.sessions_revoked', actor: 'session' },
  '/revoke-sessions': { action: 'auth.sessions_revoked', actor: 'session' },
  '/revoke-other-sessions': { action: 'auth.sessions_revoked', actor: 'session' },
  '/two-factor/enable': { action: 'auth.two_factor_enable_requested', actor: 'session' },
  '/two-factor/disable': { action: 'auth.two_factor_disabled', actor: 'session' },
  '/two-factor/verify-totp': { action: 'auth.two_factor_verified', actor: 'either', meta: ['trustDevice'] },
  '/two-factor/verify-backup-code': { action: 'auth.two_factor_backup_code_used', actor: 'either' },
  '/two-factor/generate-backup-codes': { action: 'auth.two_factor_backup_codes_regenerated', actor: 'session' },
  '/admin/create-user': { action: 'admin.create_user', actor: 'session', targetUser: true, meta: ['email', 'role'] },
  '/admin/update-user': { action: 'admin.update_user', actor: 'session', targetUser: true },
  '/admin/set-role': { action: 'admin.set_role', actor: 'session', targetUser: true, meta: ['role'] },
  '/admin/set-user-password': { action: 'admin.set_user_password', actor: 'session', targetUser: true },
  '/admin/ban-user': { action: 'admin.ban_user', actor: 'session', targetUser: true, meta: ['banReason', 'banExpiresIn'] },
  '/admin/unban-user': { action: 'admin.unban_user', actor: 'session', targetUser: true },
  '/admin/remove-user': { action: 'admin.remove_user', actor: 'session', targetUser: true },
  '/admin/impersonate-user': { action: 'admin.impersonate_user', actor: 'session', targetUser: true },
  '/admin/stop-impersonating': { action: 'admin.stop_impersonating', actor: 'session' },
  '/admin/revoke-user-session': { action: 'admin.revoke_user_session', actor: 'session' },
  '/admin/revoke-user-sessions': { action: 'admin.revoke_user_sessions', actor: 'session', targetUser: true },
}

const AUTH_PREFIX = '/api/auth'

type JsonObject = Record<string, unknown>
const isObject = (v: unknown): v is JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Body JSON (objek) dari Request/Response tanpa mengonsumsi stream aslinya. */
async function readJsonObject(source: Request | Response): Promise<JsonObject | null> {
  if (!source.headers.get('content-type')?.includes('application/json')) return null
  try {
    const data: unknown = await source.clone().json()
    return isObject(data) ? data : null
  } catch {
    return null
  }
}

async function sessionActorOf(headers: Headers): Promise<AuditActor> {
  try {
    const user = await resolveUser(headers)
    return user ? { id: user.id, email: user.email } : null
  } catch {
    return null // token rusak → anonim; endpoint auth sendiri yang menolak
  }
}

function userFrom(data: JsonObject | null): AuditActor {
  const u = data?.user
  if (!isObject(u) || typeof u.id !== 'string') return null
  return { id: u.id, email: typeof u.email === 'string' ? u.email : null }
}

/** Email dari token verifikasi (JWT ditandatangani server) — hanya untuk metadata. */
export function emailFromVerificationToken(token: string | null): string | undefined {
  if (!token) return undefined
  const part = token.split('.')[1]
  if (!part) return undefined
  try {
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown
    return isObject(payload) && typeof payload.email === 'string' ? payload.email : undefined
  } catch {
    return undefined
  }
}

/** Respons redirect Better Auth memuat `?error=` bila gagal (mis. token kedaluwarsa). */
function redirectFailed(res: Response): boolean {
  const location = res.headers.get('location')
  if (!location) return false
  try {
    return new URL(location, 'http://localhost').searchParams.has('error')
  } catch {
    return false
  }
}

export type AuthHandler = (req: Request, c: Context<AppEnv>) => Promise<Response> | Response

/**
 * Bungkus `auth.handler` dengan pencatatan audit untuk path yang terdaftar di
 * RULES; path lain (get-session, jwks, token, …) diteruskan apa adanya.
 */
export function withAuthAudit(handler: AuthHandler, deps?: AuditDeps) {
  return async (c: Context<AppEnv>): Promise<Response> => {
    const path = c.req.path.startsWith(AUTH_PREFIX) ? c.req.path.slice(AUTH_PREFIX.length) : c.req.path
    const rule = RULES[path]
    if (!rule) return handler(c.req.raw, c)

    const body = await readJsonObject(c.req.raw)
    const sessionActor = rule.actor === 'session' || rule.actor === 'either' ? await sessionActorOf(c.req.raw.headers) : null

    const res = await handler(c.req.raw, c)

    const success = res.status < 400 && !redirectFailed(res)
    const resBody = rule.actor === 'response' || rule.actor === 'either' || rule.targetUser ? await readJsonObject(res) : null

    let actor: AuditActor = sessionActor
    if (!actor && (rule.actor === 'response' || rule.actor === 'either') && success) actor = userFrom(resBody)

    let action: AuditAction = rule.action
    if (action === 'auth.sign_in' && success && resBody?.twoFactorRedirect === true) {
      action = 'auth.sign_in_two_factor_required'
    }

    const metadata: Record<string, unknown> = {}
    for (const key of rule.meta ?? []) {
      if (body?.[key] !== undefined) metadata[key] = body[key]
    }
    if (path === '/verify-email') {
      const email = emailFromVerificationToken(c.req.query('token') ?? null)
      if (email) metadata.email = email
    }
    if (!success) metadata.status = res.status

    let targetId: string | undefined
    if (rule.targetUser) {
      targetId = typeof body?.userId === 'string' ? body.userId : userFrom(resBody)?.id
    }

    await auditFromContext(
      c,
      {
        action,
        success,
        actor,
        targetType: targetId ? 'user' : undefined,
        targetId,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      },
      deps,
    )
    return res
  }
}

/** Daftar path yang diaudit (untuk dokumentasi/test). */
export const AUDITED_AUTH_PATHS = Object.keys(RULES)
