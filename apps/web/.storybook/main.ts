import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook (React + Vite). Konfigurasi Vite proyek (alias `@/`, Tailwind v4) ikut
 * dipakai otomatis; proxy `/api` dimatikan karena tidak relevan di Storybook.
 *
 *   bun run storybook         # http://localhost:6006
 *   bun run build-storybook   # storybook-static/ (dibangun di CI)
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    server: { ...viteConfig.server, proxy: undefined },
  }),
}

export default config
