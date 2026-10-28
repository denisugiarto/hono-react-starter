import { createBrowserRouter } from 'react-router'
import { routes } from './routes.tsx'

/** Router browser untuk runtime (main.tsx). Test memakai createMemoryRouter(routes). */
export const router = createBrowserRouter(routes)
