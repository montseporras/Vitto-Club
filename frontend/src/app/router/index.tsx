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
      {
        // US-19: Inicio del Cliente
        index: true,
        lazy: async () => {
          const { CustomerHomePage } = await import('@/features/my-account')
          return { Component: CustomerHomePage }
        },
      },
      // Historial: consumos (US-23) y puntos (US-26), una sección debajo de la otra, como el
      // prototipo (clienteTab === 'historial')
      {
        path: PATHS.customer.history,
        lazy: async () => {
          const [{ CustomerHistoryPage }, { PointsHistory }] = await Promise.all([
            import('@/features/consumptions'),
            import('@/features/my-account'),
          ])
          return {
            element: (
              <div className="mx-auto grid w-full max-w-xl gap-8">
                <CustomerHistoryPage />
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
      // Buscar cliente se usa desde Caja; Movimientos de puntos se ve en la ficha (CA-NAV.3)
      {
        path: PATHS.admin.oldIdentifyCustomer,
        element: <Navigate to={PATHS.cashier.customer} replace />,
      },
      {
        path: PATHS.admin.oldPointsMovements,
        element: <Navigate to={PATHS.admin.customers} replace />,
      },
      {
        // Sección Consumos: listado y detalle (US-23)
        path: PATHS.admin.consumptions,
        lazy: async () => {
          const { ConsumptionsPage } = await import('@/features/consumptions')
          return { Component: ConsumptionsPage }
        },
      },
      {
        path: PATHS.admin.consumptionDetail,
        lazy: async () => {
          const { ConsumptionDetailPage } = await import('@/features/consumptions')
          return { Component: ConsumptionDetailPage }
        },
      },
      {
        // Consulta de auditoría (US-58)
        path: PATHS.admin.audit,
        lazy: async () => {
          const { AuditPage } = await import('@/features/audit')
          return { Component: AuditPage }
        },
      },
      // Pantallas de otras historias o sprints: todavía no están construidas
      ...(
        [
          [PATHS.admin.rewards, 'Recompensas', 'Catálogo de recompensas'],
          [PATHS.admin.missions, 'Misiones', 'Misiones'],
          [PATHS.admin.statistics, 'Estadísticas', 'Estadísticas y reportes'],
        ] as const
      ).map(([path, eyebrow, title]) => ({
        path,
        element: <ComingSoon eyebrow={eyebrow} title={title} />,
      })),
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
