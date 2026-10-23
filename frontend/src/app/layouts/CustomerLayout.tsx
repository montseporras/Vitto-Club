import { useState } from 'react'
import { SessionActions } from '@/features/auth'
import { PointsHistory } from '@/features/my-account'
import { ComingSoon } from '@/shared/components/feedback/ComingSoon'
import { AppFooter, AppHeader } from '@/shared/components/navigation/AppHeader'
import { Icon } from '@/shared/components/ui/Icon'
import { ICONS } from '@/shared/components/ui/icons'

export function CustomerLayout() {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home')

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader area="Mi cuenta" showBack={false}>
        <SessionActions />
      </AppHeader>

      <main className="w-full flex-1 px-4 py-6 pb-24 lg:py-8">
        {activeTab === 'history' ? (
          <PointsHistory />
        ) : (
          <ComingSoon
            eyebrow="Mi cuenta"
            title="Tus puntos y recompensas"
            description="Acá vas a ver tus puntos, tu nivel y las recompensas que podés canjear."
          />
        )}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-white p-2 shadow-lg md:static md:justify-center md:gap-8 md:border-0 md:shadow-none"
      >
        <button
          type="button"
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={() => setActiveTab('home')}
          className={`flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm ${
            activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Icon d={ICONS.user} className="size-5" />
          Inicio
        </button>
        <button
          type="button"
          aria-current={activeTab === 'history' ? 'page' : undefined}
          onClick={() => setActiveTab('history')}
          className={`flex min-w-24 flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm ${
            activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Icon d={ICONS.coins} className="size-5" />
          Historial
        </button>
      </nav>

      <AppFooter />
    </div>
  )
}
