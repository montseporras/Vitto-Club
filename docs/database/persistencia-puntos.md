# Persistencia y migraciones del programa de puntos

> Extraído de `funcionalidades/configuracion-de-puntos.md`.

Los modelos Prisma previos `LoyaltyPointsConfiguration`,
`LoyaltyPointsValidityConfiguration` y `FirstPurchaseBonusConfiguration` están
en `backend/prisma/schema.prisma`. Las tablas PostgreSQL son
`loyalty_points_configuration`, `loyalty_points_validity_configuration` y
`first_purchase_bonus_configuration`. Estas tablas singleton se conservan
como datos legacy y fuente de importación de la versión inicial; la
persistencia activa pasa a ser `LoyaltyProgramConfiguration`, un snapshot
completo descrito en la sección RF-014 al final de este documento.

| Columna          | Tipo            | Regla                                               |
| ---------------- | --------------- | --------------------------------------------------- |
| `id`             | `INTEGER`       | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `base_amount`    | `DECIMAL(12,2)` | Obligatorio; CHECK `> 0`.                           |
| `points_awarded` | `INTEGER`       | Obligatorio; CHECK `> 0`.                           |
| `created_at`     | `TIMESTAMP(3)`  | Obligatorio; por defecto hora actual.               |
| `updated_at`     | `TIMESTAMP(3)`  | Obligatorio; actualizado por Prisma en cada upsert. |

La PK más el CHECK `id = 1` impiden que haya dos configuraciones activas a la
vez. Los CHECK positivos mantienen las invariantes incluso si otro proceso
escribe directamente en la tabla. La migración inicial está en
`backend/prisma/migrations/20261007150000_add_loyalty_points_configuration/`.
Como en el resto del proyecto, aplicar migraciones es una tarea explícita de
despliegue; la API no ejecuta migraciones automáticamente al iniciar.

Desde `backend/`, en desarrollo:

```sh
npx prisma migrate dev
```

En un ambiente de despliegue:

```sh
npx prisma migrate deploy
```

La vigencia se crea en
`backend/prisma/migrations/20261007170000_add_points_validity_configuration/`;
su columna `points_expiration_months` tiene default SQL `12` y un CHECK
positivo, además de una PK singleton. La migración de equivalencia previa no
se modifica.

| Columna                    | Tipo           | Regla                                               |
| -------------------------- | -------------- | --------------------------------------------------- |
| `id`                       | `INTEGER`      | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `points_expiration_months` | `INTEGER`      | Obligatorio; default SQL `12`; CHECK `> 0`.         |
| `created_at`               | `TIMESTAMP(3)` | Obligatorio; por defecto hora actual.               |
| `updated_at`               | `TIMESTAMP(3)` | Obligatorio; actualizado por Prisma en cada upsert. |

La bonificación está en
`backend/prisma/migrations/20261007173000_add_first_purchase_bonus_configuration/`.
La migración crea el enum PostgreSQL `FirstPurchaseBonusType` (`PERCENTAGE`,
`FIXED_AMOUNT`) y una tabla singleton con `bonus_type`,
`bonus_value DECIMAL(12,2)`, `created_at` y `updated_at`. La migración inicial
definía el porcentaje como `0.1..100`; la migración de ajuste indicada abajo
lo alinea al rango vigente `1..100`. El rango de puntos fijos es `1..10000`.

La migración
`backend/prisma/migrations/20261008180000_set_percentage_bonus_minimum_to_one/`
alinea a `1..100` el mínimo de porcentaje en las tablas legacy y versionada.
No modifica migraciones anteriores ni cambia valores guardados. Si encuentra
un porcentaje existente menor que `1`, aborta explícitamente: hay que revisar
ese dato antes de aplicar la migración, para no alterar silenciosamente una
configuración o un snapshot histórico.

| Columna       | Tipo                          | Regla                                               |
| ------------- | ----------------------------- | --------------------------------------------------- |
| `id`          | `INTEGER`                     | PK; por defecto `1`; CHECK obliga a que sea `1`.    |
| `bonus_type`  | `FirstPurchaseBonusType` enum | `PERCENTAGE` o `FIXED_AMOUNT`.                      |
| `bonus_value` | `DECIMAL(12,2)`               | Positivo; CHECK condicional según tipo.             |
| `created_at`  | `TIMESTAMP(3)`                | Obligatorio; por defecto hora actual.               |
| `updated_at`  | `TIMESTAMP(3)`                | Obligatorio; actualizado por Prisma en cada upsert. |

El servicio de aplicación recibe el puerto `LoyaltyConfigurationRepository`
por inyección de dependencias. `LoyaltyPrismaRepository` implementa el puerto
con Prisma. Después de aplicar la migración RF-014, cada ruta seccional
actualiza una propiedad mediante versionado y conserva las demás. El
`LoyaltyService` exportado por `LoyaltyModule` expone
`setPointsEquivalence`, `getCurrentPointsEquivalence`,
`setPointsValidity` y `getCurrentPointsValidity` para que un futuro módulo de
compras reutilice los ajustes. También ofrece `setFirstPurchaseBonus` y
`getCurrentFirstPurchaseBonus`; consumidores usan el servicio, no el
repositorio ni las tablas directamente.

