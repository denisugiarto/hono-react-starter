import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = { title: 'UI/Tabs', component: Tabs } satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="umum" className="w-96">
      <TabsList>
        <TabsTrigger value="umum">Umum</TabsTrigger>
        <TabsTrigger value="keamanan">Keamanan</TabsTrigger>
        <TabsTrigger value="notif">Notifikasi</TabsTrigger>
      </TabsList>
      <TabsContent value="umum" className="text-sm text-muted-foreground">
        Nama, email, bahasa.
      </TabsContent>
      <TabsContent value="keamanan" className="text-sm text-muted-foreground">
        Password, 2FA, sesi aktif.
      </TabsContent>
      <TabsContent value="notif" className="text-sm text-muted-foreground">
        Email dan push.
      </TabsContent>
    </Tabs>
  ),
}
export const Line: Story = {
  render: () => (
    <Tabs defaultValue="a" className="w-96">
      <TabsList variant="line">
        <TabsTrigger value="a">Ringkasan</TabsTrigger>
        <TabsTrigger value="b">Aktivitas</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="text-sm text-muted-foreground">
        Konten ringkasan.
      </TabsContent>
      <TabsContent value="b" className="text-sm text-muted-foreground">
        Konten aktivitas.
      </TabsContent>
    </Tabs>
  ),
}
