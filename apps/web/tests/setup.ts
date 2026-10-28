/**
 * Preload untuk test komponen React (bun test --preload ./tests/setup.ts, cwd apps/web).
 * Mendaftarkan DOM (happy-dom) ke global agar @testing-library/react bisa render.
 * URL diset agar window.location.origin valid (dipakai localStorage & auth client).
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register({ url: 'http://localhost:5173' })
