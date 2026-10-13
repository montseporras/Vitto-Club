import { SessionActions } from '@/features/auth'
import { ComingSoon } from '@/shared/components/feedback/ComingSoon'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'

// Layout para las vistas del rol Cliente. Por ahora solo marca el destino del
// login: las pantallas del cliente (mobile, tabs abajo) son de otros RF.
export function CustomerLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mi cuenta" showBack={false}>
        <SessionActions />
      </AppHeader>

      <main className="w-full flex-1 px-4 py-6 lg:py-8">
        <ComingSoon
          eyebrow="Mi cuenta"
          title="Tus puntos y recompensas"
          description="Acá vas a ver tus puntos, tu nivel y las recompensas que podés canjear."
        />
      </main>

      <AppFooter />
    </div>
  )
}
