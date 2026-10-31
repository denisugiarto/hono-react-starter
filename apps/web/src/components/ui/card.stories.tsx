import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Autentikasi dua faktor <Badge>Aktif</Badge>
        </CardTitle>
        <CardDescription>Kode 6 digit diminta setiap kali masuk.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Simpan kode cadangan di tempat aman. Setiap kode hanya bisa dipakai sekali.
      </CardContent>
      <CardFooter className="gap-2">
        <Button color="danger" appearance="soft">Nonaktifkan</Button>
        <Button color="neutral" appearance="outline">Kode cadangan baru</Button>
      </CardFooter>
    </Card>
  ),
}
