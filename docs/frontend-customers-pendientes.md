# Pendientes de frontend — módulo Clientes (Caja)

> Contexto: el backend de `customers` está completo (alta, búsqueda por documento,
> edición, baja/alta lógica, `dateOfBirth`, historial de estados). Lo que sigue
> son 3 puntos detectados al comparar `frontend/src/features/cashier` contra la API
> real. **No hay que tocar nada del backend** — los tres son cambios de frontend.
> Ver [`docs/customers-api.md`](./customers-api.md) para el contrato completo de la API.

---

## 1. ✅ Resuelto — el frontend no le estaba pegando al backend real

No existía `frontend/.env.local` y, sin `VITE_API_MOCKS=false`,
[`main.tsx`](../frontend/src/app/main.tsx) arrancaba MSW igual.

**Qué se hizo:** se creó `frontend/.env.local` con:

```
VITE_API_URL=http://localhost:3000/api
VITE_API_MOCKS=false
```

> `.env.local` está en el `.gitignore`: **cada integrante tiene que crear el
> suyo** (ver `frontend/.env.example`). Después de crearlo o cambiarlo, reiniciar
> `npm run dev` y recargar con Ctrl+Shift+R.

---

## 2. ✅ Resuelto — UI para reactivar un cliente dado de baja

La baja del cliente la implementa otro integrante; acá solo se cubrió la
reactivación.

**Flujo:** en *Buscar clientes*, si el cliente encontrado está dado de baja,
en lugar de "Editar datos" (que no se puede usar con el cliente inactivo)
aparece el botón **"Reactivar cuenta"**. Llama a
`PATCH /customers/:id/activate` y, si sale bien, muestra "Cuenta reactivada",
el cliente pasa a "Activo" y vuelve a aparecer "Editar datos". Si falla,
muestra un alert con el mensaje del backend.

**Archivos tocados:**

| Archivo | Cambio |
|---------|--------|
| `features/cashier/api/cashier.api.ts` | `activateCustomer(id)` |
| `features/cashier/api/cashier.queries.ts` | `useActivateCustomer()` — el endpoint responde 204 sin body, así que arma el cliente activo a mano y actualiza la caché de la búsqueda |
| `features/cashier/components/CustomerSummary.tsx` | Botón "Reactivar cuenta", estado de carga y alert de error; nueva prop `onActivated` |
| `features/cashier/pages/IdentifyCustomerPage.tsx` | Alert de éxito propio ("Cuenta reactivada") |
| `mocks/handlers/cashier.handlers.ts` | Handler MSW de `PATCH /customers/:id/activate` (204 / 404 / 409). Para probar en modo mocks: Carlos Ruiz, DNI 27555444 |

Probado contra el backend real (baja por API → búsqueda → "Reactivar cuenta" →
el cliente queda `active: true`).

### Cambios de UI hechos junto con este punto

- Menú de Caja (`app/layouts/CashierLayout.tsx`): "Cliente" → **"Buscar
  clientes"**, "Alta manual de cliente" → **"Nuevo cliente"**, y "Gestionar
  canje por código" pasó al final.
- Título de la columna izquierda: "Cliente" → **"Buscar"**
  (`IdentifyCustomerPage.tsx`) y "Alta manual de cliente" → **"Registrar"**
  (`ManualCustomerRegistrationPage.tsx`).

---

## 3. 🟢 Decisión de producto — sin acción obligatoria

`frontend/src/features/customers/` está vacío (solo `.gitkeep`); el módulo de
clientes vive hoy en `features/cashier`. Además, `GET /customers` (listado
paginado, filtro por nombre/activo) y `GET /customers/:id/status-history`
(historial de bajas/altas) ya existen en el backend pero ninguna pantalla los
consume todavía.

Si en algún momento se necesita una pantalla de administración de clientes
(listar, ver historial), esos dos endpoints ya están listos para consumir sin
cambios de backend. Si no está en el alcance actual, no hay nada para hacer.

---

## Resumen

| # | Cambio | Estado | Dónde | Backend involucrado |
|---|--------|--------|-------|----------------------|
| 1 | Crear `.env.local` con `VITE_API_MOCKS=false` | ✅ Hecho (cada integrante crea el suyo) | `frontend/` (config) | No |
| 2 | Botón "Reactivar cuenta" | ✅ Hecho | `cashier.api.ts`, `cashier.queries.ts`, `CustomerSummary.tsx`, `IdentifyCustomerPage.tsx`, `cashier.handlers.ts` | No (`PATCH /customers/:id/activate` ya existe) |
| 3 | Pantalla de administración de clientes (opcional) | ⏳ Pendiente de decisión | `features/customers/` (a crear) | No (`GET /customers`, `GET /customers/:id/status-history` ya existen) |
