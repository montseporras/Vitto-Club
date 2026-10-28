import { useLocation, useNavigate } from 'react-router'
import { Page, PageCard } from '@/shared/components/ui/Page'
import type { DocumentSearch } from '../api/cashier.queries'
import { CustomerRegistrationForm } from '../components/CustomerRegistrationForm'

/** US-17 · RF-015: el Cajero da de alta a un cliente que no encontró por documento. */
export function ManualCustomerRegistrationPage() {
  // Si se llega desde una búsqueda sin resultados, el documento buscado ya viene cargado
  const searched = useLocation().state as DocumentSearch | null
  const navigate = useNavigate()

  return (
    <Page>
      <CustomerRegistrationForm
        initialDocument={searched}
        // "Cancelar" vuelve a Buscar cliente, como el prototipo. Relativo a /caja/alta-cliente
        onCancel={() => navigate('../cliente', { relative: 'path' })}
        layout={(feedback, form) => (
          <>
            {feedback}
            <PageCard eyebrow="Clientes" title="Registrar">
              {form}
            </PageCard>
          </>
        )}
      />
    </Page>
  )
}
