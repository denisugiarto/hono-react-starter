/** Identitas aplikasi — dipakai judul halaman, header, footer, dan meta. */
export const siteConfig = {
  name: 'Hono React Starter',
  tagline: 'Fullstack starter: Hono + React + Vite + Bun',
  description:
    'Backend Hono (Bun) dan frontend React (Vite) dalam monorepo Nx. Data dari PostgreSQL via Drizzle, ' +
    'state server dengan TanStack Query, form dengan React Hook Form + Zod, autentikasi Better Auth.',
  repo: 'https://github.com/denisugiarto/hono-react-starter',
  stack: [
    'Hono',
    'React',
    'Vite',
    'Bun',
    'Nx',
    'Tailwind CSS',
    'shadcn/ui',
    'TypeScript',
    'PostgreSQL',
    'Drizzle',
    'TanStack Query',
    'React Hook Form',
    'Zod',
    'React Router',
  ],
} as const
