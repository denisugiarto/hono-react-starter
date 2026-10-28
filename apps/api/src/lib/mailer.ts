import type { MailConfig } from '../env.ts'
import { Logger } from './logger.ts'

/**
 * Pengiriman email tanpa dependency. Dipakai Better Auth untuk verifikasi email
 * dan reset password (lihat src/auth.ts + lib/emails.ts).
 *
 * - ConsoleMailer: tidak mengirim, hanya mencatat ke log (development).
 * - MemoryMailer: menyimpan di array `sent` (test).
 * - ResendMailer: HTTP API Resend (https://resend.com) — ganti/ tambah provider
 *   lain (SMTP via nodemailer, SES, Postmark) dengan mengimplementasikan `Mailer`.
 */
export type Mail = { to: string; subject: string; text: string; html?: string }

export interface Mailer {
  send(mail: Mail): Promise<void>
}

export class ConsoleMailer implements Mailer {
  private readonly log: Logger
  constructor(log: Logger) {
    this.log = log
  }
  async send(mail: Mail) {
    this.log.info('email (console, tidak dikirim)', { to: mail.to, subject: mail.subject, text: mail.text })
  }
}

export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = []
  async send(mail: Mail) {
    this.sent.push(mail)
  }
  /** Email terakhir ke alamat tertentu (atau terakhir secara umum). */
  last(to?: string): Mail | undefined {
    const list = to ? this.sent.filter((m) => m.to === to) : this.sent
    return list[list.length - 1]
  }
  clear() {
    this.sent.length = 0
  }
}

export type ResendOptions = {
  apiKey: string
  from: string
  /** Override untuk test. */
  fetch?: typeof fetch
  endpoint?: string
}

export class ResendMailer implements Mailer {
  private readonly options: ResendOptions
  private readonly fetchFn: typeof fetch
  private readonly endpoint: string
  constructor(options: ResendOptions) {
    this.options = options
    this.fetchFn = options.fetch ?? fetch
    this.endpoint = options.endpoint ?? 'https://api.resend.com/emails'
  }
  async send(mail: Mail) {
    const res = await this.fetchFn(this.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.options.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: this.options.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    })
    if (!res.ok) {
      let detail = ''
      try {
        detail = await res.text()
      } catch {
        // body tidak terbaca — cukup status
      }
      throw new Error(`Resend gagal mengirim email (HTTP ${res.status}) ${detail}`.trim())
    }
  }
}

export function createMailer(config: MailConfig, log: Logger): Mailer {
  switch (config.provider) {
    case 'memory':
      return new MemoryMailer()
    case 'resend':
      return new ResendMailer({ apiKey: config.apiKey, from: config.from })
    default:
      return new ConsoleMailer(log)
  }
}
