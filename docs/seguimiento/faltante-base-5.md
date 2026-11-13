# BASE-5: lo que quedó pendiente o sin comprobar

> **Para qué sirve este archivo.** BASE-5 (el modelo de datos y las piezas compartidas del Sprint 5) se hizo
> el 12/11/2026 en la rama `feature/BASE-5-modelo-sprint5-back` (commits `7928e61` y `dac7174`, mergeada en
> `develop`). Esto es **todo lo que quedó sin hacer o sin poder comprobar**, paso a paso, para que alguien que
> no estuvo en la conversación lo pueda tomar sin preguntar.
>
> **Fuentes de verdad** (no se modifican desde acá): `docs/sprint-5/API_CONTRACT_SPRINT_5.md` y
> `docs/sprint-5/HISTORIAS_SPRINT_5.md` (sección BASE-5). Si algo de este archivo choca con ellas, mandan ellas.
>
> **Cómo está armado cada ítem:** qué es · por qué importa · qué hay hoy · qué hay que hacer (pasos) · cómo se
> sabe que está hecho · quién.

## Qué entregó BASE-5 (para ubicarse)
- Una migración, `20261112130000_sprint5_base5_missions_notifications`: tablas `missions`, `customer_missions`,
  `notification_templates`, `notification_settings`, `notifications` y `promotion_sends`; columnas de fotos,
  beneficios y mínimo de cliente frecuente; `CHECK`, índices y el trigger de solo inserción de `notifications`.
- `PointsService.acreditarBonificacion` (puntos de regalo que no suman al nivel).
- Los puertos `ImageStorage` (Cloudinary o falso) y `EmailSender` (Resend o log).
- Los módulos `missions`, `notifications` y `statistics` como **esqueletos** (repositorios sin operaciones) y el
  módulo técnico `images`.
- Verificado con tests y con una base descartable. **No se pudo probar con servicios reales** (ver B-1).

## Resumen

| # | Pendiente | Capa | Bloquea algo | Estado |
|---|---|---|---|---|
| B-1 | Probar Cloudinary y Resend con cuentas reales | Backend | Producción | ⬜ Sin hacer |
| B-2 | Descripción del movimiento `MISSION_REWARD` | Backend | US-31 | ⬜ Lo hace US-31 |
| B-3 | Texto para el Cliente de los movimientos de regalo | Backend y frontend | US-31 y US-48 | ⬜ Decisión abierta |
| B-4 | Documentos de `docs/` que no se actualizaron | Documentos | No | ⬜ Cada historia |
| B-5 | Variables y scripts de los procesos nuevos | Backend | US-32, 15, 47 a 50 | ⬜ Cada historia |
| B-6 | Decisiones que tomé yo y hay que confirmar | Backend | No | ⬜ Confirmar |
| B-7 | Qué completa cada historia en cada módulo | Backend | — | Guía |
| B-8 | `npm audit` | Backend | No | ⬜ Sin revisar |
| B-9 | Configurar producción | Despliegue | Entrega final | ⬜ Sin hacer |
| B-10 | `pdfkit` instalada y sin uso | Backend | US-55 | Informativo |

---

## B-1. Probar Cloudinary y Resend con cuentas reales

### Qué es
Los dos servicios externos están detrás de un puerto y **se probaron solo con clientes de mentira**: ningún test
llama a Cloudinary ni a Resend (es la regla del proyecto). Por eso nadie comprobó que, con una cuenta real,
funcionen las cosas siguientes.

### Por qué importa
Si algo falla con la cuenta real, se va a ver recién en la demo o en la entrega.

### Qué hay hoy
- `backend/src/images/infrastructure/cloudinary-image-storage.ts` y
  `backend/src/notifications/infrastructure/resend-email-sender.ts`, escritos según la documentación de cada SDK.
- **La parte más incierta es la URL firmada de 1 hora** (`signedUrl`): usa `private_download_url` con
  `expires_at` y pide siempre formato `jpg`, **suponiendo** que Cloudinary convierte al formato pedido. Eso no
  está confirmado.

### Qué hay que hacer
**Cloudinary**
1. Crear una cuenta gratis y copiar `CLOUD_NAME`, `API_KEY` y `API_SECRET`.
2. Ponerlos en **tu** `backend/.env` (nunca en `.env.example`, nunca en el código, nunca en un chat):
   `IMAGES_STORAGE_ENABLED=true`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Con un script descartable **fuera del repo**, llamar al adaptador (el módulo `ImagesModule` arma el real con
   esas variables) y comprobar uno por uno:
   - Subir un JPG con `access: 'PUBLIC'` y carpeta `vitto-club/rewards`: la `url` abre en el navegador y el
     archivo aparece en la carpeta correcta de Cloudinary.
   - Subir un PNG con `access: 'AUTHENTICATED'` y carpeta `vitto-club/customers`: `url` es `null`, y abrir la
     dirección "normal" del archivo **da error** (no es público).
   - `signedUrl(publicId)` de esa imagen: **abre la imagen** y **deja de abrir pasada una hora**. Probarlo
     también con una imagen PNG y una WebP: si la conversión a `jpg` falla, corregir `signedUrl` (probar sin
     pedir formato, o guardar el formato original).
   - `delete(publicId, access)`: la imagen desaparece de Cloudinary. Borrar una que no existe no es error.
   - Subir un PDF renombrado a `.jpg` y un archivo de más de 2 MB: se rechazan con `INVALID_IMAGE` **y no
     aparece nada nuevo** en Cloudinary.
4. Volver `IMAGES_STORAGE_ENABLED=false` en tu `.env` al terminar.

**Resend**
1. Crear una cuenta gratis, una clave (`RESEND_API_KEY`) y **un remitente permitido**: sin dominio propio
   verificado, Resend solo deja mandar desde `onboarding@resend.dev` y solo **a tu propio email**.
2. En tu `.env`: `NOTIFICATIONS_EMAIL_ENABLED=true`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM`.
3. Con un script descartable, mandar con `ResendEmailSender` y comprobar: el correo **llega**; mandar a una
   dirección inválida **rechaza** con el mensaje de error de Resend (ese texto es el que va a quedar en
   `notifications.error`).
4. **Cuidado:** con `true` el backend usa Resend de verdad. Usá **solo tu propio email** y un cliente de prueba.
   Nunca lo dejes en `true` apuntando a una base con clientes reales.
5. Volver `NOTIFICATIONS_EMAIL_ENABLED=false` al terminar.

### Cómo se sabe que está hecho
Cada punto de la lista se comprobó a mano, y lo que falló se corrigió con un test unitario que lo cubra. Anotar
acá el resultado y la fecha.

### Quién
Sin asignar. Backend. Hace falta que alguien cree las cuentas.

---

## B-2. La descripción del movimiento `MISSION_REWARD`

### Qué es
Los movimientos de puntos tienen un texto (`description`). El de una recompensa de misión es "Recompensa de
misión: {misión}" (contrato §2.7), y necesita el **nombre de la misión**.

### Qué hay hoy (verificado)
`backend/src/points/domain/points-movement.ts`, función `describeMovement`: para `MISSION_REWARD` **lanza un
error** ("…has no mission (US-31 completes it)"). Hoy no hay ninguna fila de ese tipo, así que nada se rompe. En
cuanto US-31 acredite una, el listado de movimientos de ese cliente **va a fallar** si no se completa esto.

### Qué hay que hacer (lo hace US-31, junto con el reclamo)
1. En `PointsMovementRecord` (el mismo archivo) agregar `mission: { name: string } | null`, como ya está
   `redemption: { rewardName: string } | null`.
2. En `backend/src/points/infrastructure/points-movements.repository.ts`, traer el nombre en el `select`: hoy trae
   `redemption: { select: { rewardName: true } }`; hay que sumar `customerMission: { select: { mission: { select:
   { name: true } } } }` y armar `mission` en el mapeo.
   **Ojo:** `points` **no puede importar** el módulo `missions` (regla del proyecto, `architecture.spec.ts`). Esta
   lectura se hace con Prisma desde el repositorio de `points`, como ya hace con `redemption`.
3. En `describeMovement`, devolver `` `Recompensa de misión: ${record.mission.name}` `` y lanzar error solo si
   `mission` es `null`.
4. Tests: el de `describeMovement` y un e2e que acredite una misión y liste los movimientos.

### Cómo se sabe que está hecho
`GET /customers/:id/movimientos` y `GET /customers/me/movimientos` devuelven el movimiento con el texto
correcto; lint, build, unitarios y e2e completos en verde.

### Quién
La persona de US-31.

---

## B-3. El texto de los movimientos de regalo para el Cliente

### Qué es
El contrato (§2.7) dice que cada movimiento de regalo tiene **dos textos**: uno para el personal y otro para el
Cliente.

| Tipo | Personal | Cliente |
|---|---|---|
| `MISSION_REWARD` | "Recompensa de misión: {misión}" | "Ganaste {n} pts por la misión {misión}" |
| `BIRTHDAY_BONUS` | "Regalo de cumpleaños" | "Te regalamos {n} pts por tu cumpleaños" |

### Qué hay hoy (verificado)
El backend arma **un solo** `description` por movimiento y lo usa igual para los dos roles
(`backend/src/points/http/dto/points-movement-response.dto.ts`, `description: view.description`). Para
`BIRTHDAY_BONUS` devuelve el del personal: "Regalo de cumpleaños".

### Qué hay que hacer
**Primero decidir** quién arma el texto del Cliente:
- **Opción A:** el backend devuelve una `description` distinta cuando el que consulta es el Cliente
  (`customerPage` en el DTO de respuesta).
- **Opción B:** el frontend lo arma a partir del `type`, los `points` y el nombre de la misión.

El contrato no lo define: es una decisión para el equipo (Deni). Hasta que se decida, el Cliente ve el texto
del personal.

### Cómo se sabe que está hecho
El Cliente ve "Te regalamos {n} pts por tu cumpleaños" y "Ganaste {n} pts por la misión {misión}".

### Quién
Las personas de US-31 y US-48 (CA-48.7), después de la decisión.

---

## B-4. Documentos de `docs/` que no se actualizaron

### Qué es
`docs/seguimiento/actualizacion-docs-base5.md` lista lo que hay que actualizar por BASE-5. Se hizo lo que **ya
es verdad en el código**. Lo demás **se deja a propósito** hasta que exista, para no documentar como existente
algo que no existe.

### Qué hay que hacer (cada documento lo completa la historia que lo vuelve verdad)
| Documento | Qué falta | Lo hace |
|---|---|---|
| `docs/conceptos-transversales/roles-y-permisos.md` | Filas nuevas de la matriz del contrato §4 (`/misiones`, `/configuracion/mensajes`, `/promociones/*`, `/notificaciones`, `/estadisticas/*`, fotos, etc.); sacar `GET /movimientos-de-puntos` y los "Próx." de los menús. **US-14 ya agregó** las filas de `/configuracion/mensajes` y `/notificaciones` | Cada historia, al crear su endpoint |
| `docs/conceptos-transversales/errores-y-codigos.md` | `MISSION_NAME_IN_USE`, `MISSION_NOT_CLAIMABLE`, `PROMOTION_SEND_NOT_CANCELLABLE` (**US-14 ya agregó** `NOTIFICATION_DISABLED` y `NOTIFICATION_NOT_RESENDABLE`) y los `404` nuevos. Marcar `FORBIDDEN_FIELD` como fuera de uso | Cada historia, cuando lance el código |
| `docs/conceptos-transversales/transacciones-y-eventos.md` | El avance de misiones dentro de la transacción del consumo; el reclamo bloquea la asignación y después `customer_points`; los correos siempre después del commit; el proceso de fin de mes con `SKIP LOCKED` | US-30, US-31, US-32 |
| `docs/domain/programa-de-puntos.md` | Las secciones "Misiones" y "Notificaciones", los beneficios de los niveles y el mínimo de clientes frecuentes | US-28 a US-33, US-14 a US-50, NIV-BEN |
| `docs/architecture/estructura-frontend.md` | Rutas y pantallas nuevas | Cada historia de frontend |
| `docs/architecture/arquitectura.md` | La sección "Procesos automáticos": de tres a seis, con sus variables y comandos | US-32, US-15, US-47 a US-50 |
| `docs/glosario.md`, `docs/vision-general.md`, `docs/README.md` | Misión mensual, asignación, reclamo, notificación, promoción, beneficio del nivel, cliente frecuente; la fila del Sprint 5 | Al cerrar el sprint |

### Cómo se sabe que está hecho
Cada fila de `actualizacion-docs-base5.md` está aplicada y el documento coincide con el código.

### Quién
Cada historia, en su propia rama.

---

## B-5. Variables y scripts de los procesos automáticos nuevos

### Qué es
El Sprint 5 suma tres procesos automáticos. **Ninguno existe todavía.** Cada uno tiene que seguir el patrón de
los que ya hay (`backend/CLAUDE.md` §5.16).

### Qué hay que hacer (por cada uno, la historia que lo crea)
| Proceso | Historia | Cuándo corre | Variable | Script de `npm run` |
|---|---|---|---|---|
| Misiones (fin de mes) | US-32 | Día 1, 00:10, y al iniciar | `MISSIONS_EXPIRATION_CRON_ENABLED` | `missions:expire` |
| Notificaciones | US-47 y US-48 | Todos los días, 09:00 hora de Argentina (no corre al iniciar) | `NOTIFICATIONS_CRON_ENABLED` | `notifications:send` |
| Promociones programadas | US-15 | Cada minuto | `PROMOTIONS_CRON_ENABLED` | `promotions:send` |

Pasos para cada uno:
1. Copiar el patrón de `backend/src/rewards/infrastructure/rewards-expiration.scheduler.ts` y de
   `backend/src/expire-rewards.ts`.
2. Agregar el script a `backend/package.json`, la variable a `backend/.env.example` (prendida) y
   `process.env.<VARIABLE> = 'false'` a `backend/test/setup-e2e-env.ts`. **Son archivos de configuración
   compartida: pedir permiso** (`CLAUDE.md` raíz §5.6).
3. Documentarlo en `docs/SETUP.md` §2.5.

### Cómo se sabe que está hecho
El proceso corre solo, se puede apagar con su variable y se puede correr a mano con su script; en los e2e queda
apagado.

### Quién
La persona de cada historia.

---

## B-6. Decisiones que tomé yo y hay que confirmar

Estas decisiones **no están en el contrato**: se tomaron para poder avanzar. Si alguien no está de acuerdo,
cambiarlas es chico (están en un solo lugar cada una).

| # | Decisión | Dónde está |
|---|---|---|
| 1 | `IMAGES_STORAGE_ENABLED` y `NOTIFICATIONS_EMAIL_ENABLED` **solo se prenden con `true`**. Sin la variable queda el adaptador falso. **En producción hay que ponerlas en `true`** | `backend/src/images/infrastructure/images.config.ts` y `backend/src/notifications/infrastructure/notifications.config.ts` |
| 2 | "Hasta 2 MB" es 2 × 1024 × 1024 bytes (binario). El contrato no aclara | `backend/src/images/domain/image-validation.ts` (`MAX_IMAGE_BYTES`) |
| 3 | `claimed_by` solo admite `CUSTOMER` o `SYSTEM` (un `CHECK` extra, porque el contrato lista esos dos valores) | migración `20261112130000_sprint5_base5_missions_notifications` |
| 4 | `days_of_week` acepta `NULL` o vacío como "todos los días" | misma migración |
| 5 | `EmailSender.send` recibe `{ to, subject, text, html? }` y devuelve `'SENT'` o `'SKIPPED'` | `backend/src/notifications/domain/port/email-sender.ts` |
| 6 | `customer_missions` **no tiene `created_at`**, porque el contrato no lo lista. Si una historia necesita saber cuándo se asignó, hay que preguntar antes de agregar la columna | `backend/prisma/schema.prisma` |
| 7 | `promotion_sends` con estado `CANCELLED` lleva `cancelled_at`, y esa fecha solo existe en `CANCELLED`. El contrato define las reglas solo para `SCHEDULED` y `SENT` | misma migración |

### Quién
Deni, o quien lleve el contrato, para confirmarlas o corregirlas.

---

## B-7. Qué completa cada historia en cada módulo

BASE-5 dejó los módulos **vacíos a propósito**: los repositorios no tienen operaciones, porque cada historia sabe
mejor qué necesita. Regla: **cada historia agrega los métodos que usa y nada más.**

| Historia | Módulo y repositorio | Qué agrega |
|---|---|---|
| US-14 | `notifications` | ✅ **Hecho (backend)** el 12/11 en la rama `notificacion`: plantillas, puntos de cumpleaños, envío común, reenvío e historial. Ver `notificaciones-pendientes.md` |
| US-15 y US-49 | `notifications` (`PromotionSendRepository`, sigue sin operaciones) | Enviar ahora y programar, cancelar, destinatarios |
| US-47, US-48, US-50 | `notifications` | Los envíos de cada tipo y su proceso |
| US-28 a US-33 | `missions` (`MissionRepository`, `CustomerMissionRepository`) | Misiones, asignación, avance, reclamo y fin de mes |
| US-34 | `images` (desde `rewards`) | Subir, reemplazar y quitar la foto de una recompensa |
| FOTO-PERFIL | `images` (desde `customers`) | La foto de perfil del Cliente |
| US-51 a US-55 | `statistics` (`StatisticsRepository`) | Las métricas y el PDF |

Reglas para todos:
- **No crear tablas ni migraciones nuevas.** Si hace falta una columna o una tabla, **preguntar** (`CLAUDE.md`
  raíz §0 y §2.5).
- Usar **siempre los puertos**: Cloudinary solo con `ImageStorage` y Resend solo con `EmailSender`. Hay un test
  (`architecture.spec.ts`) que falla si alguien importa el SDK directo.
- Los correos se mandan **después del commit**, nunca dentro de una transacción.
- Los tests que limpian la base usan `deletePointsMovements` y `deleteNotifications` (carpeta `backend/test/`),
  porque esas dos tablas no admiten `DELETE`.

---

## B-8. `npm audit`

### Qué es
Al instalar `resend`, `cloudinary` y `pdfkit`, `npm install` avisó que hay vulnerabilidades en las dependencias
(`npm audit`). **No las revisé.**

### Qué hay que hacer
1. En `backend/`, correr `npm audit` y anotar qué paquetes aparecen y si vienen de las tres librerías nuevas o ya
   estaban.
2. **No correr `npm audit fix --force`:** puede subir versiones mayores y romper cosas. Si hay un arreglo sin
   saltos de versión mayor, probarlo con los tests antes de dejarlo.
3. Anotar el resultado acá. La decisión de qué hacer con lo que quede es del equipo (`CIERRE_SPRINT_4.md`, D-19).

### Quién
Sin asignar. Backend.

---

## B-9. Configurar producción

### Qué es
En desarrollo y en los e2e, el correo y las imágenes están apagados. Para que funcionen en el despliegue final
hay que prenderlos.

### Qué hay que hacer (cuando se despliegue; contrato §4)
En el servicio del backend (Render) cargar, **como variables de entorno del servicio y no en el repo**:
`NOTIFICATIONS_EMAIL_ENABLED=true`, `RESEND_API_KEY`, `NOTIFICATIONS_FROM`, `IMAGES_STORAGE_ENABLED=true`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `CORS_ORIGIN` con la dirección del
frontend desplegado. Si prendés una con `true` sin cargar sus credenciales, el backend **no arranca** y el
mensaje dice cuál falta.

### Cómo se sabe que está hecho
El backend arranca en producción y, con una cuenta de prueba, un correo y una foto funcionan de verdad (ver B-1).

### Quién
Quien haga el despliegue.

---

## B-10. `pdfkit` instalada y sin uso

La librería `pdfkit` (y `@types/pdfkit`, de desarrollo) se instaló porque el contrato la autoriza para US-55
(reporte PDF). **Hoy nadie la usa.** No hay que hacer nada hasta US-55.
