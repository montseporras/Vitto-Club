# Misiones: "Próximamente" y dónde queda guardado el diseño

> **Superado el 20/11/2026.** Las misiones (US-28 a US-33) ya están en `develop`. Se sacaron todas las
> etiquetas "Próximamente" (S5-33) y se borraron el interruptor `FEATURES` (`shared/lib/features.ts`),
> `SoonBadge`, `ComingSoon` y las pantallas de reemplazo. Lo de abajo queda solo como registro.

> **Fecha:** 16/11/2026 · **Rama:** `feature/diseno-y-responsive`
>
> Las misiones (US-28 a US-33) todavía no se lanzan. En todos los lugares donde aparecen se muestra
> **"Próximamente"**, y el diseño ya hecho queda guardado en el código, sin usarse, para encenderlo
> cuando llegue el momento.

## 1. El interruptor

[`frontend/src/shared/lib/features.ts`](../../../frontend/src/shared/lib/features.ts):

```ts
export const FEATURES = { missions: false } as const
```

Con `false`, las pantallas del Cliente muestran "Próximamente" y **no piden nada al backend** (no se llama a
`/me/misiones`). Con `true`, vuelve el diseño completo.

## 2. Dónde se ve "Próximamente"

| Lugar | Qué se ve ahora | Dónde está el diseño guardado |
|---|---|---|
| **Cliente → Misiones** (`/mi-cuenta/misiones`) | Pantalla "Misiones: próximamente" con la etiqueta | `MissionsContent` en `features/my-account/pages/MissionsPage.tsx` y `components/client/MissionCard.tsx` |
| **Cliente → Mis canjes**, bloque "Misiones disponibles" | Tarjeta "Próximamente" (sin "Ver todas") | `MissionsPreviewSection` en `features/my-account/pages/MyRedemptionsPage.tsx` |
| **Cliente → Mi perfil → Notificaciones** | La fila "Misiones" lleva la etiqueta | `NOTICES` en `features/my-account/pages/NotificationsInfoPage.tsx` (campo `soon`) |
| **Administración → menú lateral** | "Misiones" deshabilitada con "Próx." (ya estaba) | `AdminLayout.tsx` |
| **Administración → `/admin/misiones`** | Pantalla `ComingSoon` (ya estaba) | `app/router/index.tsx` |
| **Configuración → Notificaciones → mensaje "Misiones"** | Etiqueta junto al nombre | `features/notifications/components/MessagesTab.tsx` |
| **Estadísticas → Programa → "Misiones asignadas"** | Etiqueta junto al título (los datos se siguen mostrando) | `features/statistics/components/MissionsCard.tsx` |
| **Estadísticas → Puntos → "De dónde salen los puntos" → Misiones** | Etiqueta junto al nombre | `features/statistics/components/PointsOriginCard.tsx` |

La etiqueta es el componente compartido
[`SoonBadge`](../../../frontend/src/shared/components/ui/SoonBadge.tsx).

## 3. Cómo se habilitan las misiones

1. Poné `missions: true` en `shared/lib/features.ts`.
2. **Cliente:** ya vuelven solas la pantalla de Misiones y el bloque de "Mis canjes". Sacá la etiqueta de la fila
   "Misiones" en `NotificationsInfoPage` (campo `soon: true`).
3. **Administración:** falta construir la pantalla (US-28 y US-29). Habilitá "Misiones" en el menú de
   `AdminLayout.tsx` (sacá `disabled` y `tag`) y reemplazá el `ComingSoon` de `/admin/misiones` en el router.
4. **Caja y ficha del cliente:** el aviso en "Consumo registrado" (US-30) y el panel de misiones (US-33) no están
   hechos todavía.
5. Sacá `SoonBadge` de `MessagesTab`, `MissionsCard` y `PointsOriginCard` cuando haya datos reales.
6. Los mocks de misiones del Cliente están en `mocks/handlers/my-account.handlers.ts`.

## 4. Lo que no se tocó

- Los textos que mencionan misiones en la ayuda del Cliente (`HelpPage`) y en la ayuda de niveles de
  Configuración → Puntos: son explicaciones, no pantallas.
- Los tipos, la API y los hooks de misiones (`my-account.api.ts`, `my-account.queries.ts`, `types/missions.ts`):
  siguen como estaban, listos para usarse.
