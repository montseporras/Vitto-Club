// Configuración → Notificaciones (US-14, contrato S5 §3.6.2 y §3.8.4): pestañas "Mensajes" e
// "Historial". El título y el subtítulo los muestra el encabezado del modal de Configuración.
// La tarjeta "Promociones" (US-15) va al final de la pestaña Mensajes.
import { useState } from 'react'
import { StatusText } from '@/shared/components/feedback/StatusText'
import { Alert } from '@/shared/components/ui/Alert'
import { cn } from '@/shared/lib/utils'
import { segmentedTabsStyles } from '@/styles/ui'
import { useMessagesConfiguration } from '../api/notifications.queries'
import { HistoryTab } from '../components/HistoryTab'
import { MessagesTab } from '../components/MessagesTab'
import { PromotionsCard } from '../components/PromotionsCard'
import type { MessagesDraft } from '../lib/messages-draft'

type Tab = 'messages' | 'history'

const TABS: [Tab, string][] = [
  ['messages', 'Mensajes'],
  ['history', 'Historial'],
]

export function NotificationsSettingsPage() {
  const [tab, setTab] = useState<Tab>('messages')
  // Cambios sin guardar de la pestaña Mensajes: siguen ahí al ir a Historial y volver. Se pierden al
  // cerrar Configuración (decisión de Melisa).
  const [draft, setDraft] = useState<MessagesDraft | null>(null)
  const config = useMessagesConfiguration()

  return (
    // pb-8: aire debajo de la última tarjeta (Promociones), para que no quede pegada al borde del modal
    <div className="flex flex-col gap-6 pb-8">
      <div role="tablist" aria-label="Notificaciones" className={cn(segmentedTabsStyles.group, 'max-w-[420px]')}>
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              segmentedTabsStyles.option,
              tab === value ? segmentedTabsStyles.optionActive : segmentedTabsStyles.optionIdle,
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <>
          {config.isLoading && <StatusText>Cargando mensajes…</StatusText>}
          {config.isError && (
            <Alert variant="error">
              <p>
                No se pudieron cargar los mensajes.{' '}
                <button
                  type="button"
                  onClick={() => void config.refetch()}
                  className="cursor-pointer font-semibold underline underline-offset-2"
                >
                  Reintentar
                </button>
              </p>
            </Alert>
          )}
          {config.data && (
            <MessagesTab saved={config.data} draft={draft} onDraftChange={setDraft}>
              {/* US-15: la tarjeta "Promociones", tercera en la pestaña (contrato S5 §3.6.2) */}
              <PromotionsCard />
            </MessagesTab>
          )}
        </>
      )}

      {tab === 'history' && <HistoryTab />}
    </div>
  )
}
