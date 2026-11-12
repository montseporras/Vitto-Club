# Historias del Sprint 5: qué hay que hacer y cómo se acepta

> **Para qué es este archivo.** No usamos Jira, así que este es el tablero del sprint:
> - **quién hace qué:** sección 0;
> - **en qué orden:** sección 1;
> - **qué falta decidir:** sección 2;
> - **qué tiene que cumplir cada historia para darla por terminada:** sección 3.
>
> **Este archivo dice QUÉ hay que lograr. El CÓMO exacto está en el contrato**
> (`docs/sprint-5/API_CONTRACT_SPRINT_5.md`) y, para las pantallas, en el prototipo (`docs/prototipo/v2/`, ya
> actualizado a mano el 11/11 y el 12/11; ver su `LEEME.md`). Si un criterio de acá choca con el contrato,
> **manda el contrato**. Hay que avisar para corregir este archivo.
>
> **Versión 3 (12/11/2026, tarde).** Alineada con el contrato v3 (S5-51 a S5-58): Estadísticas rediseñadas
> (pestañas con totales, conversión de los clientes nuevos, variación contra el mes anterior, gráficos lado a
> lado), pantallas del Administrador con el formato de Auditoría y paginado que entra en la pantalla. Cambian
> CA-28.1, CA-51.1, CA-51.4, CA-52.4, CA-53.1, CA-53.2, CA-54.5, CA-55.2 y CA-55.3, y el ARRASTRE-S4 suma los
> ajustes a pantallas de sprints anteriores (`AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md`). **S5-52 ya está
> confirmada** (Deni, 12/11: contra los mismos días del mes anterior).
>
> **Revisión del 12/11/2026 (noche).** Control de coherencia con el contrato, a pedido de Deni: CA-33.3 suma las
> Completadas; los criterios de US-34 se renumeran (CA-34.13 a CA-34.16); BASE-5 es dueña de los dos adaptadores
> de `EmailSender`; el arrastre nombra los tres procesos nuevos.
>
> **Versión 2 (12/11/2026).** Alineada con el contrato v2: suma los cambios del prototipo del 11/11 y el 12/11
> (contrato §8.3, S5-34 a S5-50): promociones que no se guardan (se envían ahora o programadas, a todos o a un
> nivel), sin logo configurable, reenvío de correos fallidos, detalle de la misión con quiénes la completaron,
> modal de misión en dos pasos, orden en Misiones y Recompensas, y estadísticas por mes con más gráficos y PDF
> por secciones. **El Sprint 5 es el último: no queda nada "Próximamente".**

## Cómo se usa

**Equipo**

1. **Anotate.** Poné tu nombre en la tabla de la sección 0, en la capa que te toca, y el nombre de tu rama.
2. **Pedile la historia a Claude:** `/historia US-28 backend Tu-Nombre`.
3. **Leé el Plan previo antes de decirle que siga.** Revisá que liste **todos** los CA, cite datos concretos
   del contrato y no tenga dudas sin responder.
4. **Cuando termines, actualizá el estado** en la tabla de la sección 0.
5. **Si un criterio está mal o falta algo:** no lo cambies acá; avisá al grupo; primero se corrige el contrato.

**Claude**

- Hacé solo la historia y la capa del pedido. Cumplí los `[B]` si sos backend, los `[F]` si sos frontend y los
  `[B+F]` en la parte que te toca.
- **Todas las PD están decididas** (sección 2); PD-22 es solo documentación fuera del repo y no bloquea el
  código. Si encontrás algo que no está en el contrato ni en un RF,
  preguntá: no lo dejes como "Próximamente".
- **Las pantallas del Sprint 5 del prototipo ya están actualizadas** (contrato §8.1). Lo que el prototipo simula
  (botones "Simular…", números de ejemplo) no es parte del diseño.

**Etiquetas de los criterios**

| Etiqueta | Quién lo cumple |
|---|---|
| `[B]` | Backend |
| `[F]` | Frontend |
| `[B+F]` | Las dos capas |

**Las reglas de las misiones** (contrato, encabezado; decisiones S5-4 y S5-5):

1. Se asigna y nace **En progreso**. 2. Cada consumo que cumple la condición suma avance. 3. Al llegar al
objetivo pasa a **Completada**; sin recompensa, ahí termina. 4. Con recompensa, el cliente la reclama →
**Reclamada** y recibe los puntos. 5. A fin de mes: En progreso → **Vencida**; Completada con recompensa →
**Reclamada** sola. **Nunca se pierde una recompensa ganada.**

---

## 0. Asignaciones

**Estados:** Sin empezar · En curso · En revisión · Hecha.

| Ítem | Título | Backend: responsable | Backend: rama | Frontend: responsable | Frontend: rama | Carpeta del front | Estado |
|---|---|---|---|---|---|---|---|
| ARRASTRE-S4 | Cierre del Sprint 4 (`CIERRE_SPRINT_4.md`) | | | | | Según el ítem | Sin empezar |
| BASE-5 | Modelo de misiones, notificaciones, envíos de promociones, imágenes y beneficios | | | — (no tiene pantalla) | — | — | Sin empezar |
| US-14 | Configurar mensajes automáticos | | | | | `features/notifications` | Sin empezar |
| US-15 | Configurar promociones especiales | | | | | `features/notifications` | Sin empezar |
| US-28 | Crear misión mensual | | | | | `features/missions` | Sin empezar |
| US-29 | Editar / dar de baja misión | | | | | `features/missions` | Sin empezar |
| US-30 | Progreso y cumplimiento automático de misiones | | | — (sin pantalla propia) | — | `features/cashier` (aviso en "Consumo registrado") | Sin empezar |
| US-31 | Reclamar recompensa de misión | | | | | `features/my-account` | Sin empezar |
| US-32 | Vencer y reiniciar misiones | | | — (sin pantalla) | — | — | Sin empezar |
| US-33 | Consultar misiones | | | | | `features/my-account` (Cliente), `features/customers` (ficha), `features/cashier` (panel) | Sin empezar |
| US-34 | Imagen de la recompensa | | | | | `features/rewards` | Sin empezar |
| US-47 | Notificar vencimiento de puntos | | | — | — | — | Sin empezar |
| US-48 | Notificar cumpleaños | | | — | — | — | Sin empezar |
| US-49 | Notificar promociones | | | | | `features/notifications` | Sin empezar |
| US-50 | Notificar avance de misiones | | | — | — | — | Sin empezar |
| US-51 | Estadísticas de clientes | | | | | `features/statistics` | Sin empezar |
| US-52 | Estadísticas de consumos por período | | | | | `features/statistics` | Sin empezar |
| US-53 | Estadísticas de puntos | | | | | `features/statistics` | Sin empezar |
| US-54 | Estadísticas de niveles, misiones y recompensas | | | | | `features/statistics` | Sin empezar |
| US-55 | Exportar reportes generados | | | | | `features/statistics` | Sin empezar |
| FOTO-PERFIL | Foto de perfil del Cliente (S5-1) | | | | | `features/my-account` | Sin empezar |
| NIV-BEN | Beneficios de los niveles (S5-2) | | | | | `features/points` y `features/my-account` | Sin empezar |
| CTA-CLI | Cuentas de los clientes (S5-3) | | | | | `features/customers` | Sin empezar |
| CI | Integración continua con GitHub Actions (S5-30) | | | — | — | `.github/workflows/` | Sin empezar |

> **Ramas:** `<tipo>/US-XX-<descripcion-corta>`. Por ejemplo: `feature/US-28-crear-mision-back`.

---

## 1. Orden y piezas compartidas

```text
BACKEND
  ARRASTRE-S4 (bloqueo al confirmar canje, CHECK y trigger del S3, CORS, scripts de crons)
     │
     ▼
  BASE-5 ──┬──> US-28 ──> US-29
           │       └──> US-30 ──> US-31
           │               ├──> US-32
           │               └──> US-33
           ├──> US-34, FOTO-PERFIL (imágenes)
           ├──> US-14 ──> US-47, US-48, US-50 (notificaciones, historial y reenvío)
           ├──> US-14 ──> US-15 ──> US-49 (envío de promociones)
           ├──> NIV-BEN
           └──> US-51 a US-54 ──> US-55
  CTA-CLI no depende de BASE-5
  CI primero (sin dependencias), para que todas las ramas del sprint pasen por él

FRONTEND
  El prototipo ya está actualizado (11/11 y 12/11).
  Todo en paralelo con MSW, siguiendo el contrato.
```

**Piezas compartidas.** Cada una tiene un solo dueño. Las demás historias la **usan**.

| Pieza | Dueño | La usan |
|---|---|---|
| Tablas `missions`, `customer_missions`, `notification_templates`, `notification_settings`, `notifications` (con `body`, `promotion_send_id` y `resent_from_id`), `promotion_sends`; columnas `points_movements.customer_mission_id`, beneficios, `frequent_min_consumptions`, `photo_public_id` y `photo_url`; enums (`MISSION_REWARD`, `BIRTHDAY_BONUS` y las dos acciones de auditoría nuevas); `CHECK` e índices | **BASE-5** | Todas |
| Módulos `missions`, `notifications`, `statistics` y el módulo técnico `images` (esqueleto, repositorios y tipos) | **BASE-5** | US-14 a US-55 |
| `PointsService.acreditarBonificacion({ type, … })` (movimientos `MISSION_REWARD` y `BIRTHDAY_BONUS`, sin tocar `lifetimePoints`) | **BASE-5** | US-31, US-32, US-48 |
| Puerto `ImageStorage` (Cloudinary y falso): validar por contenido, subir, borrar, URL firmadas | **BASE-5** | US-34, FOTO-PERFIL |
| Puerto `EmailSender` y sus dos adaptadores: Resend y el que solo deja el envío en el log (contrato §3.8.3) | **BASE-5** | US-14, US-15, US-47 a US-50 |
| Asignación y avance de misiones (`registrarAvance` desde `POST /consumos`) | **US-30** | US-31, US-32, US-33 |
| Reclamo (`reclamar(customerMission, por)`) | **US-31** | US-32 (automático), US-29 (al eliminar) |
| Envío y registro de una notificación (`enviar(tipo, cliente, motivo, asunto, mensaje)`) y su reenvío | **US-14** | US-15, US-47 a US-50 |
| Envío de promociones (ahora y programados) y el proceso de programados | **US-15** | US-49 |
| Tarjeta de misión con barra de progreso (frontend) | **US-33** | US-31 |
| Selector de imagen con vista previa (frontend) | **US-34** | FOTO-PERFIL |
| Selector de mes y año, pestañas con el total de cada sección, y los gráficos de torta y barras con CSS (frontend) | **US-51** | US-52 a US-55 |
| Recuadro de pantalla del Administrador (`vc-pg`: hasta abajo, título y tabla de Auditoría) y paginado que entra en la pantalla (frontend) | **ARRASTRE-S4** (ajustes del 12/11) | US-28 (Misiones), US-34 (Recompensas), US-51 (Estadísticas) |
| Filtro de fechas con calendario de inicio y fin (frontend, ya existe en Consumos) | — | US-14 (historial), Mis canjes |

---

## 2. Pendientes que hay que decidir

**Todas decididas por Deni el 09/11/2026**, con los cambios del 11/11 y el 12/11 (S5-34 a S5-58), incluida
PD-28. El detalle está en el contrato §8.3. Solo queda documentación fuera del repo (PD-22, contrato §10).

| # | Pendiente | Afecta | Decisión |
|---|---|---|---|
| PD-1 | Dónde se guardan las imágenes | BASE-5, US-34, FOTO-PERFIL | **Cloudinary** (S5-12); dependencia `cloudinary` autorizada (S5-24) |
| PD-3 | ¿Se elimina `GET /movimientos-de-puntos`? | ARRASTRE-S4 | **Sí** (S5-13) |
| PD-6 | ¿Aviso de canje rechazado? | — | **No** (S5-14) |
| PD-7 | Qué mide una misión | BASE-5, US-28, US-30 | **Cantidad de consumos o monto**, con días y horario opcionales (S5-15) |
| PD-8 | ¿La promoción cambia los puntos? | BASE-5, US-15, US-49 | **No: solo informativa** (S5-16). Además, **no se guarda**: solo el envío (S5-36) |
| PD-9 | Definiciones de las estadísticas | US-51, US-52 | **Mínimo de frecuente configurable** en Configuración del programa (por defecto 3); franjas de 4 h; activo = no dado de baja (S5-22). **Por mes** (S5-42). Conversión de los nuevos con el mismo mínimo (S5-53) |
| PD-10 | Anticipación del aviso de vencimiento | US-47 | **7 días**, una vez por lote (S5-17) |
| PD-11 | Dependencias `resend` y `pdfkit` | US-47 a US-50, US-55 | **Autorizadas** (S5-18) |
| PD-12 | Foto de perfil: acceso y quién la ve | FOTO-PERFIL | **Cliente, Cajero y Administrador**, con URL firmada (S5-23) |
| PD-13 | ¿Anular un consumo resta avance? | US-30 | **Sí, solo si sigue En progreso** (S5-21) |
| PD-14 | Asignación y repetición de misiones | BASE-5, US-30, US-32, US-33 | **En el primer consumo o consulta del mes; sin mes de fin, se repite** (S5-19) |
| PD-15 | Editar o eliminar una misión con progreso | US-29 | **Rige desde el mes siguiente; al eliminar, Vencida o Reclamada sola** (S5-20) |
| PD-16 | ¿Reintentar correos fallidos? | US-14 | **No automáticamente**; sí a mano, una vez, con "Reenviar" (S5-28, S5-38) |
| PD-17 | ¿Auditar envíos? | US-47 a US-50 | **No** (S5-28) |
| PD-18 | Puntos por cumpleaños | US-48 | **Sí, configurable, por defecto 100** (S5-25) |
| PD-19 | Gráficos | US-51 a US-54 (frontend) | **Barras y tortas con CSS**, paleta de la marca del contrato §3.9.7 (S5-27, S5-54) |
| PD-20 | ¿El beneficio del nivel cambia los puntos? | NIV-BEN | **No: texto informativo** (S5-26) |
| PD-21 | ¿Resetear la contraseña de un cliente? | CTA-CLI | **No: solo verla** (S5-29) |
| PD-22 | Actualizar Plan, Seguimiento y Definición del Producto | Solo documentación | **Decidido qué cambiar** (contrato §10); falta aplicarlo en esos documentos, fuera del repo. No bloquea el código |
| PD-23 | Vitest y GitHub Actions | CI | **Se saca Vitest del Seguimiento; se hace el CI** (S5-30) |
| PD-28 | ¿Con qué se compara el mes en curso en Estadísticas → Puntos? | US-53 | **Contra los mismos días del mes anterior** (S5-52, confirmada por Deni el 12/11) |

---

## 3. Historias

Formato: **ficha**, **criterios de aceptación** (CA), **casos de prueba** del backend y **recorrido** del
frontend.

---

### ARRASTRE-S4 — Cierre del Sprint 4

**No tiene criterios propios.** Todo está en `docs/sprint-5/CIERRE_SPRINT_4.md` §4.A. Lo mínimo antes de
BASE-5:

| Qué | Por qué bloquea |
|---|---|
| Trigger de solo inserción y `CHECK` de `points_movements` (A-02, A-03 del S3) | BASE-5 agrega `MISSION_REWARD` y un `CHECK` a la misma tabla |
| Bloquear la recompensa al confirmar un canje | Es un error de concurrencia del S4 |
| Scripts y variables de los crons, apagados en `setup-e2e-env.ts` | El Sprint 5 suma tres procesos más con el mismo patrón (misiones, notificaciones y promociones programadas; contrato §4) |
| Eliminar `GET /movimientos-de-puntos` (S5-13) | No tiene pantalla y US-53 lo reemplaza |
| CORS por variable de entorno | Lo necesita el despliegue de la entrega |

**Ajustes de pantalla del 11/11 (S5-41, solo frontend)**, que van con el ARRASTRE-S4 porque tocan pantallas de
sprints anteriores: tarjetas de Configuración → Puntos más compactas; sin botón "Volver" en el encabezado del
Administrador (y todos los modales con cruz); en Cliente → Mis canjes, "Día específico" y "Rango" pasan a
"Elegir fechas" con el calendario de Consumos (S5-40). Contrato §3.13.

**Ajustes de pantalla del 12/11 (S5-56 y S5-57, solo frontend):** todas las pantallas del Administrador con el
recuadro, el título, la letra y la tabla de Auditoría, hasta abajo de la pantalla; y en Recompensas, Canjes,
Misiones, Consumos y Auditoría, las filas por página que entran en la pantalla, con "Siguiente" siempre a la
vista. El detalle, con lo que reemplaza de los contratos y las historias del Sprint 3 y el Sprint 4, está en
`docs/sprint-5/AJUSTES_PANTALLAS_SPRINTS_ANTERIORES.md` (criterios CA-AJ.1 a CA-AJ.6).

| Fila de `CIERRE_SPRINT_4.md` | Responsable | Rama | Estado |
|---|---|---|---|
| | | | |

---

### BASE-5 — Modelo de misiones, notificaciones, envíos de promociones, imágenes y beneficios (solo backend)

| | |
|---|---|
| **Qué es** | No es una historia del backlog: es la base que usan todas las del sprint. Una sola migración |
| **Contrato** | §3.15 (modelo), §2 (enums), §3.5.1 (imágenes), §3.8.3 (correo), §8.4 (módulos) |
| **Depende de** | ARRASTRE-S4 (lo mínimo) |
| **Fuera de alcance** | Los endpoints (cada historia tiene los suyos) y los procesos automáticos (US-32, US-47, US-48, US-15) |
| **Dependencias** | Suma `resend`, `pdfkit` y `cloudinary` (autorizadas, S5-18 y S5-24). Avisar en el resumen |

**Criterios de aceptación**

- **CA-B5.1 [B] Migración** `sprint5_base5_missions_notifications` con las tablas, columnas, enums, `CHECK` e
  índices de §3.15. Un test consulta `pg_constraint` y `pg_indexes` y confirma que existen.
- **CA-B5.2 [B] Restricciones.** La base rechaza, como mínimo: `target = 0`; `reward_points = 0`; una sola de
  las dos horas; `end_month < start_month`; dos misiones no dadas de baja con el mismo nombre; `progress >
  target`; un movimiento `MISSION_REWARD` sin `customer_mission_id`; una asignación repetida (misma misión,
  cliente y mes); una notificación repetida (mismo tipo, cliente y motivo); `birthday_bonus_points` fuera de
  0–10.000; `frequent_min_consumptions` fuera de 1–100; una plantilla de tipo `PROMOTION`; un `promotion_sends`
  `SCHEDULED` sin `scheduled_at` o `SENT` sin `sent_at`; un nivel que no es `BRONZE`, `SILVER` ni `GOLD`; una
  notificación `PROMOTION` sin `promotion_send_id` (o de otro tipo con él); dos reenvíos del mismo correo.
- **CA-B5.3 [B] Solo inserción.** `notifications` rechaza `UPDATE`, `DELETE` y `TRUNCATE`.
- **CA-B5.4 [B] Valores por defecto.** Después de migrar hay una fila por tipo **automático** (`POINTS_EXPIRING`,
  `BIRTHDAY`, `MISSION`; no `PROMOTION`) con los textos del contrato §3.6.1, `notification_settings` con 100
  puntos de cumpleaños (sin columnas de logo) y la configuración vigente con mínimo de frecuente 3.
- **CA-B5.5 [B] Acreditar bonificaciones.** `PointsService.acreditarBonificacion` crea un lote con la vigencia
  vigente, cancela primero la deuda, inserta `MISSION_REWARD` (con `customer_mission_id`) o `BIRTHDAY_BONUS` y
  **no toca `lifetimePoints`** (el nivel no cambia).
- **CA-B5.6 [B] Imágenes.** El puerto `ImageStorage` acepta JPG, PNG y WebP por contenido y rechaza un PDF
  renombrado a `.jpg` y uno de 2 MB + 1 byte con `INVALID_IMAGE`, **antes** de subir. Con
  `IMAGES_STORAGE_ENABLED=false` usa el adaptador falso (no llama a Cloudinary). Las fotos de perfil salen con
  URL firmada que vence a la hora.
- **CA-B5.7 [B] Correo.** El puerto `EmailSender` tiene sus dos adaptadores (contrato §3.8.3). Con
  `NOTIFICATIONS_EMAIL_ENABLED=false` se usa el que no llama a ningún proveedor y deja el envío en el log; en
  `true`, el de Resend (con `RESEND_API_KEY` y `NOTIFICATIONS_FROM`). Los tests nunca llaman a Resend.
- **CA-B5.8 [B] Módulos sin ciclos.** `missions` no importa `consumptions`; `points` no importa `missions`;
  `statistics` no importa módulos de negocio. `architecture.spec.ts` lo verifica.

**Casos de prueba:** los de CA-B5.2 a CA-B5.7, más la migración sobre una base con datos del Sprint 4.

---

### US-14 — Configurar mensajes automáticos

| | |
|---|---|
| **Historia** | Como Administrador, quiero configurar los mensajes de las notificaciones automáticas, para personalizar la comunicación del programa |
| **RF** | RF-012 (el logo queda fijo: S5-35, contrato §10 PD-25) |
| **Roles** | Administrador |
| **Contrato** | §3.5.4, §3.6, §3.8.4, §3.8.5, §3.14 (`LOGO_AND_MESSAGES_UPDATED`) |
| **Depende de** | BASE-5 |
| **Fuera de alcance** | Los envíos de cada tipo (US-47 a US-50) y el de promociones (US-15, US-49). **El logo no se configura** (S5-35) |

**Criterios de aceptación**

- **CA-14.1 [B+F] Ver la configuración.** `GET /configuracion/mensajes` trae los puntos de cumpleaños y los
  **tres** mensajes automáticos (vencimiento de puntos, cumpleaños y misiones; **no** promociones).
  Configuración → Notificaciones deja de decir "Próx." y tiene el subtítulo del contrato §3.6.2.
- **CA-14.1b [B+F] Puntos de cumpleaños.** "Puntos de regalo por cumpleaños": entero 0–10.000 (por defecto
  100; 0 = no regala), con el mensaje del contrato §3.6.2. El cambio se audita en la misma entrada.
- **CA-14.2 [B+F] Editar un mensaje.** Asunto 1–120 y mensaje 1–1.000, con las variables permitidas por tipo y
  vista previa. Una variable que no corresponde → `400` con el mensaje del contrato. Un mensaje `PROMOTION`
  en el `PUT` → `400` "Las promociones no tienen mensaje automático.".
- **CA-14.3 [B+F] Activar y desactivar** cada tipo automático. Un tipo desactivado no se envía (lo prueban
  US-47, US-48 y US-50).
- **CA-14.4 [F] Sin logo.** La pestaña Mensajes no tiene sección de logo; la app y la vista previa del correo
  usan el logo fijo de Vitto Club. No hay endpoints de logo (`GET /configuracion/logo` → `404`).
- **CA-14.5 [B] Auditoría.** Una entrada `LOGO_AND_MESSAGES_UPDATED` ("Modificó los mensajes automáticos")
  por guardado, con una fila por cambio; "Se guardó sin modificar valores" si no cambió nada.
- **CA-14.6 [B+F] Historial de notificaciones.** `GET /notificaciones` con sus filtros (`resentFromId` y
  `resent` en cada fila); pestaña "Historial" con el filtro **Fechas** de un solo campo con calendario, como el
  de Consumos (S5-40).
- **CA-14.7 [B] Envío común.** `enviar(tipo, cliente, motivo, asunto, mensaje)` reemplaza las variables,
  registra la notificación (tipo, canal, fecha, destinatario, asunto y mensaje) con `SENT`, `FAILED` o
  `SKIPPED`, y no se repite por el mismo motivo.
- **CA-14.8 [B+F] Reenviar** (S5-38, contrato §3.8.5). Dada una `FAILED`, "Reenviar" → `202`, un registro nuevo
  con `resentFromId` y el toast "Correo reenviado a {email}."; el botón deja de verse y la fila original dice
  "Ya se reenvió.". Una `SENT`/`SKIPPED` o ya reenviada → `409 NOTIFICATION_NOT_RESENDABLE`; tipo desactivado
  → `409 NOTIFICATION_DISABLED`; inexistente → `404`. No se audita.
- **CA-14.9 [B] Permisos.** Cajero y Cliente: `403`.

**Casos de prueba:** guardar con y sin cambios, variable inválida, `PROMOTION` en el `PUT`, historial con
filtros, envío común (enviado, fallido, omitido, repetido), reenvío (cada caso de CA-14.8), permisos.

**Recorrido del frontend:** editar cada mensaje, activar/desactivar, historial con el calendario, reenviar,
errores.

---

### US-15 — Configurar promociones especiales

| | |
|---|---|
| **Historia** | Como Administrador, quiero definir promociones especiales del programa, para aprovechar las propuestas propias de La Vitto |
| **RF** | RF-013 (ajustar: las promociones no se guardan, S5-36; contrato §10 PD-26) |
| **Roles** | Administrador |
| **Contrato** | §3.7 |
| **Depende de** | BASE-5, US-14 (envío común) |
| **Fuera de alcance** | La promoción **no cambia los puntos** (S5-16). **No hay catálogo** de promociones ni tarjeta para el Cliente (S5-36) |

**Criterios de aceptación**

- **CA-15.1 [F] Tarjeta "Promociones"** en Configuración → Notificaciones → Mensajes, con el texto del
  contrato §3.7.5 y "+ Enviar promoción". No hay opción "Promociones" en el menú de Configuración.
- **CA-15.2 [B+F] Escribir desde cero** (S5-37). El modal abre vacío; Asunto 1–120 y Mensaje 1–1.000 con los
  mensajes del contrato §3.7.3; solo `{nombre}`; vista previa con el logo fijo.
- **CA-15.3 [B+F] Destinatarios** (S5-39). "Todos los clientes activos" o un nivel; "Le llega a {n} clientes
  activos." con `GET /promociones/destinatarios`. El nivel es el **actual** del cliente.
- **CA-15.4 [B+F] Cuándo.** "Ahora" → `202 { id, queued }` y el toast del contrato. "Programar" con fecha y
  hora futura → `201 PromotionSend` `SCHEDULED`; fecha que falta o pasada → los mensajes del contrato.
- **CA-15.5 [B+F] Programados.** La lista "Envíos programados" con `GET /promociones/envios`; "Cancelar envío"
  → `CANCELLED`; cancelar uno que ya salió → `409 PROMOTION_SEND_NOT_CANCELLABLE`.
- **CA-15.6 [B] Proceso de programados.** Cada minuto (`PROMOTIONS_CRON_ENABLED`, `npm run promotions:send`):
  manda los `SCHEDULED` vencidos, los pasa a `SENT` y no repite correos si corre dos veces. Un cancelado no
  sale.
- **CA-15.7 [B] Sin auditoría** (S5-28): enviar, programar y cancelar no auditan.
- **CA-15.8 [B] Permisos.** Cajero y Cliente: `403` en `/promociones/*`.
- **CA-15.9 [B] Ya no existen** `GET /customers/me/promociones` ni el ABM de `/promociones` (`404`).

**Casos de prueba:** cada validación, a todos y a un nivel, ahora y programado, el proceso (vencido, futuro,
cancelado, dos corridas), cancelar, permisos.

**Recorrido del frontend:** enviar ahora a todos, programar a un nivel, cancelar, errores.

---

### US-28 — Crear misión mensual

| | |
|---|---|
| **Historia** | Como Administrador, quiero crear una misión mensual con objetivo medible y recompensa opcional, para incorporar gamificación al programa |
| **RF** | RF-031 |
| **Roles** | Administrador |
| **Contrato** | §3.1.1 a §3.1.3, §2.3, §3.14 (`MISSION_CREATED`) |
| **Depende de** | BASE-5 |
| **Fuera de alcance** | Editar y dar de baja (US-29); el avance (US-30) |

**Criterios de aceptación**

- **CA-28.1 [B+F] Listado** de §3.1.2: columnas, objetivo armado en texto, "Sin recompensa", vigencia,
  completadas este mes, estado; filtro, búsqueda y **Orden** (Más recientes por defecto · Más antiguas,
  `order`, S5-45); paginado que entra en la pantalla, con "Siguiente" siempre a la vista (S5-57); vacío. La fila no tiene botones: abre el **detalle** (US-29).
- **CA-28.2 [B+F] Crear con recompensa.** Dado "Vení 3 veces", `CONSUMPTION_COUNT`, objetivo 3, 50 pts, desde
  el mes actual, cuando se guarda: `201`, `ACTIVE`, auditoría `MISSION_CREATED` y toast "Misión guardada.".
- **CA-28.3 [B+F] Sin recompensa.** Con la casilla "Sin recompensa", `rewardPoints: null` y el listado dice "Sin
  recompensa".
- **CA-28.4 [B+F] Condición.** Días (domingo) y horario (09:00 a 13:00) se guardan y se ven en el objetivo
  armado.
- **CA-28.5 [B+F] Validaciones** de §3.1.3, en las dos capas.
- **CA-28.5b [F] Modal en dos pasos** (S5-34): 1) Objetivo, con "Siguiente" que valida nombre, objetivo, días y
  horario; 2) Recompensa y vigencia, con "Atrás" y "Guardar misión". El **?** del tipo de objetivo muestra la
  explicación al pasar el mouse o al enfocarlo (S5-44). "Quitar horario" borra las dos horas (S5-43). Se
  manda un solo `POST` al guardar.
- **CA-28.6 [B+F] Nombre repetido:** `409 MISSION_NAME_IN_USE`; el nombre de una dada de baja se puede usar.
- **CA-28.7 [B] El servidor decide:** `status`, `id` o fechas en el body → `400`.
- **CA-28.8 [B] Permisos.** Cajero y Cliente: `403`.

---

### US-29 — Editar / dar de baja misión

| | |
|---|---|
| **Historia** | Como Administrador, quiero modificar o dar de baja lógicamente una misión, para mantener actualizado el catálogo de misiones |
| **RF** | RF-032 |
| **Roles** | Administrador |
| **Contrato** | §3.1.4 a §3.1.7, §3.14 |
| **Depende de** | US-28, US-30 (para el caso con progreso) y US-31 (reclamo) |

**Criterios de aceptación**

- **CA-29.0 [B+F] Detalle** (S5-34, §3.1.6 y §3.1.7). Un clic en la fila abre el modal con estado, descripción,
  objetivo, recompensa, vigencia y completadas este mes, y "Clientes que la completaron" con
  `GET /misiones/:id/completadas` (Completadas y Reclamadas del mes, con "Falta reclamar", "Sin recompensa" o
  "Por el cliente / el sistema"); vacío del contrato; "Editar misión" abre el modal de dos pasos. Mes inválido
  → `400`; misión dada de baja → `404`.

- **CA-29.1 [B+F] Editar sin progreso:** cambia todo y rige desde ya.
- **CA-29.2 [B+F] Editar con progreso este mes:** el objetivo y la recompensa rigen desde el mes siguiente
  (`appliesFrom`); la pantalla avisa; los clientes del mes conservan su snapshot.
- **CA-29.3 [B] Mes de inicio** solo editable si no empezó.
- **CA-29.4 [B+F] Eliminar** con el aviso del contrato: las En progreso del mes → Vencida ("Misión dada de
  baja"); las Completadas con recompensa → Reclamadas (Sistema) con sus puntos; respuesta `{ expired,
  claimed }`.
- **CA-29.5 [B] Auditoría:** `MISSION_UPDATED` (una fila por campo, "Rige desde") y `MISSION_DELETED`, más un
  `MISSION_REWARD_CLAIMED` por reclamo automático.
- **CA-29.6 [B] Dada de baja:** `404` en `GET`, `PATCH` y eliminar otra vez.
- **CA-29.7 [B] Permisos.**

---

### US-30 — Progreso y cumplimiento automático de misiones (backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero actualizar automáticamente el progreso de cada cliente en las misiones activas a partir de sus consumos y marcarlas como completadas al alcanzar el objetivo |
| **RF** | RF-033, RF-034 |
| **Contrato** | §3.2, §3.14 (`MISSION_COMPLETED`) |
| **Depende de** | BASE-5 |
| **Frontend** | Solo el aviso en "Consumo registrado" (`completedMissions`) |

**Criterios de aceptación**

- **CA-30.1 [B] Asignar.** El primer consumo del mes de un cliente le asigna las misiones en curso En
  progreso, con el snapshot de la misión.
- **CA-30.2 [B] Sumar.** Un consumo que cumple la condición suma 1 o su monto; uno fuera del día o la franja
  (hora de Argentina) no suma.
- **CA-30.3 [B] Completar.** Al llegar al objetivo: Completada, `completedAt`, `MISSION_COMPLETED` (Sistema) y
  la notificación de US-50 **después** del commit. El progreso no pasa del objetivo.
- **CA-30.4 [B] Sin recompensa:** queda Completada (final).
- **CA-30.5 [B] Ya resuelta:** una Completada, Reclamada o Vencida no suma más.
- **CA-30.6 [B] Misma transacción:** si falla el avance, no queda el consumo.
- **CA-30.7 [B+F] Respuesta:** `POST /consumos` trae `completedMissions`; "Consumo registrado" muestra
  "¡{Nombre} completó la misión {misión}!".
- **CA-30.8 [B] Anular** (S5-21): resta avance solo en las del mismo mes que sigan En progreso; una Completada o Reclamada no se revierte.
- **CA-30.9 [B] Cliente dado de baja:** no se le asignan misiones.

---

### US-31 — Reclamar recompensa de misión

| | |
|---|---|
| **Historia** | Como Cliente, quiero reclamar la recompensa asociada a una misión completada, cuando corresponda, para obtener el beneficio ganado |
| **RF** | RF-035 |
| **Roles** | Cliente |
| **Contrato** | §3.3.3, §2.7, §3.14 (`MISSION_REWARD_CLAIMED`) |
| **Depende de** | US-30 |

**Criterios de aceptación**

- **CA-31.1 [B+F] Reclamar.** Dada una Completada con 50 pts, "Reclamar recompensa" → `200`, Reclamada,
  movimiento `MISSION_REWARD` por +50, lote nuevo, saldo actualizado y toast "¡Sumaste 50 pts!".
- **CA-31.2 [B] El nivel no cambia** (`lifetimePoints` igual).
- **CA-31.3 [B+F] No reclamable:** En progreso, Reclamada, Vencida o sin recompensa → `409
  MISSION_NOT_CLAIMABLE` con el mensaje de cada caso; el botón no aparece si `canClaim` es `false`.
- **CA-31.4 [B] Ajena:** `404`.
- **CA-31.5 [B] Dos reclamos a la vez:** uno `200`, el otro `409`; un solo movimiento.
- **CA-31.6 [B] Auditoría** a nombre del Sistema, con "Reclamada por: Cliente".
- **CA-31.7 [B] Permisos:** Administrador y Cajero `403`.

---

### US-32 — Vencer y reiniciar misiones (backend)

| | |
|---|---|
| **Historia** | Como Sistema, quiero vencer automáticamente las misiones no completadas al finalizar el mes y habilitar las del nuevo período, para mantener la dinámica mensual |
| **RF** | RF-036 |
| **Contrato** | §3.4, §3.14 (`MISSIONS_EXPIRED`) |
| **Depende de** | US-30, US-31 |

**Criterios de aceptación**

- **CA-32.1 [B] Cuándo corre:** día 1 a las 00:10 (hora de Argentina), al iniciar y con `npm run
  missions:expire`; `MISSIONS_EXPIRATION_CRON_ENABLED=false` lo apaga.
- **CA-32.2 [B] En progreso → Vencida** con "Fin de mes".
- **CA-32.3 [B] Completada con recompensa → Reclamada** sola: puntos acreditados, `claimedBy = SYSTEM` y
  `MISSION_REWARD_CLAIMED` con "Reclamada por: Automático" (S5-5).
- **CA-32.4 [B] Completada sin recompensa:** queda igual (S5-4).
- **CA-32.5 [B] Una entrada `MISSIONS_EXPIRED`** por corrida con los totales; ninguna si no venció nada.
- **CA-32.6 [B] Idempotente** y una transacción por asignación (`SKIP LOCKED`); un fallo no frena el resto.
- **CA-32.7 [B] Mes nuevo:** el primer consumo o consulta del cliente en el mes nuevo le asigna las misiones
  vigentes desde cero.

---

### US-33 — Consultar misiones

| | |
|---|---|
| **Historia** | Como Cliente, quiero consultar las misiones vigentes y mi progreso en cada una, para saber qué puedo completar y cuánto me falta para lograrlo |
| **RF** | RF-037 (y RF-017: el personal también las consulta) |
| **Roles** | Cliente; Administrador y Cajero (las del cliente) |
| **Contrato** | §3.3.1, §3.3.2, §3.3.4 |
| **Depende de** | US-30 |

**Criterios de aceptación**

- **CA-33.1 [B+F] Mis misiones:** pestaña "Misiones" habilitada; tarjetas con nombre, descripción, barra
  "2 / 3 consumos" o "$ 12.000 / $ 20.000", recompensa, estado y "Termina el {día}"; vacío del contrato.
- **CA-33.2 [B] Asignar al consultar** las en curso que todavía no tenía (S5-19). `GET /customers/:id/misiones` no asigna: muestra las que faltan con progreso 0.
- **CA-33.3 [B+F] Meses anteriores** con `?period=`: las Vencidas, las Reclamadas y las Completadas (las que no
  tenían recompensa) de ese mes (contrato §3.3.2).
- **CA-33.4 [F] Inicio:** tarjeta "Misiones" con cuántas tiene en progreso.
- **CA-33.5 [B+F] Personal:** `GET /customers/:id/misiones` en la ficha (pestaña "Misiones") y en el panel de
  Caja ("Misiones: {n} en progreso"), sin botón de reclamo.
- **CA-33.6 [B] Permisos y casos:** cliente inexistente `404`; dado de baja `[]`; Cliente `403` en
  `/customers/:id/misiones`.

---

### US-34 — Imagen de la recompensa

| | |
|---|---|
| **Historia** | Como Administrador, quiero cargar la imagen de una recompensa, para que los clientes la vean en el catálogo (parte de "Crear recompensa" que el Sprint 4 dejó para el 5, S4-17) |
| **RF** | RF-038 |
| **Roles** | Administrador (carga); todos (ven) |
| **Contrato** | §3.5.1, §3.5.2 |
| **Depende de** | BASE-5 (Cloudinary, S5-12) |

**Criterios de aceptación**

- **CA-34.9 [B+F] Subir y reemplazar** en el modal (vista previa, "Elegir imagen"); se sube a Cloudinary
  (carpeta `vitto-club/rewards`) y `photoUrl` es la URL pública. Al crear, la foto se sube después del `POST`;
  si falla, la recompensa queda sin foto con el aviso del contrato §3.5.2.
- **CA-34.10 [B+F] Quitar:** vuelve la imagen genérica; sin foto, `404` "La recompensa no tiene foto.".
- **CA-34.11 [B+F] Validación:** `400 INVALID_IMAGE` con el mensaje del contrato (por contenido y tamaño,
  **antes** de subir).
- **CA-34.12 [F] Se ve** en el listado, el catálogo del Cliente, el mostrador y los canjes.
- **CA-34.13 [B+F] Orden del listado** (S5-45, contrato §1 "Existentes que cambian"): `GET /recompensas` acepta
  `order` = `RECENT` (por defecto) · `OLDEST`, por fecha de alta; filtro "Orden" (Más recientes · Más antiguas) en
  Administración → Recompensas. Otro valor → `400`.
- **CA-34.14 [B] Auditoría** `REWARD_UPDATED` con "Foto: Actualizada" o "Foto: Quitada".
- **CA-34.15 [B] Dada de baja:** `404` al subir o quitar; su foto no se borra de Cloudinary (la usan los canjes
  viejos).
- **CA-34.16 [B] Permisos:** Cajero y Cliente `403` en `PUT` y `DELETE`. Los e2e usan el adaptador falso.

> Los CA-34.1 a CA-34.8 son los del Sprint 4 (`HISTORIAS_SPRINT_4.md`); se numeran a continuación.

---

### US-47 — Notificar vencimiento de puntos (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir una notificación antes de que mis puntos venzan, para poder utilizarlos a tiempo |
| **RF** | RF-050 |
| **Contrato** | §3.8 |
| **Depende de** | US-14 |

**Criterios de aceptación**

- **CA-47.1 [B] Cuándo:** proceso diario a las 09:00 (hora de Argentina), al iniciar no; `npm run
  notifications:send`; `NOTIFICATIONS_CRON_ENABLED=false` lo apaga.
- **CA-47.2 [B] A quién:** clientes activos con lotes `ACTIVE` y saldo que vencen dentro de 7 días; un correo
  por cliente con `{puntos}` y `{fecha}`.
- **CA-47.3 [B] Una vez por lote** (no se repite al día siguiente).
- **CA-47.4 [B] Registro** con tipo, canal, fecha y destinatario; `SKIPPED` si el tipo está desactivado.
- **CA-47.5 [B] Un fallo** del proveedor queda `FAILED` y no frena al resto.

---

### US-48 — Notificar cumpleaños (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir una notificación automática de cumpleaños si registré mi fecha de nacimiento, para sentirme reconocido por La Vitto |
| **RF** | RF-051 |
| **Contrato** | §3.8 |
| **Depende de** | US-14 y BASE-5 (`BIRTHDAY_BONUS`) |

**Criterios de aceptación**

- **CA-48.1 [B]** El proceso diario manda `BIRTHDAY` a los clientes activos con `dateOfBirth` de hoy (día y
  mes); el 29/02 se toma el 28/02 en años no bisiestos.
- **CA-48.2 [B] Regalo de puntos** (S5-25): si `birthdayBonusPoints > 0` y el tipo está activo, acredita esos
  puntos (`BIRTHDAY_BONUS`, lote nuevo, deuda primero, **sin tocar el nivel**) y audita
  `BIRTHDAY_BONUS_GRANTED` (Sistema), en una transacción por cliente. Con 0, solo el saludo.
- **CA-48.3 [B]** Los puntos se acreditan aunque el correo falle o el envío esté apagado; el correo va después
  del commit, con `{puntos}`.
- **CA-48.4 [B]** Sin fecha de nacimiento, no se manda ni se regala.
- **CA-48.5 [B]** Una vez por año por cliente (puntos y correo), aunque el proceso corra dos veces.
- **CA-48.6 [B]** Registro, `SKIPPED` y `FAILED` como US-47.
- **CA-48.7 [F]** El Cliente ve el movimiento "Te regalamos {n} pts por tu cumpleaños".

---

### US-49 — Notificar promociones

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir notificaciones de promociones, para enterarme de las propuestas especiales de La Vitto |
| **RF** | RF-052 |
| **Roles** | Administrador (envía) |
| **Contrato** | §3.7.3, §3.7.4, §3.8 |
| **Depende de** | US-14, US-15 |

**Criterios de aceptación**

- **CA-49.1 [B]** Cada destinatario recibe **un** correo `PROMOTION` por envío, con `{nombre}` reemplazado, y queda
  en el historial con el `promotion_send_id`.
- **CA-49.2 [B]** Solo clientes activos (todos o los del nivel elegido, con su nivel actual).
- **CA-49.3 [B]** El envío "ahora" sigue en segundo plano: la respuesta no espera a los correos. Los programados
  salen con el proceso de US-15, después del commit.
- **CA-49.4 [B]** `PROMOTION` no tiene interruptor: no hay `409 NOTIFICATION_DISABLED` ni
  `PROMOTION_FINISHED`. Con el envío apagado en el entorno, `SKIPPED`.
- **CA-49.5 [B]** Un correo que falla queda `FAILED` y no frena a los demás; se puede reenviar (US-14).

---

### US-50 — Notificar avance de misiones (backend)

| | |
|---|---|
| **Historia** | Como Cliente, quiero recibir notificaciones sobre el avance o cumplimiento de una misión, para estar al tanto de mi progreso |
| **RF** | RF-053 |
| **Contrato** | §3.8 |
| **Depende de** | US-14, US-30 |

**Criterios de aceptación**

- **CA-50.1 [B]** Al completar una misión se manda `MISSION` con `{mision}`, **después del commit** del
  consumo.
- **CA-50.2 [B]** Un fallo del correo no deshace el consumo.
- **CA-50.3 [B]** Una vez por misión del mes por cliente.
- **CA-50.4 [B]** Registro y `SKIPPED` como US-47.

---

### US-51 — Estadísticas de clientes

| | |
|---|---|
| **Historia** | Como Administrador, quiero generar estadísticas de clientes activos, frecuentes y nuevos, para conocer la evolución de la base de clientes |
| **RF** | RF-054 |
| **Contrato** | §3.9 y §3.9.1 |
| **Depende de** | BASE-5 (`frequent_min_consumptions`) |

**Criterios de aceptación**

- **CA-51.1 [B]** Activos, nuevos y frecuentes **del mes** con datos conocidos (por ejemplo, con mínimo 3:
  clientes con 3, 2 y 4 consumos → 2 frecuentes) y `last6Months` (los 6 meses que terminan en el elegido) con
  `new` y **`newFrequent`**: un cliente nuevo con 3 consumos en su mes de alta cuenta; uno con 2 en ese mes y 1
  en el siguiente, no (S5-53).
- **CA-51.2 [B+F] Mínimo configurable** (S5-22): `GET`/`PUT /loyalty/configuration/frequent-customers` (entero
  1–100, por defecto 3), en una versión nueva de la configuración, auditado con `FREQUENT_CUSTOMERS_UPDATED`;
  tarjeta "Clientes frecuentes" en Configuración → Puntos.
- **CA-51.3 [B]** `month` obligatorio (`YYYY-MM`, hora de Argentina): falta, formato inválido, futuro y anterior
  a enero del año pasado → `400` con los mensajes del contrato §3.9 (S5-42).
- **CA-51.4 [F]** Pantalla "Estadísticas y reportes" habilitada (contrato §3.9.7, S5-51): selectores **Mes** y
  **Año** (por defecto el mes actual; meses futuros deshabilitados); pestañas a lo ancho con su total
  (activos, consumos, "+{acreditados}", misiones asignadas), marcadas al pasar el mouse; pestaña Clientes **sin
  gráficos**: las tres tarjetas (Clientes activos · Base vigente, Clientes nuevos · Adquisición, Frecuentes ·
  Fidelidad, S5-55) y la tarjeta "Conversión de clientes nuevos" con los 6 meses para elegir y "{%} llegaron a
  {n} consumos o más". Todo entra en la pantalla, con la paleta y la letra de los números del contrato.
- **CA-51.5 [B]** Cajero y Cliente: `403`.

### US-52 — Estadísticas de consumos por período

**RF-055 · Contrato §3.9.2.** CA-52.1 [B] totales del mes (sin `groupBy` ni "por período", S5-42) · CA-52.2 [B]
por día de la semana (los 7) y por las cinco franjas horarias del contrato (S5-22), en hora de Argentina ·
CA-52.3 [B] solo `REGISTERED` · CA-52.4 [F] pestaña Consumos: tarjetas Consumos y Monto total, y los dos
gráficos de columnas **lado a lado** (por día y por franja, con cantidad y monto, resaltando el más fuerte,
S5-51) · CA-52.5 [B] permisos.

### US-53 — Estadísticas de puntos

**RF-056 · Contrato §3.9.3.** CA-53.1 [B] consumos, bonificación, recompensas de misión, regalos de cumpleaños,
canjeados, vencidos y anulaciones del mes, con datos conocidos, y los mismos siete del mes anterior en
`previousMonth` (en el mes en curso, los mismos días del anterior: S5-52); **sin ajustes ni
`byMonth`** (S5-42) · CA-53.2 [F] pestaña Puntos (S5-51): cuatro tarjetas con la variación "▲/▼ {x,x} % vs.
{mes}." (o "Sin datos de {mes}."), "De dónde salen los puntos" en barras (Consumos y "Puntos extra" con Misiones,
Bonificación y Cumpleaños; "No suma nivel" en Misiones y Cumpleaños) y "De los {n} acreditados…" con Saldo
neto, Canjeados, Vencidos y Anulados y su % · CA-53.3 [B] permisos · CA-53.4 [B] `GET /movimientos-de-puntos` ya
no existe (`404`, S5-13; lo saca el ARRASTRE-S4).

### US-54 — Estadísticas de niveles, misiones y recompensas

**RF-057 · Contrato §3.9.4.** CA-54.1 [B] distribución por nivel actual · CA-54.2 [B] `levelUps`: clientes que
subieron de nivel en el mes (S5-47) · CA-54.3 [B] misiones del mes por estado (`inProgress`, `completed` sin
reclamar, `claimed`, `expired`) · CA-54.4 [B] las 10 recompensas más canjeadas (canjes `USED`) y
`redemptionsUsed` · CA-54.5 [F] pestaña Programa (S5-51): arriba, lado a lado, la torta de niveles con "Subieron
de nivel en el mes: {%}" y la torta de misiones (**En progreso solo en el mes actual**, sin "a fin de mes se
reclama sola", S5-50) con "Tasa de efectividad: {%}" y "Corte: {fecha}"; abajo, a lo ancho, las recompensas
más canjeadas con su % (S5-48) y "{n} canjes usados" · CA-54.6 [B] permisos.

### US-55 — Exportar reportes generados

| | |
|---|---|
| **Historia** | Como Administrador, quiero exportar los reportes generados en formato PDF, para compartir o archivar la información del programa |
| **RF** | RF-058 |
| **Contrato** | §3.9.5, §3.9.7 (modal) |
| **Depende de** | US-51 a US-54 (`pdfkit`, autorizada) |

**Criterios de aceptación**

- **CA-55.1 [B]** `GET /estadisticas/reporte.pdf?month&sections` responde `application/pdf` con el nombre del
  contrato.
- **CA-55.2 [B]** El PDF trae el logo fijo, el mes, la fecha de generación y **solo las secciones pedidas**, en
  el orden del contrato, con los mismos datos que la pantalla (conversión de los nuevos, variación contra el mes
  anterior, tasa de efectividad). Sin secciones → `400` "Elegí al menos una sección.".
- **CA-55.3 [F]** "Exportar reporte PDF" abre el modal de secciones (S5-49), con las descripciones del contrato
  §3.9.7: todas marcadas al abrir,
  "Deseleccionar todo" / "Seleccionar todo", "Descargar PDF" deshabilitado sin ninguna; descarga con
  `shared/api/download.ts`.
- **CA-55.4 [B]** Mismas validaciones de mes y permisos que US-51.

---

### FOTO-PERFIL — Foto de perfil del Cliente

| | |
|---|---|
| **Qué es** | La foto del Cliente en Mi perfil: una tarea más del Sprint 5 (S5-1). No tiene RF ni US propios: hay que sumarla a RF-065 / US-59 (contrato §10, PD-22) |
| **Roles** | Cliente (carga); Cliente, Cajero y Administrador (ven) (S5-23) |
| **Contrato** | §3.5.1, §3.5.3 |
| **Depende de** | BASE-5 (Cloudinary, S5-12) |

**Criterios de aceptación**

- **CA-FP.1 [B+F] Subir y reemplazar** desde Mi perfil ("Cambiar foto": elegir, vista previa); se sube a
  Cloudinary con entrega **autenticada**.
- **CA-FP.2 [B] URL firmada:** `photoUrl` en `GET /customers/me`, `GET /customers/:id` y `GET
  /customers/by-document` es una URL firmada que vence a la hora, generada en cada respuesta; `null` sin foto.
- **CA-FP.3 [B+F] Quitar:** vuelve el avatar con las iniciales; sin foto, `404` "No tenés foto de perfil.".
- **CA-FP.4 [B+F] Validación** `INVALID_IMAGE`, antes de subir.
- **CA-FP.5 [F] Dónde se ve:** el encabezado y Mi perfil del Cliente, la tarjeta de Caja → Buscar cliente y la
  ficha del Administrador.
- **CA-FP.6 [B] No se audita.**
- **CA-FP.7 [B] Permisos:** solo el Cliente sube y quita la suya (`/customers/me/foto`); Administrador y Cajero
  `403`.

---

### NIV-BEN — Beneficios de los niveles

| | |
|---|---|
| **Qué es** | La parte de RF-029 que US-27 no hizo: los beneficios de Bronce, Plata y Oro (S5-2) |
| **Roles** | Administrador (configura); Cliente (ve) |
| **Contrato** | §3.10 |
| **Depende de** | BASE-5 |

**Criterios de aceptación**

- **CA-NB.1 [B+F] Configurar:** un campo "Beneficio" por nivel en Configuración → Puntos → Niveles (hasta 255,
  opcional); se guarda en una versión nueva de la configuración.
- **CA-NB.2 [B] Auditoría:** `LEVELS_UPDATED` suma "Beneficio {nivel}: {antes} → {después}".
- **CA-NB.3 [B+F] El Cliente lo ve:** `level.benefit` y `level.nextBenefit` en `…/puntos`; en Inicio: "Tu
  beneficio: …" y "Con {nivel siguiente}: …".
- **CA-NB.4 [B]** El beneficio no cambia los puntos de ningún consumo (S5-26).
- **CA-NB.5 [F]** La ficha del cliente muestra el beneficio junto al nivel.

---

### CTA-CLI — Cuentas de los clientes

| | |
|---|---|
| **Qué es** | La parte de RF-08 que US-08 no hizo: el Administrador ve la cuenta de acceso de un cliente (S5-3) |
| **Roles** | Administrador |
| **Contrato** | §3.11 |
| **Depende de** | Nada (no usa BASE-5) |

**Criterios de aceptación**

- **CA-CC.1 [B+F]** `GET /customers/:id/cuenta` con email, rol, estado, `mustChangePassword`, nombre y apellido;
  sección "Cuenta de acceso" en Clientes → Ver más.
- **CA-CC.2 [B+F]** "Contraseña inicial sin cambiar" solo si `mustChangePassword`.
- **CA-CC.3 [B]** Sin cuenta → `404` "El cliente no tiene cuenta."; inexistente → `404` "No existe el cliente.".
- **CA-CC.4 [B]** Cajero y Cliente: `403`. No se audita (consulta).

---

### CI — Integración continua con GitHub Actions

| | |
|---|---|
| **Qué es** | La integración continua que declaran el Seguimiento §2.6 y la Definición del Producto §10.1 y no estaba en el repo (S5-30). Vitest **no** entra: se saca del Seguimiento |
| **Contrato** | §3.12 |
| **Depende de** | Nada. Conviene hacerlo primero, para que todas las ramas del sprint pasen por el CI |
| **Configuración** | Es configuración compartida nueva (`.github/workflows/ci.yml`): la autoriza esta historia. No toca `package.json` ni agrega dependencias |

**Criterios de aceptación**

- **CA-CI.1** `.github/workflows/ci.yml` corre en cada Pull Request a `develop` y `main`.
- **CA-CI.2** Backend: `npm ci`, `npm run lint`, `npm test` y `npm run build`, desde `backend/`, con la versión
  de Node de `backend/.nvmrc`.
- **CA-CI.3** Frontend: `npm ci`, `npm run lint` y `npm run build`, desde `frontend/`.
- **CA-CI.4** Los e2e no corren en el CI (necesitan PostgreSQL); el README lo aclara.
- **CA-CI.5** Un PR con un error de lint o un test roto queda en rojo.
- **CA-CI.6** No usa secretos: ningún paso necesita claves de Resend ni de Cloudinary.
