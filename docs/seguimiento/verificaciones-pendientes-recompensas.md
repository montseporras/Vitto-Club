# Verificaciones pendientes de recompensas (US-35, US-36 y US-38, backend)

> **Para qué es este archivo.** Algunos criterios de US-35, US-36 y US-38 dependen de endpoints que todavía
> no existían cuando se programaron esas historias (08/11/2026): el catálogo del Cliente (US-39), el
> mostrador de Caja (US-40), el uso del canje (US-42) y la pantalla Canjes del Administrador (US-45).
> En US-35, US-36 y US-38 se probó lo que se podía. **Lo que falta lo tiene que probar la historia que
> construye cada endpoint**, con un e2e. Cuando esté probado, marcalo en la tabla.
>
> **Acordado con:** Jazmín, el 08/11/2026 ("anotalo y dejalo asentado").
>
> **Revisado el 09/11/2026** contra los e2e de `develop`: 5 de 7 probados. Quedan el 4 (falta el test) y el 7
> (falta el bloqueo en el código).

---

## Qué falta y quién lo prueba

| # | Criterio | Qué hay que probar | Lo prueba | Hecho |
|---|---|---|---|---|
| 1 | CA-35.4 | Un canje confirmado por 150 pts, de una recompensa que después se editó a 200: al registrar el uso se descuentan **150** (`redemption.points`) | US-42 (`PATCH /canjes/:code/usar`) | ☑ `redemptions-use.e2e-spec.ts`, CA-42.8 |
| 2 | CA-36.8 | Una recompensa **Inactiva** no aparece en `GET /customers/me/recompensas` | US-39 | ☑ `rewards-catalog.e2e-spec.ts`, CA-39.1 |
| 3 | CA-36.8 | Una recompensa **Inactiva** no aparece en `GET /recompensas/disponibles` | US-40 | ☑ `redemptions-confirm.e2e-spec.ts`, `GET /recompensas/disponibles` |
| 4 | US-36 (casos de prueba) | Usar un canje rechazado por la desactivación → `409 REDEMPTION_NOT_CONFIRMED` 'El canje ya está en estado "Rechazado".' | US-42 | ☐ Falta. `redemptions-use` solo prueba un canje ya Utilizado |
| 5 | CA-38.3 | Una recompensa **dada de baja** no aparece en `GET /customers/me/recompensas` ni en `GET /recompensas/disponibles` | US-39 y US-40 | ☑ `rewards-catalog` y `redemptions-confirm` |
| 6 | CA-38.4 | Los canjes viejos de una recompensa dada de baja siguen mostrando su nombre en `GET /canjes`, y el buscador "Recompensa" (`rewardName`) los encuentra por ese nombre | US-45 | ☑ `redemptions-query.e2e-spec.ts` (`rewardName` con una dada de baja) |
| 7 | US-35 / US-40 | Al confirmar un canje, US-40 **bloquea la recompensa** (`SELECT … FOR UPDATE`, con `RewardRepository.lockNotDeletedForUpdate`). Si no, un canje se puede colar mientras el Administrador baja el stock y quedar más confirmados que stock | US-40 | ☐ **No está hecho en el código**: `RedemptionConfirmationService` lee la recompensa con `findById`, sin bloqueo |

---

## Lo que ya se probó en cada historia

| Historia | Probado en el e2e |
|---|---|
| US-35 (`test/rewards-edit.e2e-spec.ts`) | Editar los puntos no toca `redemptions.points` de los canjes confirmados (siguen en 150) |
| US-36 (`test/rewards-status.e2e-spec.ts`) | La Inactiva no aparece entre las Activas de `GET /recompensas`; los canjes quedan `REJECTED` con motivo "Recompensa desactivada" y resueltos por el Sistema |
| US-38 (`test/rewards-delete.e2e-spec.ts`) | La dada de baja no aparece en `GET /recompensas` y da `404` en `GET`, `PATCH`, activar, desactivar y en eliminar otra vez; un canje viejo (`USED`) conserva `reward_name`, `reward_id` y `points` en la base |

---

## Datos para armar los e2e que faltan

- **Disponible** (§3.1): `status = ACTIVE`, stock `null` o mayor que 0, y fecha `null` o mayor o igual que
  hoy en Argentina. La función es `estaDisponible(reward, hoyArgentina)` de
  `src/rewards/domain/reward-availability.ts`.
- **Estados para el escenario:** una Activa disponible (tiene que aparecer), una Inactiva, una Dada de baja,
  una Deshabilitada · Agotada (aparece en el catálogo del Cliente con la etiqueta "Agotada", §2.1, pero no en
  el mostrador) y una Activa vencida que el proceso diario todavía no marcó (no está disponible).
- **Canje rechazado por desactivar:** desactivar la recompensa con `PATCH /recompensas/:id/desactivar`, que
  deja el canje en `REJECTED` con "Recompensa desactivada", y después intentar usarlo.
- **Nombre de un canje viejo:** el snapshot está en `redemptions.reward_name`. La recompensa dada de baja
  sigue existiendo (`status = DELETED`), así que el join por `reward_id` también funciona.
