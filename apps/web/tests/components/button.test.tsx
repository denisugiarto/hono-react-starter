import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Button, LEGACY_VARIANTS, buttonVariants } from '../../src/components/ui/button.tsx'

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

  test('variant lama dipetakan; color/appearance eksplisit menang atas variant', () => {
    for (const [variant, expected] of Object.entries(LEGACY_VARIANTS)) {
      const { unmount } = render(<Button variant={variant as keyof typeof LEGACY_VARIANTS}>{variant}</Button>)
      const cls = classesOf(variant)
      expect(cls).toContain(`[--btn-color:var(--${expected.color === 'danger' ? 'destructive' : expected.color === 'neutral' ? 'foreground' : expected.color})]`)
      unmount()
    }
    render(
      <Button variant="destructive" appearance="fill">
        Isi
      </Button>,
    )
    expect(classesOf('Isi')).toContain('text-(--btn-contrast)')
    expect(classesOf('Isi')).not.toContain('bg-(--btn-color)/10')
  })

  test('neutral outline/ghost memakai tampilan shadcn asli; size "default" = md', () => {
    render(<Button variant="outline">Batal</Button>)
    expect(classesOf('Batal')).toContain('border-border')
    render(<Button variant="ghost">Tutup</Button>)
    expect(classesOf('Tutup')).toContain('hover:bg-muted')
    expect(buttonVariants({ size: 'default' })).toBe(buttonVariants({ size: 'md' }))
  })

  test('ukuran ikon', () => {
    render(<Button size="icon-xl" aria-label="Ikon" />)
    expect(classesOf('Ikon')).toContain('size-10')
  })
})
