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
    // Pública: sin sesión, pero solo se ve justo después de cerrarla
    path: PATHS.loggedOut,
    lazy: async () => {
      const { LoggedOutPage } = await import('@/features/auth')
      return { Component: LoggedOutPage }
    },
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
    // Vista del Cliente con el diseño "App Fidelización V2": Inicio, Mis canjes, Recompensas y
    // Mi perfil, cada una con sus pantallas internas
    children: [
      {
        // US-19 y US-39: Inicio (saludo, nivel, promos y recompensas)
        index: true,
        lazy: async () => {
          const { CustomerHomePage } = await import('@/features/my-account')
          return { Component: CustomerHomePage }
        },
      },
      // Detalle de una promoción del carrusel del Inicio
      {
        path: PATHS.customer.promotion,
        lazy: async () => {
          const { PromotionPage } = await import('@/features/my-account')
          return { Component: PromotionPage }
        },
      },
      // Mis canjes: misiones del mes (S5 §3.3.2) y últimos canjes (US-45)
      {
        path: PATHS.customer.redemptions,
        lazy: async () => {
          const { MyRedemptionsPage } = await import('@/features/my-account')
          return { Component: MyRedemptionsPage }
        },
      },
      // Historial: consumos (US-23) y canjes (US-45, US-43)
      {
        path: PATHS.customer.history,
        lazy: async () => {
          const { MyHistoryPage } = await import('@/features/my-account')
          return { Component: MyHistoryPage }
        },
      },
      // Misiones del mes (S5 §3.3.2)
      {
        path: PATHS.customer.missions,
        lazy: async () => {
          const { MissionsPage } = await import('@/features/my-account')
          return { Component: MissionsPage }
        },
      },
      // Recompensas: catálogo (US-39)
      {
        path: PATHS.customer.rewards,
        lazy: async () => {
          const { RewardsPage } = await import('@/features/my-account')
          return { Component: RewardsPage }
        },
      },
      // Detalle de una recompensa y "Canjear recompensa" (US-40)
      {
        path: PATHS.customer.rewardDetail,
        lazy: async () => {
          const { RewardDetailPage } = await import('@/features/my-account')
          return { Component: RewardDetailPage }
        },
      },
      // Mi perfil: menú
      {
        path: PATHS.customer.profile,
        lazy: async () => {
          const { MyProfilePage } = await import('@/features/my-account')
          return { Component: MyProfilePage }
        },
      },
      // Mis datos, contacto y contraseña (§3.10.3 a §3.11.1)
      {
        path: PATHS.customer.profileData,
        lazy: async () => {
          const { ProfileDataPage } = await import('@/features/my-account')
          return { Component: ProfileDataPage }
        },
      },
      // Mi nivel: nivel, saldo, vencimientos y movimientos (US-19, US-26)
      {
        path: PATHS.customer.profileLevel,
        lazy: async () => {
          const { MyLevelPage } = await import('@/features/my-account')
          return { Component: MyLevelPage }
        },
      },
      // Qué avisos llegan por mail (S5 §2.4)
      {
        path: PATHS.customer.profileNotifications,
        lazy: async () => {
          const { NotificationsInfoPage } = await import('@/features/my-account')
          return { Component: NotificationsInfoPage }
        },
      },
      // Preguntas frecuentes y contacto
      {
        path: PATHS.customer.profileHelp,
        lazy: async () => {
          const { HelpPage } = await import('@/features/my-account')
          return { Component: HelpPage }
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
        // Sección Consumos: listado y detalle en un modal (US-23)
        path: PATHS.admin.consumptions,
        lazy: async () => {
          const { ConsumptionsPage } = await import('@/features/consumptions')
          return { Component: ConsumptionsPage }
        },
      },
      {
        // Sección Canjes del Administrador (US-45)
        path: PATHS.admin.redemptions,
        lazy: async () => {
          const { RedemptionsAdminPage } = await import('@/features/redemptions')
          return { Component: RedemptionsAdminPage }
        },
      },
      {
        // Catálogo y alta de recompensas del Administrador (US-34)
        path: PATHS.admin.rewards,
        lazy: async () => {
          const { RewardsAdminPage } = await import('@/features/rewards')
          return { Component: RewardsAdminPage }
        },
      },
      {
        // Consulta de auditoría (US-57)
        path: PATHS.admin.audit,
        lazy: async () => {
          const { AuditPage } = await import('@/features/audit')
          return { Component: AuditPage }
        },
      },
      {
        // Estadísticas y reportes (US-51 a US-55)
        path: PATHS.admin.statistics,
        lazy: async () => {
          const { StatisticsPage } = await import('@/features/statistics')
          return { Component: StatisticsPage }
        },
      },
      // Pantallas de otras historias: todavía no están construidas
      {
        path: PATHS.admin.missions,
        element: <ComingSoon eyebrow="Misiones" title="Misiones" />,
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
