import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ALL_PERMISSIONS, type Permissions } from '@hono-react-starter/shared'
import { PermissionMatrix } from './permission-matrix'

function Demo({ value: initial, readOnly }: { value: Permissions; readOnly?: boolean }) {
  const [value, setValue] = useState(initial)
  return (
    <div className="max-w-3xl space-y-3">
      <PermissionMatrix value={value} onChange={setValue} readOnly={readOnly} />
      <pre className="rounded-md bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

const meta = { title: 'Admin/PermissionMatrix', component: Demo, args: { value: { note: ['read', 'update'] } } } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Editable: Story = {}
export const AdminLocked: Story = { args: { value: ALL_PERMISSIONS, readOnly: true } }
export const Empty: Story = { args: { value: {} } }
