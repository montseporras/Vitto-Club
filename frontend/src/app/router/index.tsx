import { createBrowserRouter, Navigate } from 'react-router'
import { CajeroLayout } from '@/app/layouts/CajeroLayout'
import { PATHS } from './paths'

export const router = createBrowserRouter([
  {
    // TODO: cuando exista login, "/" redirige según el rol de la sesión.
    path: '/',
    element: <Navigate to={PATHS.caja.root} replace />,
  },
  {
    path: PATHS.caja.root,
    element: <CajeroLayout />,
    children: [
      { index: true, element: <Navigate to={PATHS.caja.cliente} replace /> },
      {
        path: PATHS.caja.cliente,
        lazy: async () => {
          const { IdentificarClientePage } = await import('@/features/caja')
          return { Component: IdentificarClientePage }
        },
      },
      {
        path: PATHS.caja.canje,
        lazy: async () => {
          const { GestionarCanjePage } = await import('@/features/caja')
          return { Component: GestionarCanjePage }
        },
      },
      {
        path: PATHS.caja.altaCliente,
        lazy: async () => {
          const { AltaManualClientePage } = await import('@/features/caja')
          return { Component: AltaManualClientePage }
        },
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
