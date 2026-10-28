import { describe, expect, test } from 'bun:test'
import { escapeHtml, resetPasswordEmail, verificationEmail } from '../src/lib/emails.ts'
import { createCapturingSink, Logger } from '../src/lib/logger.ts'
import { ConsoleMailer, createMailer, MemoryMailer, ResendMailer } from '../src/lib/mailer.ts'

const mail = { to: 'a@test.local', subject: 'Halo', text: 'isi', html: '<p>isi</p>' }

describe('Mailer — console & memory', () => {
  test('ConsoleMailer mencatat ke log, tidak mengirim', async () => {
    const { sink, lines } = createCapturingSink()
    await new ConsoleMailer(new Logger({ sink })).send(mail)
    expect(lines.length).toBe(1)
    const row = lines[0]!.json()
    expect(row.msg).toContain('console')
    expect(row.to).toBe('a@test.local')
    expect(row.subject).toBe('Halo')
  })

  test('MemoryMailer menyimpan, last(to) & clear()', async () => {
    const m = new MemoryMailer()
    expect(m.last()).toBeUndefined()
    await m.send(mail)
    await m.send({ ...mail, to: 'b@test.local', subject: 'Kedua' })
    expect(m.sent.length).toBe(2)
    expect(m.last()!.subject).toBe('Kedua')
    expect(m.last('a@test.local')!.subject).toBe('Halo')
    m.clear()
    expect(m.sent.length).toBe(0)
  })
})

describe('Mailer — Resend (HTTP API)', () => {
  test('POST ke endpoint dengan bearer & payload; error HTTP → throw', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    let status = 200
    const fetchMock = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! })
      return new Response(status === 200 ? '{"id":"1"}' : 'invalid api key', { status })
    }) as typeof fetch

    const mailer = new ResendMailer({ apiKey: 're_x', from: 'App <no-reply@x.co>', fetch: fetchMock })
    await mailer.send(mail)
    expect(calls[0]!.url).toBe('https://api.resend.com/emails')
    expect(new Headers(calls[0]!.init.headers).get('authorization')).toBe('Bearer re_x')
    const payload = JSON.parse(String(calls[0]!.init.body))
    expect(payload).toEqual({ from: 'App <no-reply@x.co>', to: ['a@test.local'], subject: 'Halo', text: 'isi', html: '<p>isi</p>' })

    status = 401
    await expect(mailer.send(mail)).rejects.toThrow(/HTTP 401.*invalid api key/)
  })

  test('endpoint bisa di-override', async () => {
    let seen = ''
    const fetchMock = (async (url: string | URL | Request) => {
      seen = String(url)
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    await new ResendMailer({ apiKey: 'k', from: 'a@b.co', fetch: fetchMock, endpoint: 'http://mock/emails' }).send(mail)
    expect(seen).toBe('http://mock/emails')
  })
})

describe('createMailer', () => {
  const log = new Logger({ level: 'silent' })
  test('memilih implementasi sesuai provider', () => {
    expect(createMailer({ provider: 'memory' }, log)).toBeInstanceOf(MemoryMailer)
    expect(createMailer({ provider: 'console' }, log)).toBeInstanceOf(ConsoleMailer)
    expect(createMailer({ provider: 'resend', apiKey: 'k', from: 'a@b.co' }, log)).toBeInstanceOf(ResendMailer)
  })
})

describe('Template email', () => {
  test('escapeHtml', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;')
  })

  test('verifikasi: subject, teks berisi URL, HTML di-escape', () => {
    const m = verificationEmail({ appName: 'App', name: '<Budi>', url: 'http://x/verify?token=1&cb=2' })
    expect(m.subject).toBe('Verifikasi email Anda — App')
    expect(m.text).toContain('http://x/verify?token=1&cb=2')
    expect(m.text).toContain('Halo <Budi>')
    expect(m.html).toContain('Halo &lt;Budi&gt;')
    expect(m.html).toContain('href="http://x/verify?token=1&amp;cb=2"')
    expect(m.html).toContain('Verifikasi email')
  })

  test('reset password', () => {
    const m = resetPasswordEmail({ appName: 'App', name: 'Ani', url: 'http://x/reset?token=abc' })
    expect(m.subject).toBe('Atur ulang password — App')
    expect(m.text).toContain('http://x/reset?token=abc')
    expect(m.html).toContain('Atur ulang password')
    expect(m.html).toContain('berlaku 1 jam')
  })
})
