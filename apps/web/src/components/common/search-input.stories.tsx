import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SearchInput } from './search-input'

const meta = {
  title: 'Common/SearchInput',
  component: SearchInput,
  args: { placeholder: 'Cari pengguna…', isLoading: false, disabled: false, className: 'w-72' },
} satisfies Meta<typeof SearchInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithValue: Story = { args: { defaultValue: 'budi' } }
export const Loading: Story = { args: { defaultValue: 'budi', isLoading: true } }

function DebounceDemo() {
  const [immediate, setImmediate] = useState('')
  const [debounced, setDebounced] = useState('')
  return (
    <div className="w-72 space-y-2 text-sm">
      <SearchInput placeholder="Ketik lalu berhenti…" onChange={setImmediate} onDebouncedChange={setDebounced} debounceMs={400} />
      <p className="text-muted-foreground">
        langsung: <code>{immediate || '—'}</code> · debounce 400ms: <code>{debounced || '—'}</code>
      </p>
    </div>
  )
}
export const Debounced: Story = { parameters: { controls: { disable: true } }, render: () => <DebounceDemo /> }
