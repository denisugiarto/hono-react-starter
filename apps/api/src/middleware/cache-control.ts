import { every } from 'hono/combine'
import { etag } from 'hono/etag'
import { createMiddleware } from 'hono/factory'

/**
 * Validasi-ulang HTTP untuk GET yang bodinya bisa besar (daftar catatan, audit log,
 * pengguna). Respons `/api/*` default `no-store` (app.ts); untuk route ini diganti:
 *
 *   Cache-Control: private, no-cache  → browser BOLEH menyimpan, tapi WAJIB
 *                                       bertanya dulu (If-None-Match) sebelum memakai
 *   ETag: <hash body>                 → server menjawab 304 tanpa body bila sama
 *
 * `private` melarang proxy/CDN bersama menyimpan data per pengguna. Hasil: data tetap
 * selalu segar, hanya transfer yang dihemat. Fetch di browser menangani 304 otomatis.
 *
 *   notesRoutes.get('/', requirePermission(…), revalidate(), handler)
 */
export function revalidate() {
  const privateNoCache = createMiddleware(async (c, next) => {
    await next()
    if (c.res.ok) c.res.headers.set('Cache-Control', 'private, no-cache')
  })
  // etag di luar: menghitung hash setelah header Cache-Control terpasang, dan
  // mempertahankannya pada respons 304 (retainedHeaders bawaan Hono).
  return every(etag(), privateNoCache)
}
