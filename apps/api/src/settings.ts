import { db } from './db/index.ts'
import { readEmailVerificationRequired } from './env.ts'
import { SettingsStore } from './lib/settings.ts'

/**
 * Singleton pengaturan runtime. Default `requireEmailVerification` dari env
 * AUTH_REQUIRE_EMAIL_VERIFICATION (berlaku sampai admin mengubahnya lewat UI).
 */
export const settings = new SettingsStore(db, {
  defaults: { requireEmailVerification: readEmailVerificationRequired() },
})
