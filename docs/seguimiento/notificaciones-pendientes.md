# Notificaciones: lo que quedó pendiente y cómo seguir

> **Para qué sirve este archivo.** US-14 (mensajes automáticos) se hizo **solo del lado del backend**, a pedido
> de Montse el 12/11/2026, en la rama `notificacion`. Acá está, paso a paso, todo lo de las notificaciones que
> **no se hizo todavía**, las decisiones que hay que confirmar y la guía para usar el envío común. Está escrito
> para que alguien que no estuvo en la conversación pueda hacerlo sin preguntar.
>
> **Fuentes de verdad** (no se modifican desde acá): `docs/sprint-5/API_CONTRACT_SPRINT_5.md` y
> `docs/sprint-5/HISTORIAS_SPRINT_5.md`. Si algo de este archivo choca con ellas, mandan ellas.
>
> **Cómo está armado cada pendiente:** qué es · por qué importa · qué hay hoy · qué hay que hacer (pasos) ·
> cómo se sabe que está hecho · quién.

## Qué se hizo en el backend de US-14 (para ubicarse)
- `GET` y `PUT /api/configuracion/mensajes`: los tres mensajes automáticos y los puntos de regalo por cumpleaños,
  con auditoría `LOGO_AND_MESSAGES_UPDATED` en la misma transacción.
- `GET /api/notificaciones`: el historial, con filtros y paginado.
- `POST /api/notificaciones/:id/reenviar`: reenvía un correo que falló, en segundo plano.
- `NotificationsService.enviar(...)`: el envío común. **13/11:** ya lo usan US-15, 47, 48 y 49 (promociones y proceso
  diario); falta US-50.
- **13/11, misma rama:** promociones (`/promociones/*`, proceso de cada minuto) y el proceso diario de las 09:00 (aviso de
  puntos por vencer, uno por lote, y regalo de cumpleaños con auditoría `BIRTHDAY_BONUS_GRANTED`).
- Todo es solo del Administrador (Cajero y Cliente reciben `403`).
- Verificado con tests unitarios y e2e contra la base real. Los e2e nunca llaman a Resend.

## Resumen

| # | Pendiente | Capa | Bloquea algo | Estado |
|---|---|---|---|---|
| N-1 | El logo en el correo | Backend | No | Sin decidir |
| N-2 | La pantalla de US-14 (Configuración → Notificaciones) | Frontend | No | Sin empezar |
| N-3 | Decisiones de US-14 que hay que confirmar | Equipo | No | Por confirmar |
| N-4 | Limitaciones conocidas | Backend | No | Informativo |
| N-5 | Cómo usar `enviar` | Backend | US-15, 47, 48, 49, 50 | Guía |

---

## N-1. El logo en el correo

### Qué es
El contrato (§3.8.3) dice que cada correo "lleva el logo fijo de Vitto Club, el asunto y el mensaje con las
variables reemplazadas, y el pie fijo". Y §3.5.4 dice que el backend "lleva el logo en sus recursos" (el logo
**no se configura**, S5-35).

### Qué hay hoy
- El correo sale en **texto plano**: el mensaje, una línea en blanco y el pie fijo "Recibís este correo porque
  sos parte de Vitto Club.". **No lleva logo.**
- El pie se agrega en `backend/src/notifications/domain/notification-email.ts` (`withFooter`), y lo usa
  `NotificationsService.deliver` (`backend/src/notifications/application/notifications.service.ts`). **Tanto
  `enviar` como el reenvío pasan por `deliver`**: es el único lugar para tocar.
- El puerto `EmailSender` ya acepta un campo `html` opcional
  (`backend/src/notifications/domain/port/email-sender.ts`) y el adaptador de Resend ya lo manda si viene
  (`backend/src/notifications/infrastructure/resend-email-sender.ts`). **Hoy nadie lo completa.**

### Por qué no se hizo
1. **El backend no tiene ninguna carpeta de recursos.** El único logo del repo está en el frontend:
   `frontend/src/assets/logo-vitto-iso-white.png`. Es el isotipo en **blanco**: sobre el fondo blanco de un
   correo **no se ve**. Hace falta una versión para fondo claro, o un recuadro de color detrás.
2. **Hay que decidir cómo llega la imagen al correo.** Los clientes de correo (Gmail, Outlook) no muestran
   cualquier imagen. Ver las opciones.

### Opciones (hay que elegir una)
| Opción | Cómo funciona | A favor | En contra |
|---|---|---|---|
| **A. Imagen adjunta dentro del correo** (inline, con `contentId`) | El logo viaja como adjunto del propio correo y el HTML lo referencia con `cid:logo` | Es lo que dice el contrato ("el backend lo lleva en sus recursos"). No depende de ningún servidor externo | Hay que agregar `attachments` al puerto y al adaptador de Resend, y copiar el archivo en el backend |
| **B. URL pública** | El HTML apunta a una dirección `https://…/logo.png` | Es lo más simple de armar | Depende de que esa dirección siga existiendo. Gmail suele pedir "mostrar imágenes" |
| **C. Imagen embebida en el HTML (`data:`)** | El logo va codificado dentro del HTML | Ninguna dependencia | **No se recomienda:** Gmail la bloquea |

**Recomendación:** la opción **A**, porque es la del contrato.

### Qué hay que hacer (con la opción A)
1. Conseguir el logo **para fondo claro** (o decidir que va sobre un recuadro de color, por ejemplo el marrón
   `#5a2a14` de la marca). Pedirlo a quien tenga el diseño. Formato PNG.
2. Guardarlo en el backend, por ejemplo `backend/assets/logo-vitto.png`. **Esto es una carpeta nueva:
   preguntar antes** (`CLAUDE.md` raíz §0).
3. Hacer que `nest build` copie esa carpeta a `dist/`: en `backend/nest-cli.json`, sumar
   `"assets": ["../assets/**/*"]` dentro de `compilerOptions`. **Es configuración compartida: pedir
   permiso** (`CLAUDE.md` raíz §5.6).
4. Agregar `attachments?: { filename; content; contentId }[]` al tipo `EmailMessage` (`email-sender.ts`) y
   pasarlos en `ResendEmailSender.send()` y en el tipo `ResendClient`.
5. Armar el HTML del correo en **una función pura** nueva, en `notification-email.ts` junto a `withFooter`: que
   reciba el mensaje y devuelva `{ text, html }`, con el logo (`<img src="cid:logo">`), el mensaje y el pie fijo.
   Que el texto y el HTML nunca digan cosas distintas.
6. En `NotificationsService.deliver`, mandar `text` y `html` (y el logo adjunto) en lugar de solo `text`.
7. Tests: unitario de la función (el HTML contiene el logo, el mensaje y el pie; el texto contiene el mensaje y el
   pie) y del adaptador (manda los `attachments`). Actualizar los tests de `notifications.service.spec.ts` que
   comparan el texto enviado.
8. Probar con una cuenta real de Resend (ver `docs/seguimiento/faltante-base-5.md`, ítem B-1).

### Cómo se sabe que está hecho
- Un correo de prueba real llega con el logo visible en Gmail y en Outlook.
- Los tests nuevos pasan y `npm run lint`, `npm test`, `npm run build` y `npm run test:e2e` siguen en verde.
- El correo en texto plano sigue teniendo el pie.

### Quién
Sin asignar. Es de backend.

---

## N-2. La pantalla de US-14 (frontend)

### Qué es
US-14 tiene criterios `[B+F]`: la parte `[F]` es la pantalla **Configuración → Notificaciones**. El backend
ya está (ver arriba). Falta la pantalla.

### Qué hay hoy
- Los endpoints existen en el backend y están probados:
  - `GET /api/configuracion/mensajes` y `PUT /api/configuracion/mensajes`
  - `GET /api/notificaciones` y `POST /api/notificaciones/:id/reenviar`
- El frontend **no se tocó**. La carpeta es `frontend/src/features/notifications`.
- Las reglas del frontend están en `frontend/CLAUDE.md`: se trabaja con MSW siguiendo el contrato, y la
  pantalla se reproduce desde el prototipo (`docs/prototipo/v2/`, ver su `LEEME.md`), sin copiar su código.

### Qué hay que hacer (por criterio de aceptación de `HISTORIAS_SPRINT_5.md`)
| Criterio | Qué hay que construir |
|---|---|
| **CA-14.1** | Configuración → Notificaciones deja de decir "Próx.". Subtítulo: "Mensajes que el sistema envía automáticamente a los clientes, envío de promociones e historial de envíos." (contrato §3.6.2). Dos pestañas: **Mensajes** e **Historial** |
| **CA-14.1b** | En la pestaña Mensajes, arriba: "Puntos de regalo por cumpleaños", campo **Puntos**. Entero de 0 a 10.000 (por defecto 100; 0 = no regala). Error: "Ingresá puntos enteros de 0 a 10.000." |
| **CA-14.2** | "Mensajes automáticos": una fila por tipo (**Vencimiento de puntos, Cumpleaños y Misiones**; Promociones **no** está) con "Editar mensaje". El modal tiene Asunto, Mensaje, "Podés usar: …" y una **vista previa** con datos de ejemplo. Botones Descartar · "Guardar cambios". Errores del contrato: "El asunto es obligatorio.", "El asunto no puede superar los 120 caracteres.", "El mensaje es obligatorio.", "El mensaje no puede superar los 1.000 caracteres." y "La variable {variable} no se puede usar en este mensaje." (la variable va **con llaves**: "La variable {fecha} no se puede usar en este mensaje.") |
| **CA-14.3** | Un interruptor "Activa" / "Desactivada" por cada tipo |
| **CA-14.4** | **Sin sección de logo.** La app y la vista previa del correo usan el logo fijo de Vitto Club |
| **CA-14.6** | Pestaña **Historial**: filtros Tipo, Estado, documento del cliente y **Fechas** (un solo campo con calendario, como el de Consumos). Columnas: Fecha y hora · Tipo (con el asunto debajo) · Cliente · Destinatario · Estado (con el error debajo si falló; "Reenvío de un correo que falló." o "Ya se reenvió." según corresponda) · botón **Reenviar** solo en las que fallaron y todavía no se reenviaron. Vacío: "No hay notificaciones para los filtros seleccionados." (contrato §3.8.4) |
| **CA-14.8** | **Reenviar** → toast "Correo reenviado a {email}."; el botón desaparece y la fila dice "Ya se reenvió." Los `409` del contrato (`NOTIFICATION_NOT_RESENDABLE`, `NOTIFICATION_DISABLED`) se resuelven **por `code`, nunca por el texto** |

### Los datos que devuelve el backend (para los tipos y los mocks)
- `GET /api/configuracion/mensajes` → `{ birthdayBonusPoints, messages: [{ type, active, subject, body }] }`,
  siempre en el orden `POINTS_EXPIRING`, `BIRTHDAY`, `MISSION`.
- `PUT /api/configuracion/mensajes` → mismo cuerpo de entrada y de salida. **Tienen que ir siempre los tres
  mensajes**, aunque solo se haya cambiado uno.
- `GET /api/notificaciones` → `{ items, total, page, limit }`, con `limit` de 20 por defecto (de 1 a 100). Filtros:
  `type`, `status`, `documentType` (solo se aplica con `documentNumber`; DNI por defecto), `documentNumber`
  (parcial, se normaliza solo), `fromDate` y `toDate` (`YYYY-MM-DD`, hora de Argentina). Cada fila: `{ id,
  createdAt, type, channel, recipient, customer: { id, firstName, lastName, documentType, documentNumber },
  subject, status, error, resentFromId, resent }`.
- `POST /api/notificaciones/:id/reenviar` → `202 { id, queued: 1 }`.

### Cómo llegan los errores (para el manejo de errores del frontend)
- **Errores de un mensaje** (asunto, texto, variable que no corresponde, falta uno de los tres): `400` con
  `message` como **texto** (el del contrato) y `details: [{ field, message }]`. El `field` dice cuál:
  `messages.1.subject`, `messages.2.body`, etc. (el número es la posición en la lista que se mandó).
- **Puntos de cumpleaños inválidos:** `400` con `message` como **lista** de textos (`["Ingresá puntos enteros de 0 a
  10.000."]`). El contrato dice que `message` puede ser texto o lista.
- **Reenviar:** el `409` trae `code`. No hay `code` en el `404`.

### Algo para tener en cuenta con "Reenviar"
El backend responde `202` **enseguida**, con el número que va a tener el registro nuevo, y manda el correo en
segundo plano. **La fila nueva aparece en el historial recién cuando termina el envío** (normalmente en menos de un
par de segundos). Después del toast, **volver a pedir el historial**; si la fila nueva todavía no está, aparece en
la próxima consulta. **Hasta que la fila nueva existe, el original sigue figurando como "no reenviado"** (`resent:
false`) y mostraría el botón Reenviar; si alguien vuelve a hacer clic en ese momento, el backend responde `409
NOTIFICATION_NOT_RESENDABLE` "Este correo ya se reenvió.", y eso hay que mostrarlo como un aviso normal.

### Cómo se sabe que está hecho
- Recorrido manual con mocks, criterio por criterio, registrado en el resumen (como pide `frontend/CLAUDE.md`).
- `npm run lint` y `npm run build` del frontend en verde.
- Todos los textos coinciden con los del contrato o, si el contrato no los cita, con el prototipo.

### Quién
Sin asignar. Es de frontend. No depende de nada más: el backend ya está.

---

## N-3. Decisiones de US-14 que hay que confirmar

El contrato no las define; se tomaron para poder avanzar. Si alguien no está de acuerdo, cambiarlas es chico
(cada una está en un solo lugar).

| # | Decisión | Dónde está |
|---|---|---|
| 1 | **Un reenvío que también falló no se puede volver a reenviar.** El contrato dice "(y no se puede volver a reenviar)" pero no da el texto del error. Se responde `409 NOTIFICATION_NOT_RESENDABLE` con "Este correo ya se reenvió." | `NotificationsService.reenviar` |
| 2 | **Un asunto o mensaje con solo espacios cuenta como vacío** ("El asunto es obligatorio."). Y **no se recorta** el texto al guardar: si el Administrador deja espacios al principio o al final, se guardan | `parseMessageInput` en `domain/notification-messages.ts` |
| 3 | **`{nombre}` es solo el nombre de pila** del cliente ("Hola Carolina"), no nombre y apellido. Aprobado por Montse | `NotificationsService.enviar` |
| 4 | **Si una variable alarga el texto más que la columna** (asunto de 120, mensaje de 1.000), el correo sale **completo** pero lo registrado en el historial se **recorta** a ese largo, para que el registro no falle después de haber mandado el correo | `fitColumn` en `domain/notification-email.ts` |
| 5 | **`enviar` lee el mensaje guardado** en la base en lugar de recibir el asunto y el mensaje (el contrato lo define con `asunto` y `mensaje`). Quien lo llama solo pone el motivo y los valores de las variables. Para las promociones sí se pasan el asunto y el mensaje. Aprobado por Montse | `NotificationsService.enviar` |
| 6 | **Si falta el valor de una variable del texto, `enviar` lanza un error** en vez de mandar el correo con la llave sin reemplazar. Aprobado por Montse | `replaceVariables` |
| 7 | **Los errores de un mensaje del `PUT` salen en `details`** con el campo (`messages.1.subject`) y no como lista de textos, porque el `ValidationPipe` de Nest le antepone la ruta al texto de los errores anidados y el contrato pide el texto exacto | `parseMessageInput` |

### Quién
Deni, o quien lleve el contrato, para confirmarlas o corregirlas.

---

## N-4. Limitaciones conocidas (informativo, no hay que hacer nada)

1. **Dos envíos a la vez por el mismo motivo** pueden mandar el correo dos veces, aunque solo queda **una** fila
   en el historial. `enviar` revisa si ya se mandó, manda, y registra; el índice único de la base evita la fila
   repetida, pero no el segundo correo. No hay forma de reservar el motivo antes de mandar sin una fila "pendiente",
   y la tabla es solo inserción (no se puede actualizar). En la práctica no pasa: los procesos corren una vez por
   día y cada cliente tiene su propio motivo.
2. **El candado del doble clic en "Reenviar" está en memoria.** Sirve con una sola instancia del backend (que es
   lo que usa el proyecto en Render). Con más de una instancia, el índice único de la base igual impide dos
   reenvíos registrados, pero podrían salir dos correos.
3. **Si el servidor se reinicia justo mientras se reenvía**, el correo puede haber salido pero no se registra la
   fila nueva: el original sigue figurando como "no reenviado" y el Administrador puede volver a hacer clic.
4. **Si Resend responde después de un tiempo muy largo**, el reenvío sigue en segundo plano; no hay límite de
   tiempo propio.
5. **Una promoción "ahora" que se interrumpe** (el servidor se reinicia mientras se manda) queda como `SENT` en
   `promotion_sends` pero los correos que faltaban **no salen solos**: no hay reintento automático (S5-28). Los que
   ya salieron figuran en el historial y los que fallaron se pueden reenviar a mano.
6. **Si el servidor está apagado a las 09:00**, ese día no corre el proceso diario (no corre al iniciar, a propósito).
   Se recupera con `npm run notifications:send`: es idempotente, no repite lo ya hecho. Un aviso de puntos por vencer
   que se perdió ese día igual sale al siguiente (la ventana es de 7 días); el regalo de cumpleaños del día perdido
   **no se hace solo** al día siguiente.
7. **Plan gratuito de Resend:** 100 correos por día (día UTC) y 3.000 por mes. Una promoción a más clientes que eso
   deja los correos que pasan el tope como `FAILED` (se pueden reenviar a mano al día siguiente). Para producción,
   un plan pago. El envío real separa los correos con una pausa de 150 ms (límite de Resend: 10 por segundo).

---

## N-5. Cómo usar `enviar` (para US-15, US-47, US-48, US-49 y US-50)

`enviar` está en `NotificationsService` (`backend/src/notifications/application/notifications.service.ts`) y el
módulo `notifications` lo exporta.

### Qué hace
Arma el correo, lo manda y **siempre lo registra** en el historial: `SENT` (el proveedor lo aceptó), `FAILED` (el
proveedor falló; queda el motivo) o `SKIPPED` (el tipo está desactivado, o el envío de correos está apagado en el
entorno). Un fallo del proveedor **no lanza**. Devuelve el registro, o **`null` si ya se había mandado por ese
motivo** (no se repite).

### Cómo llamarlo

Un mensaje **automático** (el texto sale de lo que el Administrador guardó):
```ts
await this.notificationsService.enviar({
  type: 'POINTS_EXPIRING',        // 'POINTS_EXPIRING' | 'BIRTHDAY' | 'MISSION'
  customerId: 42,
  reason: `lot:${lotId}`,          // el motivo: no se repite el mismo tipo al mismo cliente por el mismo motivo
  variables: { puntos: '120', fecha: '20/11/2026' },  // todas menos {nombre}, que la pone enviar
});
```

Una **promoción** (no tiene mensaje guardado ni interruptor):
```ts
await this.notificationsService.enviar({
  type: 'PROMOTION',
  customerId: 42,
  reason: `promotion-send:${send.id}`,
  promotionSendId: send.id,
  subject: send.subject,           // con {nombre} sin reemplazar
  body: send.body,
});
```

### Qué pasar en cada caso
| Historia | `type` | `reason` | `variables` |
|---|---|---|---|
| US-47, vencimiento de puntos ✅ | `POINTS_EXPIRING` | `lot:{id}` | `puntos` y `fecha` |
| US-48, cumpleaños ✅ | `BIRTHDAY` | `birthday:{año}` | `puntos` (o, con 0 puntos, `textOverride` y sin variables) |
| US-50, avance de misiones | `MISSION` | `mission:{id de customer_missions}` | `mision` |
| US-15 y US-49, promociones | `PROMOTION` | `promotion-send:{id}` | no lleva: se pasa `subject` y `body`, y solo se puede usar `{nombre}` |

### `textOverride` (solo lo usa US-48)
Un campo opcional `textOverride: { subject, body }` de los mensajes automáticos: manda ese texto **en vez de** la plantilla,
pero **sigue respetando el interruptor** del tipo (si está desactivado, queda `SKIPPED`). Lo usa el cumpleaños con 0 puntos
(saludo fijo "¡Feliz cumpleaños, {nombre}!", sin hablar de puntos). No lo uses para otra cosa sin preguntar.

### Reglas que hay que respetar
1. **Llamarlo siempre DESPUÉS del commit** de la operación de negocio. Un correo nunca va dentro de una
   transacción ni puede deshacer un consumo, un reclamo o un regalo de cumpleaños (contrato §3.8.3).
2. **Los valores de `variables` son texto.** Usar el mismo formato que la pantalla: puntos con punto de miles
   (`1.250`) y fechas `dd/mm/aaaa` en hora de Argentina.
3. **Pasar todas las variables que usa el mensaje.** Si el texto tiene `{fecha}` y no la pasás, `enviar` **lanza un
   error** (adrede: así no sale un correo con la llave). Como el Administrador puede editar el texto, pasar siempre
   todas las variables del tipo, aunque el mensaje por defecto no las use todas.
4. **No lo llames para clientes dados de baja.** `enviar` no filtra por estado del cliente: el filtro de "solo
   clientes activos" lo hace quien lo llama (US-47, US-48 y US-49).
5. **Atrapar los errores de programación en quien lo llama** (cliente que no existe, plantilla que falta, variable sin
   valor): en un listener o en un proceso, con `try/catch` y un log, para que un error no frene al resto de los
   clientes. Un fallo del correo no es uno de esos: queda registrado como `FAILED` y no lanza.
6. **No se audita** (S5-28): los envíos quedan solo en el historial de notificaciones.

### Cómo probarlo
- En los e2e, reemplazar el proveedor por uno de mentira, como hace
  `backend/test/notifications-send.e2e-spec.ts`: `Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(EmailSender).useValue(fakeSender)`. Los e2e **nunca** llaman a Resend.
- Sin reemplazarlo, en los e2e `NOTIFICATIONS_EMAIL_ENABLED` es `false` y todo se registra como `SKIPPED`.
- Para vaciar `notifications` entre tests: `deleteNotifications(prisma)` (carpeta `backend/test/`); la tabla no admite
  `DELETE`.
