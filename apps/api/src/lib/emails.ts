import type { Mail } from './mailer.ts'

/**
 * Template email transaksional (teks + HTML sederhana). Ubah nada/branding di sini;
 * `appName` diambil dari konfigurasi Better Auth.
 */
type Base = { appName: string; name: string; url: string }

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function layout(title: string, lines: string[], cta: { label: string; url: string }, footer: string): string {
  const body = lines.map((l) => `<p style="margin:0 0 12px">${l}</p>`).join('')
  return `<!doctype html><html lang="id"><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;background:#fff;padding:24px">
<div style="max-width:520px;margin:0 auto">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${body}
<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px">${cta.label}</a></p>
<p style="font-size:12px;color:#666;margin:0">${footer}</p>
<p style="font-size:12px;color:#666;word-break:break-all;margin:8px 0 0">${escapeHtml(cta.url)}</p>
</div></body></html>`
}

export function verificationEmail({ appName, name, url }: Base): Omit<Mail, 'to'> {
  const subject = `Verifikasi email Anda — ${appName}`
  const text = [
    `Halo ${name},`,
    '',
    `Terima kasih sudah mendaftar di ${appName}. Klik tautan berikut untuk memverifikasi email Anda:`,
    url,
    '',
    'Tautan berlaku 24 jam. Abaikan email ini bila Anda tidak mendaftar.',
  ].join('\n')
  const html = layout(
    'Verifikasi email Anda',
    [
      `Halo ${escapeHtml(name)},`,
      `Terima kasih sudah mendaftar di <strong>${escapeHtml(appName)}</strong>. Klik tombol di bawah untuk memverifikasi email Anda.`,
    ],
    { label: 'Verifikasi email', url },
    'Tautan berlaku 24 jam. Abaikan email ini bila Anda tidak mendaftar.',
  )
  return { subject, text, html }
}

export function resetPasswordEmail({ appName, name, url }: Base): Omit<Mail, 'to'> {
  const subject = `Atur ulang password — ${appName}`
  const text = [
    `Halo ${name},`,
    '',
    `Kami menerima permintaan untuk mengatur ulang password akun ${appName} Anda. Klik tautan berikut:`,
    url,
    '',
    'Tautan berlaku 1 jam. Bila Anda tidak meminta ini, abaikan email ini — password tidak berubah.',
  ].join('\n')
  const html = layout(
    'Atur ulang password',
    [
      `Halo ${escapeHtml(name)},`,
      `Kami menerima permintaan untuk mengatur ulang password akun <strong>${escapeHtml(appName)}</strong> Anda.`,
    ],
    { label: 'Atur ulang password', url },
    'Tautan berlaku 1 jam. Bila Anda tidak meminta ini, abaikan email ini — password tidak berubah.',
  )
  return { subject, text, html }
}
