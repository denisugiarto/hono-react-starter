import type { Meta, StoryObj } from '@storybook/react-vite'
import { InfoIcon } from 'lucide-react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

const meta = { title: 'UI/Tooltip', component: Tooltip } satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip>
        <TooltipTrigger render={<Button color="neutral" appearance="outline" />}>Arahkan kursor</TooltipTrigger>
        <TooltipContent>Simpan perubahan (⌘S)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button color="neutral" appearance="ghost" size="icon-sm" aria-label="Info" />}>
          <InfoIcon />
        </TooltipTrigger>
        <TooltipContent side="right">Dihitung dari 30 hari terakhir.</TooltipContent>
      </Tooltip>
    </div>
  ),
}
