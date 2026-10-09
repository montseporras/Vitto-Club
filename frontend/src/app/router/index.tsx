import { createBrowserRouter, Navigate } from 'react-router'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CashierLayout } from '@/app/layouts/CashierLayout'
import { LoginPage } from '@/features/auth'
import { PATHS, ROLE_HOME } from './paths'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'

export const router = createBrowserRouter([
  {
    // "/" no tiene pantalla propia: manda a cada rol a la suya
    path: '/',
    element: (
      <ProtectedRoute>
        {(user) => <Navigate to={ROLE_HOME[user.role]} replace />}
      </ProtectedRoute>
    ),
  },
  {
    element: <AuthLayout />,
    children: [{ path: PATHS.login, element: <LoginPage /> }],
  },
  {
    path: PATHS.customer.root,
    lazy: async () => {
      const { CustomerLayout } = await import('@/app/layouts/CustomerLayout')
      return {
        element: (
          <RoleRoute allowed={['CUSTOMER']}>
            <CustomerLayout />
          </RoleRoute>
        ),
      }
    },
  },
  {
    path: PATHS.cashier.root,
    element: (
      <RoleRoute allowed={['CASHIER', 'ADMIN']}>
        <CashierLayout />
      </RoleRoute>
    ),
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
    path: PATHS.admin.root,
    lazy: async () => {
      const { AdminLayout } = await import('@/app/layouts/AdminLayout')
      return {
        element: (
          <RoleRoute allowed={['ADMIN']}>
            <AdminLayout />
          </RoleRoute>
        ),
      }
    },
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
