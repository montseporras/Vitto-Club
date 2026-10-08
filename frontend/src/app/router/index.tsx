import { createBrowserRouter, Navigate } from 'react-router'
import { CashierLayout } from '@/app/layouts/CashierLayout'
import { PATHS } from './paths'

export const router = createBrowserRouter([
  {
    // TODO: cuando exista login, "/" redirige según el rol de la sesión.
    path: '/',
    element: <Navigate to={PATHS.cashier.root} replace />,
  },
  {
    // Pantallas públicas: no piden sesión.
    lazy: async () => {
      const { AuthLayout } = await import('@/app/layouts/AuthLayout')
      return { Component: AuthLayout }
    },
    children: [
      {
        path: PATHS.auth.login,
        lazy: async () => {
          const { LoginPage } = await import('@/features/auth')
          return { Component: LoginPage }
        },
      },
      {
        path: PATHS.auth.register,
        lazy: async () => {
          const { RegisterPage } = await import('@/features/auth')
          return { Component: RegisterPage }
        },
      },
    ],
  },
  {
    path: PATHS.cashier.root,
    element: <CashierLayout />,
    children: [
      { index: true, element: <Navigate to={PATHS.cashier.customer} replace /> },
      {
        path: PATHS.cashier.customer,
        lazy: async () => {
          const { IdentifyCustomerPage } = await import('@/features/cashier')
          return { Component: IdentifyCustomerPage }
        },
      },
      {
        path: PATHS.cashier.redemption,
        lazy: async () => {
          const { ManageRedemptionPage } = await import('@/features/cashier')
          return { Component: ManageRedemptionPage }
        },
      },
      {
        path: PATHS.cashier.newCustomer,
        lazy: async () => {
          const { ManualCustomerRegistrationPage } = await import('@/features/cashier')
          return { Component: ManualCustomerRegistrationPage }
        },
      },
    ],
  },
  {
    // TODO: proteger con RoleRoute (ADMIN) cuando exista login.
    path: PATHS.admin.root,
    lazy: async () => {
      const { AdminLayout } = await import('@/app/layouts/AdminLayout')
      return { Component: AdminLayout }
    },
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
