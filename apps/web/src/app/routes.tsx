import type { RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { paths } from '@/config/paths'
import { RequireAuth, RequirePermission } from '@/features/auth'
import { AuditLogsPage } from '@/pages/admin/audit-logs-page'
import { UsersPage } from '@/pages/admin/users-page'
import { ForgotPasswordPage } from '@/pages/forgot-password-page'
import { HomePage } from '@/pages/home-page'
import { LoginPage } from '@/pages/login-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { NotesPage } from '@/pages/notes-page'
import { ResetPasswordPage } from '@/pages/reset-password-page'
import { RouteErrorPage } from '@/pages/route-error-page'
import { ApiTokenPage } from '@/pages/settings/api-token-page'
import { SecurityPage } from '@/pages/settings/security-page'
import { TwoFactorPage } from '@/pages/two-factor-page'
import { VerifyEmailPage } from '@/pages/verify-email-page'

/**
 * Definisi route (dipakai createBrowserRouter di router.tsx dan
 * createMemoryRouter di test). Guard:
 * - RequireAuth: wajib login (redirect ke /login, kembali ke `from` setelah masuk)
 * - RequirePermission: wajib permission RBAC (403 bila tidak punya)
 */
export const routes: RouteObject[] = [
  {
    path: paths.home,
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: paths.login, element: <LoginPage /> },
      { path: paths.twoFactor, element: <TwoFactorPage /> },
      { path: paths.forgotPassword, element: <ForgotPasswordPage /> },
      { path: paths.resetPassword, element: <ResetPasswordPage /> },
      { path: paths.verifyEmail, element: <VerifyEmailPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: paths.notes, element: <NotesPage /> },
          { path: paths.apiToken, element: <ApiTokenPage /> },
          { path: paths.security, element: <SecurityPage /> },
          {
            element: <RequirePermission permission={{ user: ['list'] }} />,
            children: [{ path: paths.adminUsers, element: <UsersPage /> }],
          },
          {
            element: <RequirePermission permission={{ audit: ['list'] }} />,
            children: [{ path: paths.adminAuditLogs, element: <AuditLogsPage /> }],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
