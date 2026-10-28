import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { EmptyState } from '../../src/components/common/empty-state.tsx'
import { ErrorMessage } from '../../src/components/common/error-message.tsx'
import { LoadingState } from '../../src/components/common/loading-state.tsx'
import { PageHeader } from '../../src/components/common/page-header.tsx'
import { ApiError } from '../../src/lib/api/request.ts'
import { initialsOf } from '../../src/features/auth/components/user-menu.tsx'

afterEach(cleanup)

describe('komponen common', () => {
  test('PageHeader: judul, deskripsi, aksi', () => {
    render(<PageHeader title="Judul" description="Deskripsi" actions={<button>Aksi</button>} />)
    expect(screen.getByRole('heading', { name: 'Judul' })).toBeTruthy()
    expect(screen.getByText('Deskripsi')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aksi' })).toBeTruthy()
  })

  test('PageHeader minimal hanya judul', () => {
    render(<PageHeader title="Saja" />)
    expect(screen.getByRole('heading', { name: 'Saja' })).toBeTruthy()
  })

  test('LoadingState: jumlah baris & label', () => {
    render(<LoadingState rows={4} label="Tunggu" />)
    const status = screen.getByRole('status', { name: 'Tunggu' })
    expect(status.children.length).toBe(4)
    cleanup()
    render(<LoadingState />)
    expect(screen.getByRole('status', { name: 'Memuat…' }).children.length).toBe(3)
  })

  test('EmptyState: judul, deskripsi, aksi opsional', () => {
    render(<EmptyState title="Kosong" description="Tidak ada data" action={<a href="/">Mulai</a>} />)
    expect(screen.getByText('Kosong')).toBeTruthy()
    expect(screen.getByText('Tidak ada data')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Mulai' })).toBeTruthy()
  })

  test('ErrorMessage: judul + pesan dengan ref requestId untuk 500', () => {
    const err = new ApiError('Terjadi kesalahan internal', 500, 'INTERNAL_ERROR', { requestId: 'abc-123' })
    render(<ErrorMessage title="Gagal" error={err} />)
    expect(screen.getByText('Gagal')).toBeTruthy()
    expect(screen.getByText(/ref: abc-123/)).toBeTruthy()
  })

  test('initialsOf', () => {
    expect(initialsOf('Alice Wonder')).toBe('AW')
    expect(initialsOf('budi')).toBe('B')
    expect(initialsOf('  ')).toBe('?')
  })
})
