import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { AppSettingsView } from '@hono-react-starter/shared'
import { AppSettingsCard } from './app-settings-card'

const base: AppSettingsView = {
  requireEmailVerification: false,
  mailProvider: 'resend',
  emailVerificationReady: true,
  updatedAt: null,
  updatedBy: null,
}

function Demo(props: { settings: AppSettingsView }) {
  const [settings, setSettings] = useState(props.settings)
  return (
    <div className="max-w-xl">
      <AppSettingsCard
        settings={settings}
        onChange={(patch) => setSettings((s) => ({ ...s, ...patch, updatedAt: new Date().toISOString(), updatedBy: 'admin-demo' }))}
      />
    </div>
  )
}

const meta = { title: 'Admin/AppSettingsCard', component: Demo, args: { settings: base } } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}
export const Enabled: Story = { args: { settings: { ...base, requireEmailVerification: true, updatedAt: new Date(Date.now() - 3600e3).toISOString(), updatedBy: 'u-admin' } } }
/** Production dengan MAIL_PROVIDER=console: saklar dikunci sampai provider email siap. */
export const NotReady: Story = { args: { settings: { ...base, mailProvider: 'console', emailVerificationReady: false } } }
