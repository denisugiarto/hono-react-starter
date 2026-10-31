import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActivityIcon, CreditCardIcon, UsersIcon } from 'lucide-react'
import { StatCard } from './stat-card'

const meta = {
  title: 'Common/StatCard',
  component: StatCard,
  args: { title: 'Pengguna aktif', value: '1.280', icon: UsersIcon, trend: { value: 12.3, label: 'vs bulan lalu' } },
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Down: Story = { args: { title: 'Churn', value: '3,2%', icon: ActivityIcon, trend: { value: -4.1, label: 'minggu ini' } } }
export const Loading: Story = { args: { isLoading: true } }

/** Grid KPI khas dashboard. */
export const Grid: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="grid w-[56rem] max-w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Pendapatan" value="Rp 128 jt" icon={CreditCardIcon} trend={{ value: 8.4, label: 'vs bulan lalu' }} />
      <StatCard title="Pengguna aktif" value="1.280" icon={UsersIcon} trend={{ value: 12.3, label: 'vs bulan lalu' }} />
      <StatCard title="Churn" value="3,2%" icon={ActivityIcon} trend={{ value: -1.1, label: 'vs bulan lalu' }} />
      <StatCard title="Tiket terbuka" value={42} description="7 prioritas tinggi" />
    </div>
  ),
}
