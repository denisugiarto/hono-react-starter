import { afterEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { Navbar } from '../../src/components/layout/navbar.tsx'

afterEach(cleanup)

describe('Navbar', () => {
  test('slot start · brand · children · end; sticky & container default', () => {
    render(
      <Navbar brand={<a href="/">Brand</a>} start={<button>menu</button>} end={<span>akun</span>}>
        <nav aria-label="utama">nav</nav>
      </Navbar>,
    )
    const header = screen.getByRole('banner')
    expect(header.className).toContain('sticky')
    expect(header.firstElementChild!.className).toContain('container')
    const order = [...header.querySelectorAll('button, a, nav, span')].map((e) => e.textContent)
    expect(order).toEqual(['menu', 'Brand', 'nav', 'akun'])
  })

  test('fluid & sticky=false; tanpa end tidak ada wadah kanan', () => {
    render(<Navbar brand="Dashboard" fluid sticky={false} />)
    const header = screen.getByRole('banner')
    expect(header.className).not.toContain('sticky')
    expect(header.firstElementChild!.className).not.toContain('container')
    expect(header.querySelector('.ml-auto')).toBeNull()
  })
})
