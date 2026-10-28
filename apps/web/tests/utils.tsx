// Urutan penting: mock auth-client (mock.module) harus terdaftar SEBELUM modul app
// dievaluasi, karena itu modul app dimuat lewat `await import()` di bawah.
import './mocks/auth-client.ts'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { installFetchMock, resetApiMock, restoreFetch } from './mocks/api.ts'
import { resetAuthMock } from './mocks/auth-client.ts'

const { Providers } = await import('../src/app/providers.tsx')
const { routes } = await import('../src/app/routes.tsx')

export { routes }

/** Render seluruh app (Providers + router) mulai dari `path`. */
export function renderAt(path = '/', customRoutes: RouteObject[] = routes) {
  const router = createMemoryRouter(customRoutes, { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...utils, router, queryClient }
}

/** Pasang di `beforeEach` tiap file test: reset mock auth + API, tema, storage. */
export function setupEach() {
  resetAuthMock()
  resetApiMock()
  installFetchMock()
  try {
    window.localStorage.clear()
  } catch {
    // abaikan
  }
  document.documentElement.classList.remove('dark')
}

/** Pasang di `afterEach`: unmount komponen + kembalikan fetch asli. */
export function teardownEach() {
  cleanup()
  restoreFetch()
}

export const typeInto = (el: HTMLElement, value: string) => fireEvent.input(el, { target: { value } })
