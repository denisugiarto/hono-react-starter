import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Button, buttonVariants } from '../../src/components/ui/button.tsx'

afterEach(cleanup)

const classesOf = (name: string) => screen.getByRole('button', { name }).className

describe('Button — color × appearance × size', () => {
  test('default = primary · fill · md', () => {
    render(<Button>Simpan</Button>)
    const cls = classesOf('Simpan')
    expect(cls).toContain('[--btn-color:var(--primary)]')
    expect(cls).toContain('bg-(--btn-color)')
    expect(cls).toContain('h-8')
  })

  test('kombinasi bebas: warna hanya mengisi variabel, tampilan memakainya', () => {
    render(
      <Button color="success" appearance="outline" size="xl">
        Selesai
      </Button>,
    )
    const cls = classesOf('Selesai')
    expect(cls).toContain('[--btn-color:var(--success)]')
    expect(cls).toContain('border-(--btn-color)/40')
    expect(cls).toContain('h-10')
    expect(cls).toContain('focus-visible:ring-(--btn-color)/25') // ring mengikuti warna
  })

  test('prop `color` tidak bocor ke DOM sebagai atribut HTML', () => {
    render(
      <Button color="danger" appearance="ghost">
        Hapus
      </Button>,
    )
    const el = screen.getByRole('button', { name: 'Hapus' })
    expect(el.getAttribute('color')).toBeNull()
    expect(el.className).toContain('[--btn-color:var(--destructive)]')
  })

  test('neutral outline/ghost memakai tampilan shadcn asli; soft danger = padanan destructive lama', () => {
    render(
      <Button color="neutral" appearance="outline">
        Batal
      </Button>,
    )
    expect(classesOf('Batal')).toContain('border-border')
    render(
      <Button color="neutral" appearance="ghost">
        Tutup
      </Button>,
    )
    expect(classesOf('Tutup')).toContain('hover:bg-muted')
    render(
      <Button color="danger" appearance="soft">
        Hapus akun
      </Button>,
    )
    expect(classesOf('Hapus akun')).toContain('bg-(--btn-color)/10')
    expect(buttonVariants({})).toBe(buttonVariants({ color: 'primary', appearance: 'fill', size: 'md' }))
  })

  test('ukuran ikon', () => {
    render(<Button size="icon-xl" aria-label="Ikon" />)
    expect(classesOf('Ikon')).toContain('size-10')
  })
})
