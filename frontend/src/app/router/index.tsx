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
