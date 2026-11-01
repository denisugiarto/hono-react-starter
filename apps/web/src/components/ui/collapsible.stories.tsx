import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronsUpDownIcon } from 'lucide-react'
import { Button } from './button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

const meta = { title: 'UI/Collapsible', component: Collapsible } satisfies Meta<typeof Collapsible>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Collapsible className="w-80 space-y-2">
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span className="font-medium">3 repositori lain</span>
        <CollapsibleTrigger render={<Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Tampilkan/sembunyikan" />}>
          <ChevronsUpDownIcon />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        {['hono-react-starter', 'shared-schemas', 'infra'].map((r) => (
          <div key={r} className="rounded-md border px-3 py-2 font-mono text-sm">
            {r}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ),
}
