/**
 * Preload untuk test komponen React (bun test --preload ./tests/ui/setup.ts).
 * Mendaftarkan DOM (happy-dom) ke global agar @testing-library/react bisa render.
 */
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()
