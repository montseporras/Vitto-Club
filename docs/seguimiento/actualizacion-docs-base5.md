# Qué hay que actualizar en la documentación por BASE-5

> **Para qué es este archivo.** BASE-5 (modelo de misiones, notificaciones, promociones, imágenes y
> beneficios de los niveles, los módulos `missions`, `notifications` y `statistics`, y el módulo técnico `images` con Cloudinary) todavía **no
> está hecho**. Esta es la lista de lo que hay que cambiar en `docs/`, documento por documento, **en la misma
> rama de BASE-5 o apenas se mergee**. Es el equivalente de `actualizacion-docs-base4.md`, que quedó sin aplicar
> durante todo el Sprint 4 y se aplicó recién el 09/11: **que no vuelva a pasar**.
>
> **Pedido por:** Deni, el 09/11/2026. Sale del contrato del Sprint 5 v1 (§2, §3.14, §3.15 y §8.4), que ya
> no tiene puntos abiertos. Si el contrato cambia, corregir esta lista.
>
> **No se cambia nada de las fuentes de verdad** (contratos, historias, prototipo).

---

## Resumen

| Documento | Qué falta | Prioridad |
|---|---|---|
| [`database/modelo-de-datos.md`](../database/modelo-de-datos.md) | Tablas, enums, relaciones, restricciones y snapshots de BASE-5 | Alta |
| [`database/migraciones.md`](../database/migraciones.md) | Fila de `sprint5_base5_missions_notifications` y de la migración del arrastre (trigger y `CHECK`) | Alta |
| [`architecture/arquitectura.md`](../architecture/arquitectura.md) | Módulos nuevos, sus dependencias y los procesos automáticos (cinco) | Alta |
| [`testing/estrategia.md`](../testing/estrategia.md) | Orden de limpieza de los e2e y suites nuevas | Alta |
| [`SETUP.md`](../SETUP.md) | Variables y comandos nuevos (misiones, notificaciones, correo, Cloudinary, CORS) y la integración continua | Alta |
| [`conceptos-transversales/roles-y-permisos.md`](../conceptos-transversales/roles-y-permisos.md) | Filas nuevas de la matriz | Alta |
| [`conceptos-transversales/errores-y-codigos.md`](../conceptos-transversales/errores-y-codigos.md) | `code` nuevos y `FORBIDDEN_FIELD` fuera de uso | Alta |
| [`conceptos-transversales/transacciones-y-eventos.md`](../conceptos-transversales/transacciones-y-eventos.md) | Evento `mission.completed` después del commit; bloqueos del reclamo | Media |
| [`domain/programa-de-puntos.md`](../domain/programa-de-puntos.md) | Secciones de misiones, beneficios, clientes frecuentes, `MISSION_REWARD` y `BIRTHDAY_BONUS` | Media |
| [`architecture/estructura-frontend.md`](../architecture/estructura-frontend.md) | Rutas y pantallas nuevas; features que dejan de estar vacías | Media |
| [`seguimiento/estado-actual.md`](./estado-actual.md) | Módulos nuevos en "Qué existe" | Media |
| [`glosario.md`](../glosario.md) | Misión, asignación, reclamo, notificación, promoción, beneficio | Baja |
| [`vision-general.md`](../vision-general.md) y `README.md` | Fila del Sprint 5 | Baja |

---

## 1. `database/modelo-de-datos.md`

### 1.1 "Entidades": agregar una sección "Misiones, notificaciones e imágenes (Sprint 5, BASE-5)"

| Modelo | Tabla | Qué guarda |
|---|---|---|
| `Mission` | `missions` | Misión mensual: nombre, descripción, tipo de objetivo, objetivo, condición (días y franja horaria), recompensa en puntos (`null` = sin recompensa), mes de inicio y de fin, estado y baja lógica |
| `CustomerMission` | `customer_missions` | La misión de un cliente en un mes: **snapshot** del objetivo, la condición y la recompensa, progreso, estado, fechas de completada, reclamada y vencida, quién la reclamó (Cliente o Sistema) y motivo del vencimiento |
| `NotificationTemplate` | `notification_templates` | Un mensaje por tipo: activo, asunto y cuerpo |
| `Notification` | `notifications` | Cada notificación: tipo, canal, destinatario, cliente, asunto, estado, error y fecha. Solo inserción |
| `Promotion` | `promotions` | Promociones: título, descripción, días, horario, vigencia, último envío y baja lógica |
| `NotificationSettings` | `notification_settings` | Fila única: puntos de regalo por cumpleaños y el logo (`public_id` y URL de Cloudinary) |

### 1.2 "Enums"

| Enum | Valores |
|---|---|
| `CustomerMissionStatus` | `IN_PROGRESS`, `COMPLETED`, `CLAIMED`, `EXPIRED`. `COMPLETED` es final si la misión no tiene recompensa |
| `MissionStatus` | `ACTIVE`, `DELETED` |
| `MissionObjectiveType` | `CONSUMPTION_COUNT`, `CONSUMPTION_AMOUNT` |
| `NotificationType` | `POINTS_EXPIRING`, `BIRTHDAY`, `PROMOTION`, `MISSION` |
| `NotificationChannel` | `EMAIL` |
| `NotificationStatus` | `SENT`, `FAILED`, `SKIPPED` |
| `AuditAction` | Suma `BIRTHDAY_BONUS_GRANTED` (módulo `POINTS`, Sistema) y `FREQUENT_CUSTOMERS_UPDATED` (módulo `CONFIGURATION`) |
| `PointsMovementType` | Suma `MISSION_REWARD` y `BIRTHDAY_BONUS` |

### 1.3 "Relaciones"

```
Mission         1 ── 0..N CustomerMission
Customer        1 ── 0..N CustomerMission
CustomerMission 1 ── 0..1 PointsMovement (MISSION_REWARD)
Customer        1 ── 0..N Notification
```

### 1.4 "Restricciones relevantes": nueva sección "Sprint 5"

Copiar de la migración la lista de `CHECK` e índices (nombre único parcial de misiones; `target > 0`;
`reward_points` nulo o 1–100.000; horas juntas y ordenadas; `end_month >= start_month`; `0 <= progress <=
target`; fechas coherentes con el estado; `UNIQUE (mission_id, customer_id, period)`; `UNIQUE (type,
customer_id, dedupe_key)`; `points_movements_mission_check`; `frequent_min_consumptions` entre 1 y 100; `birthday_bonus_points` entre 0 y 10.000) y los triggers de solo
inserción de `notifications`. Y **sacar la nota** "Pendiente del Sprint 3" si el arrastre agregó el trigger y
los `CHECK` de `points_movements`.

### 1.5 "Invariante de los puntos" y "Copias (snapshots)"

- `lifetime_points` **no** suma `MISSION_REWARD` ni `BIRTHDAY_BONUS`.
- `customer_missions` guarda el objetivo, la condición y la recompensa al asignar: editar la misión no los cambia.
- `loyalty_program_configurations` suma los beneficios (`bronze_benefit`, `silver_benefit`, `gold_benefit`).
- `rewards` y `customers` suman `photo_public_id` y `photo_url` (las imágenes viven en Cloudinary, no en la base). `loyalty_program_configurations` suma `frequent_min_consumptions`.

---

## 2. `database/migraciones.md`

| Fecha | Migración | Qué hace |
|---|---|---|
| (fecha) | `sprint5_arrastre_points_movements_checks` (nombre a confirmar) | Trigger de solo inserción y `CHECK` del Sprint 3 (A-02, A-03). Antes, verificar que no haya filas que los violen |
| (fecha) | `sprint5_base5_missions_notifications` | Crea las tablas y enums de la §1, la columna `points_movements.customer_mission_id`, los beneficios, `frequent_min_consumptions`, `photo_public_id` y `photo_url`, los `CHECK` e índices a mano, y carga las plantillas por defecto y la fila de `notification_settings` (100 puntos de cumpleaños) |

---

## 3. `architecture/arquitectura.md`

### 3.1 Tabla de módulos: agregar

| Módulo | Sprint | Qué tiene |
|---|---|---|
| `missions` | 5 | Misiones, asignación, avance, reclamo y proceso de fin de mes (`/misiones`, `/customers/me/misiones`, `/customers/:id/misiones`) |
| `notifications` | 5 | Plantillas, logo, promociones, envío y registro de notificaciones, procesos diarios (`/configuracion/*`, `/promociones`, `/notificaciones`) |
| `statistics` | 5 | Estadísticas y PDF (`/estadisticas/*`), solo lectura |
| `images` | 5 | Módulo técnico (sin dominio): puerto `ImageStorage` con Cloudinary y un adaptador falso; validación por contenido; URL firmadas |

### 3.2 "Dependencias entre módulos": agregar

```text
consumptions ──> missions ──> points
notifications ──> customers, points   (lectura)
rewards, customers, notifications ──> images
statistics ──> (ninguno de negocio: lee por Prisma)
```

- `missions` no importa `consumptions`; `points` no importa `missions`.
- `missions` publica `mission.completed` y `notifications` lo atiende **después del commit**.
- Actualizar `backend/src/architecture.spec.ts` con estas reglas.

### 3.3 "Procesos automáticos": de tres a cinco

Sumar misiones (día 1, 00:10, y al iniciar) y notificaciones (09:00), con sus variables y comandos. Agregar
los puertos `ImageStorage` (Cloudinary) y `EmailSender` (Resend), con sus adaptadores falsos.

---

## 4. `testing/estrategia.md`

### 4.1 Orden de limpieza

```ts
await prisma.notification.deleteMany();      // solo si el trigger lo permite: si no, filtrar por id
await prisma.pointsMovement.deleteMany();    // apunta a lotes, consumos, canjes y misiones de clientes
await prisma.customerMission.deleteMany();
await prisma.mission.deleteMany();
await prisma.promotion.deleteMany();
// ... después, lo del Sprint 4
```

> **Ojo:** si el arrastre agrega el trigger de solo inserción en `points_movements` y BASE-5 lo agrega en
> `notifications`, los e2e **ya no pueden borrar** esas tablas. Hay que pasar a filtrar por id (como
> `audit_logs`) o recrear la base de tests. Decidirlo en la rama del arrastre.

### 4.2 Suites

Agregar `base5-schema`, `missions-*`, `notifications-*`, `statistics-*`, `images-*` y las de NIV-BEN, CTA-CLI y clientes frecuentes. Los e2e usan los adaptadores falsos de `ImageStorage` y `EmailSender`: nunca llaman a Cloudinary ni a Resend.
Sumar a `setup-e2e-env.ts`: `MISSIONS_EXPIRATION_CRON_ENABLED=false`, `NOTIFICATIONS_CRON_ENABLED=false` y
`NOTIFICATIONS_EMAIL_ENABLED=false` e `IMAGES_STORAGE_ENABLED=false`.

---

## 5. `SETUP.md`

- §2.5 "Procesos automáticos": dos filas más (misiones y notificaciones) y sus comandos (`npm run
  missions:expire`, `npm run notifications:send`).
- §2.1 "Variables de entorno": `RESEND_API_KEY`, `NOTIFICATIONS_FROM`, `NOTIFICATIONS_EMAIL_ENABLED` (en
  `false` para desarrollo), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `IMAGES_STORAGE_ENABLED` (en `false` sin cuenta: el adaptador falso devuelve una URL de prueba),
  `MISSIONS_EXPIRATION_CRON_ENABLED`, `NOTIFICATIONS_CRON_ENABLED` y `CORS_ORIGIN` (por defecto
  `http://localhost:5173`). **Nunca** escribir claves reales en el repo.
- "Problemas frecuentes": qué pasa si se prende el correo en local (manda correos de verdad) o Cloudinary (sube
  imágenes a la cuenta real).
- Una sección "Integración continua": el workflow de GitHub Actions corre `npm ci`, lint, tests unitarios y build
  del backend, y lint y build del frontend. Los e2e no corren en CI (contrato S5 §3.12).

---

## 6. `conceptos-transversales/`

- **`roles-y-permisos.md`:** las filas nuevas de la matriz del contrato S5 §4.
- **`errores-y-codigos.md`:** `MISSION_NAME_IN_USE`, `MISSION_NOT_CLAIMABLE`, `INVALID_IMAGE`,
  `NOTIFICATION_DISABLED`, `PROMOTION_FINISHED` y los `404` nuevos. Marcar `FORBIDDEN_FIELD` como fuera de uso.
- **`transacciones-y-eventos.md`:** el avance de misiones dentro de la transacción del consumo; el reclamo
  bloquea la asignación y después `customer_points`; los correos siempre después del commit; el proceso de fin
  de mes con `SKIP LOCKED`.

---

## 7. `domain/programa-de-puntos.md`

Agregar "6. Misiones" (las reglas, los estados y que los puntos de misión no suman al nivel), "7.
Notificaciones" (con los puntos de regalo por cumpleaños, que tampoco suman al nivel) y, en la sección de
niveles, los beneficios (texto informativo) y el umbral de clientes frecuentes.

---

## 8. `architecture/estructura-frontend.md`

- Árbol: `missions`, `notifications` y `statistics` dejan de estar vacías.
- Mapa de pantallas: `/admin/misiones`, `/admin/estadisticas`, la pestaña Misiones del Cliente
  (ruta según el prototipo actualizado), Configuración → Notificaciones y Promociones, y el historial de
  notificaciones. Sacar la página de "Movimientos de puntos": `GET /movimientos-de-puntos` se elimina (S5-13).

---

## 9. `seguimiento/estado-actual.md`, `glosario.md`, `vision-general.md` y `README.md`

- "Qué existe": los módulos nuevos.
- Glosario: Misión mensual, Asignación, Reclamo (manual y automático), Notificación, Promoción, Beneficio del
  nivel.
- Visión general y README: la fila del Sprint 5.
