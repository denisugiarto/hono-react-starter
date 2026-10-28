import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { apiMock } from '../mocks/api.ts'
import { asGuest } from '../mocks/auth-client.ts'
import { renderAt, typeInto, setupEach, teardownEach } from '../utils.tsx'

beforeEach(setupEach)
afterEach(teardownEach)

describe('HealthCard', () => {
  test('menampilkan status, database, uptime', async () => {
    asGuest()
    renderAt('/')
    await waitFor(() => expect(screen.getAllByText('ok').length).toBe(2)) // badge + Database
    expect(screen.getByText(/1\.5s/)).toBeTruthy()
  })

  test('health gagal → pesan HTTP 503', async () => {
    asGuest()
    apiMock.fail.health = true
    renderAt('/')
    await waitFor(() => expect(screen.getByText(/HTTP 503/)).toBeTruthy())
  })
})

describe('HelloCard', () => {
  test('tombol Kirim & Enter memanggil /api/hello', async () => {
    asGuest()
    renderAt('/')
    typeInto(screen.getByLabelText('Nama'), 'Budi')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(screen.getByText(/Hello, Budi!/)).toBeTruthy())

    typeInto(screen.getByLabelText('Nama'), '')
    fireEvent.keyDown(screen.getByLabelText('Nama'), { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(/Hello, World!/)).toBeTruthy())
  })

  test('API gagal → pesan gagal', async () => {
    asGuest()
    apiMock.fail.hello = true
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(screen.getByText('Gagal memanggil /api/hello')).toBeTruthy())
  })
})
