# Pendientes de frontend — módulo Clientes (Caja)

> Contexto: el backend de `customers` está completo (alta, búsqueda por documento,
> edición, baja/alta lógica, `dateOfBirth`, historial de estados). Lo que sigue
> son 3 puntos detectados al comparar `frontend/src/features/caja` contra la API
> real. **No hay que tocar nada del backend** — los tres son cambios de frontend.
> Ver [`docs/customers-api.md`](./customers-api.md) para el contrato completo de la API.

---

## 1. 🔴 Bloqueante — el frontend no le está pegando al backend real

No existe `frontend/.env.local`, solo `.env.example`. Vite **no** carga
`.env.example` automáticamente, así que `VITE_API_MOCKS` queda `undefined` y
[`main.tsx`](../frontend/src/app/main.tsx) arranca MSW igual (`enableMocking`
solo se apaga si la variable es exactamente `'false'`).

**Qué hacer:** crear `frontend/.env.local` con:

```
VITE_API_URL=http://localhost:3000/api
VITE_API_MOCKS=false
```

Con el backend corriendo en `:3000`, `npm run dev` deja de mockear con MSW y
pega directo a la API real.

---

## 2. 🟡 Falta UI para reactivar un cliente dado de baja

El backend expone `PATCH /customers/:id/activate` (204, sin body), pero nada
en el frontend lo llama. Hoy [`ClientSummary.tsx`](../frontend/src/features/caja/components/ClientSummary.tsx)
solo deshabilita "Editar datos" y muestra un texto — el cajero no tiene forma
de destrabar al cliente desde la UI.

**Qué hacer:**

### a) `frontend/src/features/caja/api/caja.api.ts` — agregar al final

```ts
export async function activateClient(id: number) {
  try {
    await http.patch(`/customers/${id}/activate`)
  } catch (error) {
    throw toApiError(error)
  }
}
```

### b) `frontend/src/features/caja/api/caja.queries.ts` — actualizar el import y agregar el hook

```ts
import { activateClient, createClient, findClientByDocument, updateClient } from './caja.api'
```

```ts
/** PATCH /customers/:id/activate no devuelve body: se arma el cliente actualizado a mano. */
export const useActivateClient = () => {
  const queryClient = useQueryClient()
  return useMutation<Client, ApiError, Client>({
    mutationFn: async (client) => {
      await activateClient(client.id)
      return { ...client, active: true, deactivatedAt: null }
    },
    onSuccess: (client) => {
      queryClient.setQueryData(clientByDocumentKey(client), client)
    },
  })
}
```

### c) `frontend/src/features/caja/components/ClientSummary.tsx` — reemplazar el archivo completo por:

```tsx
import { DOCUMENT_TYPES } from '@/domain/documents'
import { Alert } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { isoToDisplayDate } from '@/shared/lib/dates'
import { cn } from '@/shared/lib/utils'
import { useActivateClient } from '../api/caja.queries'
import type { Client } from '../types/cliente'

const PENCIL = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'

type ClientSummaryProps = {
  client: Client
  onEdit: () => void
  onActivated: (client: Client) => void
}

/** Datos del cliente encontrado, con el botón para editarlo o reactivarlo. */
export function ClientSummary({ client, onEdit, onActivated }: ClientSummaryProps) {
  const activateClient = useActivateClient()

  const rows = [
    {
      label: 'Documento',
      value: `${DOCUMENT_TYPES[client.documentType].label} ${client.documentNumber}`,
    },
    { label: 'Correo electrónico', value: client.email },
    { label: 'Teléfono', value: client.phone ?? '—' },
    {
      label: 'Fecha de nacimiento',
      value: client.dateOfBirth ? isoToDisplayDate(client.dateOfBirth) : '—',
    },
  ]

  return (
    <article className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl leading-tight">
            {client.firstName} {client.lastName}
          </h3>
          <span
            className={cn(
              'w-fit rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide',
              client.active
                ? 'border-olive/40 bg-olive-50 text-olive-800'
                : 'border-accent-600/40 bg-accent-100 text-accent-800',
            )}
          >
            {client.active ? 'Activo' : 'Dado de baja'}
          </span>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {!client.active && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => activateClient.mutate(client, { onSuccess: onActivated })}
              disabled={activateClient.isPending}
              className="w-full sm:w-auto"
            >
              {activateClient.isPending ? 'Reactivando…' : 'Reactivar cliente'}
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            onClick={onEdit}
            disabled={!client.active}
            className="w-full sm:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d={PENCIL} />
            </svg>
            Editar datos
          </Button>
        </div>
      </div>

      {!client.active && activateClient.isError && (
        <Alert variant="error" className="mt-3">
          No se pudo reactivar el cliente.
        </Alert>
      )}

      {!client.active && !activateClient.isError && (
        <p className="mt-3 text-sm text-accent-800">
          Este cliente está dado de baja. Reactivalo para poder editar sus datos.
        </p>
      )}

      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-accent-200 pt-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs font-bold uppercase tracking-wide text-accent-800">
              {row.label}
            </dt>
            <dd className="text-base break-words text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
```

### d) `frontend/src/features/caja/pages/IdentificarClientePage.tsx` — pasar `onActivated`

Agregar la prop al `<ClientSummary />` que ya está renderizado (reutiliza
`onSaved`, que ya hace lo necesario: mostrar el alert, salir de "editing" y
re-apuntar la búsqueda al cliente actualizado):

```tsx
            {result.data && !result.isFetching && !result.isError && !editing && (
              <ClientSummary
                client={result.data}
                onEdit={() => {
                  setSaved(null)
                  setEditing(true)
                }}
                onActivated={onSaved}
              />
            )}
```

---

## 3. 🟢 Decisión de producto — sin acción obligatoria

`frontend/src/features/clientes/` está vacío (solo `.gitkeep`); el módulo de
clientes vive hoy en `features/caja`. Además, `GET /customers` (listado
paginado, filtro por nombre/activo) y `GET /customers/:id/status-history`
(historial de bajas/altas) ya existen en el backend pero ninguna pantalla los
consume todavía.

Si en algún momento se necesita una pantalla de administración de clientes
(listar, ver historial), esos dos endpoints ya están listos para consumir sin
cambios de backend. Si no está en el alcance actual, no hay nada para hacer.

---

## Resumen

| # | Cambio | Dónde | Backend involucrado |
|---|--------|-------|----------------------|
| 1 | Crear `.env.local` con `VITE_API_MOCKS=false` | `frontend/` (config) | No |
| 2 | Botón "Reactivar cliente" | `caja.api.ts`, `caja.queries.ts`, `ClientSummary.tsx`, `IdentificarClientePage.tsx` | No (`PATCH /customers/:id/activate` ya existe) |
| 3 | Pantalla de administración de clientes (opcional) | `features/clientes/` (a crear) | No (`GET /customers`, `GET /customers/:id/status-history` ya existen) |
