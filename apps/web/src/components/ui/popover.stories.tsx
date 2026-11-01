import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Field, FieldLabel } from './field'
import { Input } from './input'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover'

const meta = { title: 'UI/Popover', component: Popover } satisfies Meta<typeof Popover>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button color="neutral" appearance="outline" />}>Dimensi</PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>Dimensi</PopoverTitle>
          <PopoverDescription>Atur ukuran lapisan.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor="w">Lebar</FieldLabel>
            <Input id="w" defaultValue="100%" />
          </Field>
          <Field>
            <FieldLabel htmlFor="h">Tinggi</FieldLabel>
            <Input id="h" defaultValue="25px" />
          </Field>
        </div>
      </PopoverContent>
    </Popover>
  ),
}
