# CLAUDE.md — Vitto Club

Plataforma de fidelización de clientes para **La Vitto Comidas y Café** (Seminario Integrador, UTN FRC,
Grupo 11 · 3K2). Es un monorepo con:

- `backend/`: API en NestJS, como monolito modular hexagonal, con Prisma 7 y PostgreSQL.
- `frontend/`: React con Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form con Zod y MSW.
- `docs/`: la documentación del equipo.

**Sprint en curso: 5, el último** (Misiones, Notificaciones, Estadísticas, fotos y lo que quedó de los
sprints anteriores). Las historias del sprint y quién hace cada una están en
[`docs/sprint-5/HISTORIAS_SPRINT_5.md`](docs/sprint-5/HISTORIAS_SPRINT_5.md).

Además de este archivo, hay un `CLAUDE.md` en cada capa con sus reglas:

- [`backend/CLAUDE.md`](backend/CLAUDE.md)
- [`frontend/CLAUDE.md`](frontend/CLAUDE.md)

Cuando trabajes en una capa, leé las dos cosas: este archivo y el de esa capa.

---

## 0. La regla que está por encima de todas: no asumas nada

En este equipo nadie revisa a mano cada línea contra el prototipo o el contrato. Por eso, si inventás
algo, nadie lo va a notar hasta que falle. Entonces:

- **Si algo no está escrito en la fuente de verdad que corresponde (sección 1), no lo decidís vos:
  frenás y preguntás.**
- **No completes huecos con "lo que suele hacerse"**, ni con lo que hace otro proyecto, ni con lo que
  te parece más prolijo.
- **Ante la duda entre dos lecturas del documento, preguntá.** No elijas la que te resulte más cómoda.

Estas son cosas que **nunca decidís solo**:

| Tipo | Ejemplos |
|---|---|
| Datos | Nombre de un campo, tipo, si es obligatorio, si puede ser `null`, largo máximo, formato de fecha |
| Errores | Código HTTP, `code` del error, texto del mensaje |
| Permisos | Qué rol puede hacer qué cosa; qué ve el Cajero y qué ve el Administrador |
| Pantalla | Textos, títulos, botones, orden de los campos, qué se muestra vacío, a dónde navega un botón |
| Reglas | Valores por defecto, redondeos, orden de un listado, plazos (como las 24 h), estados nuevos |
| Estructura | Endpoints nuevos, tablas o columnas nuevas, carpetas nuevas, dependencias nuevas |

**Cómo preguntar.** Mandá una lista numerada. En cada punto poné:

1. dónde buscaste (archivo y sección);
2. qué encontraste, o que no encontraste nada;
3. las opciones que ves, si hay más de una.

No escribas código hasta tener la respuesta.

Si la persona te contesta "decidí vos", proponé una opción. Al final de la tarea, anotala en el resumen
como **"Decisión tomada a pedido de {persona}: …"**, para que alguien la lleve al contrato.

---

## 1. Fuentes de verdad

**Cada capa tiene la suya.** El backend no mira el prototipo para decidir datos. El frontend no inventa
datos que el contrato no tenga.

| Qué necesitás saber | Fuente de verdad | Dónde está |
|---|---|---|
| **Backend:** endpoints, rutas, body, query params, respuestas, tipos, enums, validaciones, códigos HTTP, `code` de error, permisos por rol, reglas de negocio, auditoría, modelo de datos | **Contrato de API del Sprint 5** (v1, sin puntos abiertos) | `docs/sprint-5/API_CONTRACT_SPRINT_5.md` |
| **Las dos capas:** lo que ya existe del Sprint 4 (recompensas y canjes) y lo que quedó pendiente de él | **Contrato de API del Sprint 4** y el cierre del Sprint 4 | `docs/sprint-4/API_CONTRACT_SPRINT_4.md` y `docs/sprint-5/CIERRE_SPRINT_4.md` |
| **Las dos capas:** lo que ya existe del Sprint 3 (consumos, puntos, clientes, auditoría) y las convenciones que los contratos siguientes dan por sabidas ("igual que en el Sprint 3") | **Contrato de API del Sprint 3** y el cierre del Sprint 3 | `docs/sprint-3/API_CONTRACT_SPRINT_3.md` y `docs/sprint-4/CIERRE_SPRINT_3.md` |
| **Backend:** lo que ya existe de los Sprints 1 y 2, y lo que hay que corregir de eso | Archivo de verificación, `docs/funcionalidades/`, `docs/domain/` y `backend/prisma/schema.prisma` | `docs/sprint-3/VERIFICACION_SPRINTS_1_2.md` |
| **Frontend:** cómo se ve cada pantalla, textos, orden de campos, botones, estados vacíos, modales, flujo de navegación | **Prototipo v2** (export de Claude Design). Las pantallas del Sprint 5 se **actualizan antes** con `docs/sprint-5/PROMPT_PROTOTIPO_SPRINT_5.md` (contrato S5 §8.1) | `docs/prototipo/v2/` |
| **Frontend:** qué endpoint llamar, qué campos llegan, qué `code` puede devolver y qué hacer con cada uno | **Contrato de API del Sprint 5** | `docs/sprint-5/API_CONTRACT_SPRINT_5.md` |
| **Las dos capas:** qué hay que hacer en cada historia, criterios de aceptación y quién la hace | Historias del sprint | `docs/sprint-5/HISTORIAS_SPRINT_5.md` |
| **Backend:** qué documentos de `docs/` actualizar cuando se mergea BASE-5 | Lista de BASE-5 | `docs/seguimiento/actualizacion-docs-base5.md` |
| **Las dos capas:** cómo se escribe el código (arquitectura, errores, roles, transacciones, eventos) | Documentación del repo | `docs/architecture/`, `docs/conceptos-transversales/`, `docs/decisions/` |
| **Las dos capas:** nombres de los estados y transiciones (Canje, lote de puntos, Recompensa, Misión) | **Definición del Producto, sección 9** ("Diagramas de Transición de Estados"). Mandan los **cuadros**, no las imágenes, que están desactualizadas (decisión S5-8). Todo enum de estado tiene que coincidir con esos nombres | Documento *Definición del Producto - Vitto Club - Grupo 11* (fuera del repo) |

### 1.1 Qué hacer cuando dos fuentes no coinciden

| Choque | Qué manda |
|---|---|
| Contrato vs. prototipo, en **datos, reglas, permisos o mensajes de error** | **El contrato.** Las secciones 8.1 (diferencias del prototipo que el contrato corrige) y 8.3 (decisiones S5-1 a S5-33; en el Sprint 4, S4-1 a S4-20; en el Sprint 3, las del 17/10/2026) existen para eso |
| Contrato vs. prototipo, en un **texto de pantalla** | Si el contrato cita ese texto, **el contrato**: ya está corregido. Si no lo cita, **el prototipo** |
| Contrato vs. prototipo, en **disposición, estilo o componentes** | **El prototipo.** El contrato no define cómo se ve |
| Contrato del Sprint 5 vs. contrato de un sprint anterior | **El del Sprint 5**, en lo que cambia (§1 "Existentes que cambian" y "Existentes que se eliminan", y §7) |
| Criterio de `HISTORIAS_SPRINT_5.md` vs. contrato | **El contrato.** Avisá del choque en el resumen final |
| Código que ya existe vs. contrato | Hacé lo que pide tu historia según el contrato. Si para eso hay que cambiar código de otra historia o de otro sprint, **frená y preguntá**. No lo "arregles de paso" |
| Algo que no está en ninguna fuente | **Preguntá** (sección 0) |

### 1.2 Lo que NO es fuente de verdad

- **Los datos de ejemplo del prototipo:** clientes, saldos, consumos, misiones, cuentas demo y
  `consumos-store.js`. Son de demostración. Las semillas y los mocks salen del contrato.
- **Los cálculos que hace el prototipo:** puntos, saldo, nivel, avance de misiones, estadísticas, las 24 h del
  Cajero. El prototipo calcula en la pantalla porque no tiene backend. La aplicación real se los pide al backend.
- **El código del prototipo.** No es React (usa `dc-import`, `sc-if`, plantillas `{{ }}`). Se reproduce con
  los componentes del proyecto; no se copia.
- **Las pantallas del Sprint 5 del prototipo sin actualizar:** son de la primera versión (numeración vieja,
  objetivo en texto libre, "En curso", estadísticas fijas). Hasta que se reexporten con
  `PROMPT_PROTOTIPO_SPRINT_5.md`, manda el contrato S5 §8.1.
- **La lógica vieja de canjes de `pagina-principal.html`** (estado "Pendiente", 30 minutos, reintegros). Las
  pantallas de canjes son los componentes `Recompensas`, `GestionCanjes`, `CanjePorCodigo`, `CanjeAccion` y
  `ClienteCanjes` (contrato del Sprint 4, §8.1 #5).
- **El archivo único del prototipo** (`docs/prototipo/Vitto Club Prototipo - archivo unico.html`): guarda
  los componentes comprimidos y no se puede buscar. Se usan los `.html` de `docs/prototipo/v2/`
  (`pagina-principal.html` y sus componentes).
- **La Definición del Producto y el documento de Historias de Usuario**, en lo que el contrato ya cambió (salvo
  los nombres y transiciones de estados, sección 9, que sí mandan). Por ejemplo: "Compra" ahora es
  **Consumo**; la contraseña con mayúscula y carácter especial quedó como decisión a futuro; la reactivación de
  clientes ya no existe; el cumpleaños regala puntos (S5-25) y hay foto de perfil (S5-1).
- **Lo que recuerdes de otras conversaciones o de otros proyectos.**

### 1.3 Si falta un archivo

Si no encontrás el contrato, el archivo de historias o la carpeta del prototipo en la ruta indicada,
**no sigas**. Avisá qué falta. No lo reconstruyas de memoria ni de otro documento.

---

## 2. Se trabaja por historia

1. **Cada pedido tiene que decir tres cosas:**
   - la **historia** (por ejemplo, US-28, o un ítem como BASE-5, FOTO-PERFIL, NIV-BEN, CTA-CLI, CI o
     ARRASTRE-S4);
   - la **capa** (backend o frontend);
   - **quién la pide**.

   Si falta alguna, preguntá antes de leer código.
2. Buscá esa historia en `docs/sprint-5/HISTORIAS_SPRINT_5.md`. Hay que frenar y preguntar en cualquiera
   de estos casos:
   - en la tabla de asignaciones, esa capa tiene **otro responsable**;
   - la sección dice **PENDIENTE**;
   - falta un dato que necesitás (rama, carpeta).
3. **Hacé solo esa historia y solo esa capa.** Si encontrás algo de otra historia que falta o está mal,
   anotalo para el resumen final. No lo programes.
4. **Si tu historia necesita algo de otra que no está hecha:**
   - **Frontend:** simulalo con MSW, tal como lo define el contrato, y seguí.
   - **Backend:** frená y preguntá. No construyas la parte de otra historia.
5. **Piezas compartidas.** El modelo de datos nuevo, los módulos `missions`, `notifications`, `statistics` e
   `images`, `PointsService.acreditarBonificacion`, los puertos `ImageStorage` y `EmailSender`, el avance de
   misiones, el reclamo y el envío de notificaciones los construye **una sola historia**: la que figura como
   dueña en la sección 1 de `HISTORIAS_SPRINT_5.md`. Si te hace falta una de esas piezas y no existe,
   preguntá. No la crees por tu cuenta.

---

## 3. Antes de escribir una sola línea de código

Mandá un **Plan previo** con este formato. Después **esperá a que la persona te diga que sigas**.

```text
PLAN PREVIO — US-XX (backend | frontend) — pedido por {nombre}

1. Lo que leí
   - Contrato: secciones …
   - Historias: US-XX, criterios CA-XX.1 a CA-XX.n
   - Prototipo (solo frontend): archivos y pantallas …
   - Docs del repo: …
   - Código existente que voy a tocar o reutilizar: …
2. Criterios que voy a cumplir: CA-XX.1 …, CA-XX.2 …
3. Archivos que voy a crear o modificar (rutas completas)
4. Tests o verificaciones que voy a hacer
5. Lo que NO voy a hacer (fuera de alcance o de otra historia)
6. Dudas. Si hay alguna, no avanzo hasta tener la respuesta
```

**Tiene que ser verificable.** Si en "Lo que leí" ponés una sección del contrato, citá el dato concreto que
sacaste de ahí. Por ejemplo: "§3.3: reclamar una misión que no está Completada responde
`409 MISSION_NOT_CLAIMABLE`". No alcanza con "leí el contrato".

---

## 4. Cómo se programa

El paso a paso de cada capa está en su `CLAUDE.md`. En resumen:

| Backend (`backend/CLAUDE.md`) | Frontend (`frontend/CLAUDE.md`) |
|---|---|
| 1. Contrato de la historia | 1. Contrato de la historia |
| 2. Schema y migración (solo si la historia es dueña) | 2. Tipos del feature, iguales al contrato |
| 3. Dominio y tests unitarios | 3. Handlers de MSW: éxito, cada error y cada rol |
| 4. Servicio, dentro de la transacción ambiente | 4. API, claves y hooks de TanStack Query |
| 5. DTO con las reglas exactas del contrato | 5. Schemas de Zod con los mensajes del contrato o del prototipo |
| 6. Controller con `@Roles` según la matriz (§4 del contrato) | 6. Componentes y página según el prototipo |
| 7. Filtro de errores con el `code` | 7. Ruta y protección por rol |
| 8. Auditoría en la misma transacción (§3.14) | 8. Recorrido manual con mocks, criterio por criterio |
| 9. Tests e2e: éxito, cada error del contrato y cada rol | 9. Lint y build |
| 10. Lint, tests y build | |

Al final de cada paso, revisá que no te desviaste del contrato. No hace falta mostrar código intermedio.

---

## 5. Reglas que no se negocian

1. **El Sprint 5 es el último.** No queda nada para "otro sprint": **no se usa "Próximamente"** en ninguna
   pantalla (decisión S5-33). Lo que no esté en el contrato ni en un RF no se hace; si te parece que falta, se
   pregunta.
2. **No inventes** endpoints, campos, enums, códigos de error, textos, rutas, roles ni estados. Si no está,
   preguntá.
3. **No modifiques las fuentes de verdad:**
   - `docs/sprint-5/API_CONTRACT_SPRINT_5.md`
   - `docs/sprint-5/HISTORIAS_SPRINT_5.md`
   - `docs/sprint-5/CIERRE_SPRINT_4.md`
   - `docs/sprint-5/PROMPT_PROTOTIPO_SPRINT_5.md`
   - `docs/sprint-4/API_CONTRACT_SPRINT_4.md`
   - `docs/sprint-4/HISTORIAS_SPRINT_4.md`
   - `docs/sprint-4/CIERRE_SPRINT_3.md`
   - `docs/sprint-3/API_CONTRACT_SPRINT_3.md`
   - `docs/sprint-3/VERIFICACION_SPRINTS_1_2.md`
   - `docs/sprint-3/HISTORIAS_SPRINT_3.md`
   - `docs/prototipo/` (lo reexporta el equipo con el prompt del Sprint 5)

   Si te parece que algo está mal, decilo. Lo cambia el equipo.
4. **No toques la otra capa.** Una tarea de backend no modifica `frontend/`, y al revés. El workflow de CI
   (`.github/workflows/`) es solo del ítem CI.
5. **No instales dependencias** sin permiso explícito. Las únicas ya autorizadas son:
   - `@nestjs/schedule` (procesos automáticos; ya está instalada);
   - `resend` (correos, US-14 y US-47 a US-50; S5-18);
   - `pdfkit` (reporte PDF, US-55; S5-18);
   - `cloudinary` (fotos y logo; S5-24).

   Aun así, avisá cuando la agregues. Los gráficos de estadísticas van con CSS, **sin librería** (S5-27).
6. **No cambies configuración compartida** sin preguntar: `tsconfig`, ESLint, Vite, Jest, Docker,
   `.env.example` y `package.json` (salvo las dependencias autorizadas y lo que tu historia pide en el
   contrato, como las variables nuevas de §4).
7. **No toques código que no es de tu historia**, aunque esté mal. Anotalo en el resumen.
8. **No copies código del prototipo** ni de otro proyecto.
9. **No mezcles patrones.** Antes de crear algo, buscá cómo está hecho lo mismo en el repo y seguí igual:
   un módulo de `backend/src/rewards/` o un feature de `frontend/src/features/rewards/`.
10. **Idioma:**
    - Código en inglés: nombres de variables, funciones, archivos y modelos (`Consumption`, `CustomerMission`).
    - En castellano: comentarios, mensajes de error de la API, textos de pantalla y de los correos.
    - Las pantallas usan el voseo del prototipo ("Ingresá", "Buscá").
11. **Vocabulario:** en pantalla se dice **Consumo**, nunca "Compra". En el código, `Consumption`.
12. **Nada de secretos** en el código ni en los tests. No escribas valores reales en `.env`: ni la clave de
    Resend ni las de Cloudinary.
13. **Git lo maneja el equipo.** No hagas `commit`, `push`, `merge` ni ramas salvo que te lo pidan. Si te
    piden un commit:
    - usá Conventional Commits, como dice `docs/CONTRIBUTING.MD` (`feat(backend): …`);
    - no agregues `Co-Authored-By` ni ninguna firma.
14. **Ramas** (no hay Jira): `<tipo>/US-XX-<descripcion-corta>`. Por ejemplo:
    `feature/US-28-crear-mision-back`.

---

## 6. Reglas del dominio que más se olvidan

Si dudás de alguna, el contrato manda. La sección está entre paréntesis: **S5** es el contrato del
Sprint 5; **S4**, el del Sprint 4; sin marca, el del Sprint 3.

**Misiones (Sprint 5)**
- **Mensuales.** Miden **cantidad de consumos** o **monto acumulado**, con días y franja horaria opcionales
  (S5 §2.3, S5-15). Tienen mes de inicio y, opcionalmente, de fin; sin mes de fin se repiten todos los meses.
- **Estados de la misión del cliente:** En progreso, Completada, Reclamada, Vencida (los del **cuadro** de la
  Definición del Producto §9, S5-8). **Completada es final si la misión no tiene recompensa** (S5-4). La misión
  del catálogo: Activa o Eliminada.
- **Asignación:** en el primer consumo o la primera consulta del mes (S5-19). Guarda un **snapshot** del
  objetivo, la condición y la recompensa: editar la misión rige **desde el mes siguiente** (S5-20).
- **Avance:** sale del consumo, **en la misma transacción**; nunca pasa el objetivo; una Completada, Reclamada o
  Vencida no suma más. Anular un consumo resta solo en las del mismo mes que sigan En progreso (S5-21).
- **Fin de mes y baja de la misión:** las En progreso pasan a Vencida; las Completadas con recompensa **se
  reclaman solas** (Sistema). **Nunca se pierde una recompensa ganada** (S5-5, S5-20). El proceso corre el día
  1 a las 00:10, al iniciar el servidor y con `npm run missions:expire`; es idempotente.
- **Reclamo:** solo de una Completada con recompensa, del cliente del token, una sola vez (bloqueo). Si no,
  `409 MISSION_NOT_CLAIMABLE`.

**Puntos de regalo (Sprint 5)**
- **Puntos de misión (`MISSION_REWARD`) y de cumpleaños (`BIRTHDAY_BONUS`) no suman a `lifetimePoints`**: el
  nivel sale solo de los consumos (S5-9). Los dos crean un lote y cancelan primero la deuda.
- **Cumpleaños:** regala puntos configurables en Configuración → Notificaciones (por defecto **100**, 0 = no
  regala), **una vez por año**, aunque el correo falle, y solo si el tipo `BIRTHDAY` está activo (S5-25). Se
  audita como `BIRTHDAY_BONUS_GRANTED`, actor Sistema.

**Notificaciones (Sprint 5)**
- **Canal:** solo correo, con Resend (S5-10). Cuatro tipos: vencimiento de puntos, cumpleaños, promoción y
  misión.
- **Siempre después del commit:** un correo nunca deshace un consumo ni un reclamo.
- **Se registran todas** (enviadas, fallidas u omitidas), **una sola vez por motivo**. Sin reintento y **sin
  auditoría**: quedan en el historial (S5-28).
- **Vencimiento de puntos:** aviso **7 días antes**, una vez por lote (S5-17). El proceso diario corre a las
  09:00.
- **En desarrollo y en los e2e no se mandan correos** (`NOTIFICATIONS_EMAIL_ENABLED=false`).

**Promociones, beneficios y estadísticas (Sprint 5)**
- **Promociones:** **solo informativas**; no cambian los puntos (S5-16).
- **Beneficio de cada nivel:** **texto informativo**; no cambia los puntos (S5-26).
- **Cliente frecuente:** al menos N consumos `REGISTERED` en el período; N se configura en Configuración del
  programa (por defecto **3**) (S5-22). Activo = no dado de baja. Franjas de 4 horas.
- **Estadísticas:** las calcula el backend; la pantalla dibuja tablas y barras con CSS (S5-27).
- **`GET /movimientos-de-puntos` se elimina** (S5-13). No hay aviso de canje rechazado (S5-14).

**Fotos (Sprint 5)**
- **Cloudinary** (S5-12). JPG, PNG o WebP, hasta 2 MB, validadas **por contenido** en el backend; si no,
  `400 INVALID_IMAGE`.
- Recompensas y logo: URL pública. **Foto de perfil del Cliente:** solo con **URL firmada** (1 hora); la ven el
  Cliente, el Cajero y el Administrador (S5-23). Sin foto, la imagen genérica.
- **En los e2e y en desarrollo sin cuenta**, adaptador falso (`IMAGES_STORAGE_ENABLED=false`).

**Cuentas de los clientes (Sprint 5)**
- El Administrador **solo las ve** (`GET /customers/:id/cuenta`), desde el detalle del cliente (S5-3, S5-29).

**Recompensas y canjes (Sprint 4)**
- **Las cinco reglas** (S4 §encabezado, decisión S4-1):
  1. El canje **nace Confirmado** (lo confirma el Cliente en la app o el Cajero en la caja).
  2. Confirmar **no descuenta nada**: ni puntos ni stock.
  3. Dura **15 minutos**.
  4. Puntos y stock se descuentan **al registrar el uso**, y ahí se valida contra la base.
  5. Cancelar, rechazar y vencer **no reintegran nada**.
- **Estados del canje:** Confirmado, Utilizado, Rechazado, Cancelado, Vencido. **No existe "Pendiente"**
  (S4 §2.3). **Recompensa:** Activa, Deshabilitada (solo la pone el Sistema), Inactiva y Dada de baja (el
  botón dice "Eliminar") (S4 §2.1).
- **El saldo al confirmar** lo valida **solo la pantalla**, con el saldo que ya tiene cargado (decisión S4-2).
- **Código del canje:** 6 caracteres sin `0`, `O`, `1` ni `I`, aleatorio y único (S4 §3.6.1).
- **Vence al leer** y con un barrido cada 5 minutos (S4 §3.11).
- **Confirmar desde la app no se audita**; desde la caja, sí (decisión S4-6).
- **El Cliente nunca ve qué empleado** resolvió su canje (S4 §3.6.2).
- **Foto de la recompensa:** entra en el Sprint 5 (US-34). Sin foto, la imagen genérica.
- **Menús (25/10):** "Buscar cliente" y "Canjes por código" solo en Caja; "Movimientos de puntos" fuera de
  Administración (S4 §3.13.3).

**Consumos y puntos**
- **Consumo, no compra.** Código visible `C-000141`, derivado del id (§3.3.3).
- **El saldo y los puntos los calcula el backend.** La pantalla usa `GET /consumos/preview`. Las únicas
  cuentas que hace el frontend son las dos vistas previas que el contrato dice explícitamente:
  - el modal de ajuste (§3.5);
  - el saldo resultante en el modal de anulación (§3.2.2).
- **Puntos** = `floor(monto / base × puntos)`. Se trunca (§3.1.2).
- **Bonificación por primer consumo:** se aplica si el cliente no tiene **ningún** consumo `REGISTERED`.
  Si el primero se anula, el siguiente vuelve a recibirla. La bonificación **suma** a los acumulados
  (decisiones #2 y #3).
- **Anulación:**
  - El Cajero solo anula consumos **propios** y **dentro de las 24 h**.
  - El Administrador anula cualquiera.
  - El Cajero **no tiene la sección Consumos** y recibe `403` en `GET /consumos` (§3.2, §3.3).
  - Anular puede dejar el saldo **negativo** (deuda).
  - Restar puntos con un ajuste **nunca**: responde `409 INSUFFICIENT_BALANCE` (decisión #1).
- **Ajustar puntos** es solo del Administrador y **no cambia el nivel** (§3.5).
- **Nivel:** se calcula con `lifetimePoints` (consumos menos anulaciones). No se guarda por cliente. Los
  umbrales por defecto son 300 y 800. Los canjes, vencimientos, ajustes, misiones y cumpleaños no lo cambian
  (§3.7, S5-9).
- **Vencimiento:** el cron corre a las 00:05, hora de Argentina. El lote vence **entero**. No toca
  `lifetimePoints` (§3.6.3).
- **Movimientos de puntos, auditoría y notificaciones:** son **solo inserción**.

**Auditoría**
- **"Realizado por"** es un **empleado** o **"Sistema"**. Nunca un cliente: cuando el Cliente reclama una
  misión, se audita `MISSION_REWARD_CLAIMED` con actor Sistema y "Reclamada por: Cliente" (S5 §3.14).
- **No se audita:**
  - el inicio y el cierre de sesión;
  - el autorregistro;
  - lo que el cliente cambia en su perfil, su foto o su contraseña;
  - los envíos de notificaciones;
  - las consultas.

**Clientes y cuentas**
- **Email único entre registros activos** (clientes, empleados y cuentas). Los inactivos pueden repetirlo.
- **No hay reactivación de clientes ni de empleados.** Sí hay reactivación de **usuarios** (cuentas de
  empleados) (decisión #8).
- **Alta de cliente en caja o por el Administrador:**
  - Crea también la cuenta, con **contraseña inicial = número de documento**.
  - La cuenta nace con `mustChangePassword = true`.
  - Al ingresar, aparece la ventana "Cambiá tu contraseña", con el botón "Ahora no" (§3.11.3).
- **Contraseña** (regla de este sprint; la política única queda a futuro):
  - entre 8 y 64 caracteres;
  - como máximo 72 bytes;
  - distinta del email;
  - en un cambio, distinta de la actual;
  - si la cuenta es de un cliente, distinta de su documento.
- **El cliente no edita** su nombre, apellido ni documento. Para cambiar el email tiene que confirmar
  su contraseña actual (decisión #10).

**Convenciones técnicas**
- **Errores:** el frontend decide por `code`, **nunca** por el texto del mensaje. `message` puede ser
  `string` o `string[]`.
- **Fechas:**
  - Las respuestas vienen en ISO UTC.
  - La pantalla las muestra en `dd/mm/aaaa hh:mm`, hora de Argentina.
  - Los filtros por día van en `YYYY-MM-DD`, en hora de Argentina; los meses de las misiones, en `YYYY-MM`.
- **Roles:**
  - En el backend, `@Roles(...)`. Un endpoint sin `@Roles` ni `@Public` queda cerrado.
  - En el frontend, el tipo `Role` y las etiquetas `ROLES` de `@/domain/roles`. Nunca "Cajero" escrito a
    mano.
- **CI:** cada PR a `develop` y `main` pasa por GitHub Actions (lint, tests unitarios y build de las dos capas; los e2e no corren en
  CI: siguen en local antes del merge) (S5 §3.12).

---

## 7. Verificar y contar qué quedó

Corré lo que corresponda a tu capa. Los comandos están en su `CLAUDE.md`. Si algo falla y no es por tu
cambio, **no lo arregles**: informalo.

Terminá **siempre** con este resumen:

```text
RESUMEN — US-XX (backend | frontend)

Hecho:
- …

Criterios de aceptación:
- CA-XX.1 ✔ (cómo se verificó: test X / recorrido manual Y)
- CA-XX.2 ✘ (por qué no)

Tests / verificación ejecutada:
- comando → resultado (pasaron N, fallaron M)

Archivos creados / modificados:
- …

No hice (y por qué):
- …

Diferencias encontradas entre contrato, prototipo y código (no las resolví):
- …

Documentos de docs/ que quedaron desactualizados:
- …

Decisiones tomadas a pedido de alguien:
- …

Preguntas abiertas:
- …
```

---

## 8. Cómo pedirle algo a Claude (para el equipo)

Lo más simple es el comando `/historia` (está en `.claude/commands/historia.md`):

```text
/historia US-28 backend Tomás
```

Si preferís escribirlo a mano, copiá esto:

```text
Soy {nombre}. Me toca la US-XX, capa {backend | frontend}.
Seguí CLAUDE.md y {backend | frontend}/CLAUDE.md.
Leé la US-XX en docs/sprint-5/HISTORIAS_SPRINT_5.md y las secciones del contrato que indica.
No asumas nada: si algo no está en el contrato (o en el prototipo, si es frontend), preguntame.
Antes de codear, mandame el Plan previo y esperá mi OK.
```

Para corregir algo de una historia ya hecha, decí cuál, qué criterio no se cumple y qué viste. Las mismas
reglas aplican.
