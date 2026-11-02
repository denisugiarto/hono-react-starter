import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { VirtualList } from '../../src/components/common/virtual-list.tsx'

// happy-dom tidak punya layout: area gulir diukur lewat clientHeight/clientWidth (200×300),
// baris (mode dynamic) lewat getBoundingClientRect (50px).
const proto = HTMLElement.prototype
const originalRect = proto.getBoundingClientRect
const originalClient = {
  h: Object.getOwnPropertyDescriptor(proto, 'clientHeight'),
  w: Object.getOwnPropertyDescriptor(proto, 'clientWidth'),
}
beforeAll(() => {
  Object.defineProperty(proto, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid && !this.dataset.testid.endsWith('-item') ? 200 : 0
    },
  })
  Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => 300 })
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const height = this.dataset.testid?.endsWith('-item') ? 50 : 0
    return { x: 0, y: 0, top: 0, left: 0, right: 300, bottom: height, width: 300, height, toJSON: () => ({}) } as DOMRect
  }
})
afterAll(() => {
  proto.getBoundingClientRect = originalRect
  if (originalClient.h) Object.defineProperty(proto, 'clientHeight', originalClient.h)
  else delete (proto as unknown as Record<string, unknown>).clientHeight
  if (originalClient.w) Object.defineProperty(proto, 'clientWidth', originalClient.w)
  else delete (proto as unknown as Record<string, unknown>).clientWidth
})
afterEach(cleanup)

const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `Baris ${i}` }))
const rect = { width: 300, height: 200 }

describe('VirtualList', () => {
  test('hanya merender baris di viewport (+overscan); tinggi total sesuai estimasi', () => {
    render(
      <VirtualList
        items={items}
        getKey={(it) => it.id}
        estimateSize={40}
        height={200}
        overscan={2}
        initialRect={rect}
        renderItem={(it) => <span>{it.label}</span>}
      />,
    )
    const rows = screen.getAllByTestId('virtual-list-item')
    expect(rows.length).toBeGreaterThanOrEqual(5)
    expect(rows.length).toBeLessThanOrEqual(8)
    expect(rows[0]?.dataset.index).toBe('0')
    expect(screen.getByText('Baris 0')).toBeTruthy()
    expect(screen.queryByText('Baris 500')).toBeNull()
    const inner = screen.getByTestId('virtual-list').firstElementChild as HTMLElement
    expect(inner.style.height).toBe(`${1000 * 40}px`)
    expect(rows[0]?.style.height).toBe('40px')
  })
  test('dynamic: tanpa tinggi tetap pada baris (diukur); testid kustom', () => {
    render(
      <VirtualList
        items={items.slice(0, 10)}
        dynamic
        initialRect={rect}
        data-testid="feed"
        renderItem={(it) => <p>{it.label}</p>}
      />,
    )
    const rows = screen.getAllByTestId('feed-item')
    expect(rows[0]?.style.height).toBe('')
    expect(screen.getByTestId('feed')).toBeTruthy()
  })
  test('onEndReached dipanggil sekali per jumlah item saat mendekati akhir', () => {
    let fired = 0
    const { rerender } = render(
      <VirtualList items={items.slice(0, 3)} initialRect={rect} onEndReached={() => fired++} renderItem={(it) => it.label} />,
    )
    expect(fired).toBe(1)
    rerender(
      <VirtualList items={items.slice(0, 3)} initialRect={rect} onEndReached={() => fired++} renderItem={(it) => it.label} />,
    )
    expect(fired).toBe(1)
    rerender(
      <VirtualList items={items.slice(0, 4)} initialRect={rect} onEndReached={() => fired++} renderItem={(it) => it.label} />,
    )
    expect(fired).toBe(2)
    // daftar panjang: akhir belum terlihat → tidak dipanggil
    let far = 0
    render(<VirtualList items={items} initialRect={rect} estimateSize={40} onEndReached={() => far++} renderItem={(it) => it.label} />)
    expect(far).toBe(0)
  })
  test('state kosong & memuat', () => {
    const { rerender } = render(<VirtualList items={[]} renderItem={() => null} />)
    expect(screen.getByText('Tidak ada data')).toBeTruthy()
    rerender(<VirtualList items={[]} renderItem={() => null} emptyState={<p>Kosong melompong</p>} />)
    expect(screen.getByText('Kosong melompong')).toBeTruthy()
    rerender(<VirtualList items={[]} isLoading renderItem={() => null} />)
    expect(screen.queryByText('Tidak ada data')).toBeNull()
    expect(screen.queryByTestId('virtual-list')).toBeNull()
  })
})
