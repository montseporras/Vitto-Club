import { createBrowserRouter, Navigate } from 'react-router'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { CashierLayout } from '@/app/layouts/CashierLayout'
import { LoginPage } from '@/features/auth'
import { ComingSoon } from '@/shared/components/feedback/ComingSoon'
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
    children: [
      { path: PATHS.login, element: <LoginPage /> },
      {
        path: PATHS.register,
        lazy: async () => {
          const { RegisterPage } = await import('@/features/auth')
          return { Component: RegisterPage }
        },
      },
    ],
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
    children: [
      // Inicio es de otra historia (US-19, frontend)
      {
        index: true,
        element: (
          <ComingSoon
            eyebrow="Mi cuenta"
            title="Tus puntos y recompensas"
            description="Acá vas a ver tus puntos, tu nivel y las recompensas que podés canjear."
          />
        ),
      },
      // Historial de puntos (US-26). El historial de consumos es de US-23
      {
        path: PATHS.customer.history,
        lazy: async () => {
          const { PointsHistory } = await import('@/features/my-account')
          return {
            element: (
              <div className="mx-auto w-full max-w-xl">
                <PointsHistory />
              </div>
            ),
          }
        },
      },
      {
        path: PATHS.customer.profile,
        lazy: async () => {
          const { MyProfilePage } = await import('@/features/my-account')
          return { element: <MyProfilePage homePath={PATHS.customer.root} /> }
        },
      },
    ],
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
    children: [
      { index: true, element: <Navigate to={PATHS.admin.customers} replace /> },
      {
        path: PATHS.admin.customers,
        lazy: async () => {
          const { CustomersPage } = await import('@/features/customers')
          return { Component: CustomersPage }
        },
      },
      {
        path: PATHS.admin.customerDetail,
        lazy: async () => {
          const { CustomerDetailPage } = await import('@/features/customers')
          return { Component: CustomerDetailPage }
        },
      },
      {
        // El mismo "Buscar cliente" de Caja; "Registrar cliente" lleva a Clientes (§3.1.1)
        path: PATHS.admin.identifyCustomer,
        lazy: async () => {
          const { IdentifyCustomerPage } = await import('@/features/cashier')
          return {
            Component: () => <IdentifyCustomerPage newCustomerPath={PATHS.admin.customers} />,
          }
        },
      },
      {
        // Listado de movimientos de puntos (US-26)
        path: PATHS.admin.pointsMovements,
        lazy: async () => {
          const { PointsMovementsPage } = await import('@/features/points-movements')
          return { Component: PointsMovementsPage }
        },
      },
      // Pantallas de otras historias o sprints: todavía no están construidas
      ...(
        [
          [PATHS.admin.rewards, 'Recompensas', 'Catálogo de recompensas'],
          [PATHS.admin.missions, 'Misiones', 'Misiones'],
          [PATHS.admin.statistics, 'Estadísticas', 'Estadísticas y reportes'],
          [PATHS.admin.audit, 'Auditoría', 'Auditoría'],
          [PATHS.admin.consumptions, 'Consumos', 'Consumos'],
        ] as const
      ).map(([path, eyebrow, title]) => ({
        path,
        element: <ComingSoon eyebrow={eyebrow} title={title} />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
