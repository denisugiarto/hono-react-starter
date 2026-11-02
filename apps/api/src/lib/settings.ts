import { sql } from 'drizzle-orm'
import {
  APP_SETTING_KEYS,
  DEFAULT_APP_SETTINGS,
  appSettingsSchema,
  type AppSettings,
  type MailProvider,
} from '@hono-react-starter/shared/settings'
import type { Db } from '../db/index.ts'
import { appSetting } from '../db/schema.ts'

export type SettingsStoreOptions = {
  /** Nilai awal bila belum ada baris di DB (dari env). */
  defaults?: Partial<AppSettings>
  /** Umur cache sebelum dibaca ulang dari DB (ms) — agar instance lain ikut melihat perubahan. */
  ttlMs?: number
}

export type SettingsMeta = { updatedAt: string | null; updatedBy: string | null }

/**
 * Penyimpanan pengaturan runtime dengan cache dalam proses.
 *
 * `current()` sinkron (dipakai getter opsi Better Auth saat request) dan
 * mengembalikan nilai cache; bila cache kedaluwarsa, pembacaan ulang dijalankan
 * di latar belakang dan nilai lama dipakai dulu. Gagal membaca DB tidak pernah
 * melempar dari `current()` — nilai terakhir yang diketahui tetap berlaku.
 */
export class SettingsStore {
  private readonly defaults: AppSettings
  private readonly ttlMs: number
  private cache: AppSettings
  private meta: SettingsMeta = { updatedAt: null, updatedBy: null }
  private loadedAt = 0
  private loading: Promise<AppSettings> | null = null

  private readonly db: Db

  constructor(db: Db, options: SettingsStoreOptions = {}) {
    this.db = db
    this.defaults = { ...DEFAULT_APP_SETTINGS, ...options.defaults }
    this.ttlMs = options.ttlMs ?? 15_000
    this.cache = this.defaults
  }

  /** Nilai saat ini (cache). Memicu pembacaan ulang di latar belakang bila kedaluwarsa. */
  current(): AppSettings {
    if (Date.now() - this.loadedAt > this.ttlMs) void this.refresh()
    return this.cache
  }

  /** Metadata perubahan terakhir (untuk UI). */
  lastUpdate(): SettingsMeta {
    return this.meta
  }

  /** Baca dari DB (digabung dengan default); nilai tidak valid/kunci asing diabaikan. */
  async load(): Promise<AppSettings> {
    if (this.loading) return this.loading
    this.loading = this.read().finally(() => {
      this.loading = null
    })
    return this.loading
  }

  /** Simpan sebagian pengaturan lalu kembalikan nilai terbaru. */
  async update(patch: Partial<AppSettings>, updatedBy: string | null): Promise<AppSettings> {
    for (const key of APP_SETTING_KEYS) {
      const value = patch[key]
      if (value === undefined) continue
      await this.db
        .insert(appSetting)
        .values({ key, value, updatedBy })
        .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedBy, updatedAt: sql`now()` } })
    }
    this.loadedAt = 0
    return this.load()
  }

  /** Lupakan cache (dipakai test setelah TRUNCATE). */
  invalidate() {
    this.loadedAt = 0
    this.cache = this.defaults
    this.meta = { updatedAt: null, updatedBy: null }
  }

  private async refresh() {
    try {
      await this.load()
    } catch {
      // DB tidak bisa dibaca → pakai nilai terakhir; percobaan berikutnya saat current() dipanggil lagi
      this.loadedAt = Date.now()
    }
  }

  private async read(): Promise<AppSettings> {
    const rows = await this.db.select().from(appSetting)
    const merged: AppSettings = { ...this.defaults }
    let latest: (typeof rows)[number] | undefined
    for (const row of rows) {
      const key = row.key as keyof AppSettings
      const field = appSettingsSchema.shape[key]
      if (!field) continue
      const parsed = field.safeParse(row.value)
      if (!parsed.success) continue
      ;(merged as Record<string, unknown>)[key] = parsed.data
      if (!latest || row.updatedAt > latest.updatedAt) latest = row
    }
    this.cache = merged
    this.meta = { updatedAt: latest?.updatedAt.toISOString() ?? null, updatedBy: latest?.updatedBy ?? null }
    this.loadedAt = Date.now()
    return merged
  }
}

/**
 * Boleh mewajibkan verifikasi email? Di production email harus benar-benar
 * terkirim (provider sungguhan), kalau tidak pengguna terkunci selamanya.
 */
export function canRequireEmailVerification(opts: { isProd: boolean; mailProvider: MailProvider }): boolean {
  return !opts.isProd || opts.mailProvider === 'resend'
}
