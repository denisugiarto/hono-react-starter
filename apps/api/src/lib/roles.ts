import { eq, sql } from 'drizzle-orm'
import type { Role } from 'better-auth/plugins/access'
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_DEFINITIONS,
  buildRole,
  grants,
  mergePermissions,
  permissionsSchema,
  type Permissions,
  type RoleDefinition,
} from '@hono-react-starter/shared/permissions'
import type { Db } from '../db/index.ts'
import { appRole, user } from '../db/schema.ts'

export type RoleRegistryOptions = {
  /** Umur cache sebelum dibaca ulang dari DB (ms). */
  ttlMs?: number
}

/**
 * Registry role dinamis (tabel `app_role`) dengan cache dalam proses.
 *
 * `roles` adalah SATU objek yang dipegang plugin admin Better Auth (`admin({ roles })`);
 * plugin membaca `roles[name]` pada setiap request, jadi registry memutasinya di
 * tempat (bukan mengganti objek) agar perubahan admin langsung berlaku: set-role ke
 * role yang tidak ada → 400 dari plugin, permission endpoint admin mengikuti definisi baru.
 *
 * Role sistem: `admin` selalu `ALL_PERMISSIONS` (nilai di DB diabaikan — mencegah admin
 * mengunci dirinya sendiri), `user` boleh diubah permission-nya, keduanya tidak bisa dihapus.
 */
export class RoleRegistry {
  readonly roles: Record<string, Role> = {}
  private readonly db: Db
  private readonly ttlMs: number
  private definitions = new Map<string, RoleDefinition>()
  private loadedAt = 0
  private loading: Promise<RoleDefinition[]> | null = null

  constructor(db: Db, options: RoleRegistryOptions = {}) {
    this.db = db
    this.ttlMs = options.ttlMs ?? 15_000
    this.apply(DEFAULT_ROLE_DEFINITIONS)
  }

  /** Semua definisi (cache). Memicu pembacaan ulang di latar belakang bila kedaluwarsa. */
  current(): RoleDefinition[] {
    if (Date.now() - this.loadedAt > this.ttlMs) void this.refresh()
    return [...this.definitions.values()]
  }

  definition(name: string): RoleDefinition | undefined {
    this.current()
    return this.definitions.get(name)
  }

  has(name: string): boolean {
    return this.definition(name) !== undefined
  }

  /** Permission efektif sebuah role (`a,b` = gabungan). Role tak dikenal → kosong. */
  permissionsOf(role: string | null | undefined): Permissions {
    this.current()
    return mergePermissions(role, Object.fromEntries([...this.definitions].map(([n, d]) => [n, d.permissions])))
  }

  /** Apakah role punya SEMUA permission yang diminta (gabungan bila dipisah koma). */
  can(role: string | null | undefined, requested: Permissions): boolean {
    if (!role) return false
    return grants(this.permissionsOf(role), requested)
  }

  /** Baca dari DB; role sistem yang hilang dibuat ulang. */
  async load(): Promise<RoleDefinition[]> {
    if (this.loading) return this.loading
    this.loading = this.read().finally(() => {
      this.loading = null
    })
    return this.loading
  }

  async create(input: { name: string; description: string; permissions: Permissions }): Promise<RoleDefinition> {
    await this.db.insert(appRole).values({ ...input, permissions: input.permissions as Record<string, string[]>, system: false })
    await this.reload()
    return this.definitions.get(input.name)!
  }

  async update(name: string, patch: { description?: string; permissions?: Permissions }): Promise<RoleDefinition> {
    await this.db
      .update(appRole)
      .set({
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.permissions !== undefined ? { permissions: patch.permissions as Record<string, string[]> } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(appRole.name, name))
    await this.reload()
    return this.definitions.get(name)!
  }

  async delete(name: string): Promise<void> {
    await this.db.delete(appRole).where(eq(appRole.name, name))
    await this.reload()
  }

  /** Jumlah user per role (untuk UI & cek "masih dipakai"). */
  async usersCount(): Promise<Map<string, number>> {
    const rows = await this.db.select({ role: user.role, n: sql<number>`count(*)::int` }).from(user).groupBy(user.role)
    const map = new Map<string, number>()
    for (const r of rows) for (const name of (r.role ?? 'user').split(',')) map.set(name.trim(), (map.get(name.trim()) ?? 0) + r.n)
    return map
  }

  /** Lupakan cache (test setelah TRUNCATE). */
  invalidate() {
    this.loadedAt = 0
    this.apply(DEFAULT_ROLE_DEFINITIONS)
  }

  private async reload() {
    this.loadedAt = 0
    await this.load()
  }

  private async refresh() {
    try {
      await this.load()
    } catch {
      // DB tidak terbaca → pakai definisi terakhir; dicoba lagi saat current() berikutnya
      this.loadedAt = Date.now()
    }
  }

  private async read(): Promise<RoleDefinition[]> {
    const rows = await this.db.select().from(appRole)
    const missing = DEFAULT_ROLE_DEFINITIONS.filter((d) => !rows.some((r) => r.name === d.name))
    if (missing.length) {
      await this.db
        .insert(appRole)
        .values(missing.map((d) => ({ ...d, permissions: d.permissions as Record<string, string[]> })))
        .onConflictDoNothing()
      return this.read()
    }
    const defs: RoleDefinition[] = rows.map((row) => {
      const parsed = permissionsSchema.safeParse(row.permissions)
      const fallback = DEFAULT_ROLE_DEFINITIONS.find((d) => d.name === row.name)?.permissions ?? {}
      return {
        name: row.name,
        description: row.description,
        permissions: row.name === 'admin' ? ALL_PERMISSIONS : parsed.success ? parsed.data : fallback,
        system: row.system,
      }
    })
    this.apply(defs)
    this.loadedAt = Date.now()
    return defs
  }

  /** Ganti isi cache dan mutasi `roles` di tempat (plugin admin memegang referensinya). */
  private apply(defs: readonly RoleDefinition[]) {
    this.definitions = new Map(defs.map((d) => [d.name, d]))
    for (const key of Object.keys(this.roles)) if (!this.definitions.has(key)) delete this.roles[key]
    for (const d of defs) this.roles[d.name] = buildRole(d.permissions)
  }
}
