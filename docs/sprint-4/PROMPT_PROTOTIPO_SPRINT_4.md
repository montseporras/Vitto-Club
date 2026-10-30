# Prompt — Prototipo Sprint 4: Recompensas y Canjes (Vitto Club)

> Copiá todo lo que está debajo de la línea y pegalo junto con el archivo HTML del prototipo.

---

## Contexto

Vas a modificar el **archivo HTML único del prototipo de Vitto Club** que te adjunto (plataforma de
fidelización de La Vitto Comidas y Café). **No crees un archivo nuevo ni uses Claude Design:** agregá las
pantallas nuevas a este mismo archivo, con el mismo estilo, componentes, colores, tipografía, menús y
forma de navegar que ya tiene.

**Reglas generales**

- No rompas ni cambies nada de lo que ya funciona (Clientes, Consumos, Puntos, Niveles, Auditoría, Mi perfil, etc.).
- Los textos de pantalla van en castellano rioplatense, igual que el resto del prototipo ("Ingresá", "Tenés").
- La vista del **Cliente** es para celular; las del **Cajero** y el **Administrador** son de escritorio.
- Números con puntos de miles (`1.200 pts`), fechas `dd/mm/aaaa` y horas `hh:mm`, en hora de Argentina.
- Donde hoy dice "Próximamente" o "Próx." para Recompensas o Canjes, reemplazalo por la pantalla real.
- El prototipo hoy hace nacer el canje en estado "Pendiente": **ese estado no existe**. Corregilo según la sección 1.
- Cada pantalla nueva lleva su nota/tooltip con la historia de usuario, como el resto del prototipo.

**Historias que cubre:**

| US | Título | RF |
|---|---|---|
| US-34 | Crear recompensa | RF-038 |
| US-35 | Editar recompensa | RF-039 |
| US-36 | Activar / desactivar recompensa | RF-040 |
| US-37 | Deshabilitar / habilitar recompensa automáticamente (sin stock o vencida) | RF-041 |
| US-38 | Eliminar recompensa (baja lógica) | RF-042 |
| US-39 | Consultar catálogo de recompensas | RF-043 |
| US-40 | Confirmar canje (Cliente desde la app, o Cajero en su nombre) | RF-044 |
| US-41 | Gestionar canje por código (sección propia, sin buscar al cliente) | RF-045 |
| US-42 | Registrar uso del canje desde el buscador de clientes | RF-046 |
| US-43 | Rechazar (Cajero/Admin) o cancelar (Cliente) un canje | RF-047 |
| US-44 | Vencer canje automáticamente | RF-048 |
| US-45 | Consultar canjes | RF-049 |

---

## 1. Reglas de negocio que el prototipo tiene que respetar

### Recompensa

| Estado (UI) | Cuándo | Se ve en el catálogo del Cliente |
|---|---|---|
| **Activa** | Al crearla, o al activarla si está disponible | Sí, con botón Canjear |
| **Deshabilitada** | La pone el **Sistema** cuando el stock llega a 0 ("Agotada") o pasa la fecha de vencimiento ("Vencida"). Vuelve sola a Activa cuando el Administrador repone stock o extiende la fecha | Sí, con la etiqueta "Agotada" o "Vencida" y el botón deshabilitado |
| **Inactiva** | La pone el Administrador con "Desactivar" | No |
| **Dada de baja** | La pone el Administrador con el botón **"Eliminar"** (baja lógica, estado final) | No. Solo aparece en canjes viejos |

- **Stock y fecha de vencimiento son opcionales.** Vacío = sin límite ("Sin límite" / "No vence").
- Editar **no puede dejar el stock por debajo de los canjes Confirmados vigentes** de esa recompensa.
- Cambiar los puntos **no afecta** a los canjes ya confirmados (guardan los puntos del momento).
- **Desactivar o Eliminar** una recompensa con canjes Confirmados los **rechaza automáticamente** (Sistema). Se avisa antes de confirmar.
- **Activar** una recompensa sin stock o vencida la deja **Deshabilitada** y se avisa.

### Canje

| Estado (UI) | Qué significa | Final |
|---|---|---|
| **Confirmado** | Nace así. **No se descontó nada todavía.** Tiene código y vence a los **15 minutos** | No |
| **Utilizado** | El Cajero o el Administrador lo aplicó: recién ahí se descuentan los puntos y el stock | Sí |
| **Cancelado** | Lo canceló el Cliente | Sí |
| **Rechazado** | Lo rechazó el Cajero, el Administrador o el Sistema (recompensa desactivada o eliminada, cliente dado de baja). Lleva motivo | Sí |
| **Vencido** | Pasaron 15 minutos sin usarse | Sí |

- **Cancelar, rechazar y vencer no reintegran nada**, porque no se había descontado nada. No muestres ningún texto de "reintegro".
- **Al confirmar,** la pantalla solo valida con el saldo que ya tiene cargado: si el saldo es menor que los puntos de la recompensa, o si es negativo, el botón Canjear queda deshabilitado. **La validación real se hace al aplicar** el canje.
- **Código del canje:** 6 caracteres alfanuméricos en mayúsculas, sin 0, O, 1 ni I (ejemplo: `K7MP2X`). Es único: con solo el código se sabe **a qué cliente y a qué recompensa** pertenece. Se escribe a mano (no hay QR).
- Un cliente puede tener varios canjes confirmados a la vez.

---

## 2. Datos de ejemplo

**Recompensas**

| Nombre | Descripción | Puntos | Stock | Vencimiento | Estado |
|---|---|---|---|---|---|
| Café + medialuna | Café chico con una medialuna de manteca. | 150 | 20 | 30/11/2026 | Activa |
| Merienda gratis | Infusión a elección con dos porciones de torta. | 400 | Sin límite | No vence | Activa |
| Pizza libre viernes | Una entrada a la pizza libre del viernes. | 900 | 0 | 31/12/2026 | Deshabilitada (Agotada) |
| Torta del día | Porción de la torta del día. | 250 | 8 | 20/10/2026 | Deshabilitada (Vencida) |
| Licuado de estación | Licuado de frutas de estación. | 200 | 15 | No vence | Inactiva |
| Brunch para dos | (vieja) | 1.000 | — | — | Dada de baja (solo en canjes viejos) |

**Clientes**

| Cliente | Documento | Saldo | Nivel |
|---|---|---|---|
| Carolina Fernández | DNI 38456123 | 320 pts | Plata |
| Martín Gómez | DNI 41987654 | −50 pts | Bronce |
| Sofía Ríos | DNI 30111222 | 1.200 pts | Oro |

**Canjes** (fechas relativas a "hoy", 25/10/2026)

| Código | Cliente | Recompensa | Puntos | Estado | Detalle |
|---|---|---|---|---|---|
| K7MP2X | Carolina Fernández | Café + medialuna | 150 | Confirmado | Confirmado hace 4 min (vence en 11 min) |
| R4TQ8W | Sofía Ríos | Merienda gratis | 400 | Confirmado | Confirmado hace 14 min (vence en menos de 1 min) |
| H2ZD9C | Sofía Ríos | Café + medialuna | 150 | Utilizado | 24/10/2026 18:40, aplicado por Ana Pereyra |
| M8BN3V | Carolina Fernández | Torta del día | 250 | Vencido | 18/10/2026 |
| P6XK4R | Sofía Ríos | Pizza libre viernes | 900 | Rechazado | 22/10/2026, motivo "Sin insumo" |
| W3JF7L | Carolina Fernández | Merienda gratis | 400 | Cancelado | 20/10/2026 |

Empleados: Valeria Vitto (Administradora) y Ana Pereyra (Cajera).

---

## 3. Pantallas del Administrador

### 3.1 Menú

- **Recompensas** deja de estar deshabilitada ("Próx.").
- Se agrega **Canjes** (gestión de todos los canjes).
- El Administrador mantiene **Buscar cliente** y agrega **Canjes por código** (los mismos del Cajero, secciones 5.1 y 5.2).

### 3.2 Catálogo de recompensas (US-34 a US-38)

- **Título:** "Catálogo de recompensas". Botón **"+ Crear recompensa"**.
- **Filtro por estado:** Todas (menos Dadas de baja) · Activas · Deshabilitadas · Inactivas. Buscador por nombre.
- **Columnas:** Foto (miniatura o imagen genérica) · Nombre · Puntos · Stock ("Sin límite" si no tiene) · Vencimiento ("No vence") · Canjes confirmados (cantidad vigente) · Estado (badge; si está Deshabilitada, con el motivo: "Deshabilitada · Agotada") · Acciones.
- **Acciones por fila:** Editar · Desactivar (si está Activa o Deshabilitada) o Activar (si está Inactiva) · Eliminar.
- **Orden:** última modificación primero. Paginado de a 10. Vacío: "No hay recompensas para los filtros seleccionados."

### 3.3 Modal Crear / Editar recompensa (US-34, US-35)

Título "Crear recompensa" o "Editar recompensa". Dos secciones:

**Recompensa**

| Campo | Regla | Error |
|---|---|---|
| Foto ("Foto que verán los clientes") | Opcional. JPG, PNG o WebP, hasta 2 MB. Vista previa y "Quitar foto" | "Usá una imagen JPG, PNG o WebP de hasta 2 MB." |
| Nombre | Obligatorio, 1 a 80 caracteres, único entre las no dadas de baja | "Completá este campo." / "Ya existe una recompensa con ese nombre." |
| Descripción | Opcional, hasta 255 caracteres, con contador | "Máximo 255 caracteres." |
| Puntos | Obligatorio, entero de 1 a 1.000.000 | "Ingresá un número entero mayor a 0." / "El máximo es 1.000.000 puntos." |

**Disponibilidad**

| Campo | Regla | Error |
|---|---|---|
| Stock | Opcional, entero de 1 a 100.000. Check "Sin límite de stock" | "El máximo es 100.000." |
| Vencimiento | Opcional, hoy o posterior. Check "No vence" | "La fecha no puede ser anterior a hoy." |

- **Al editar** con canjes confirmados vigentes, debajo del stock: "Hay {n} canjes confirmados. El stock no puede ser menor a {n}." Si lo baja de más: "El stock no puede ser menor a los {n} canjes confirmados."
- Al editar los puntos: "Los canjes ya confirmados mantienen los puntos con los que se pidieron."
- Si al guardar una recompensa Deshabilitada queda con stock y sin vencer, aviso: "La recompensa volvió a estar disponible."
- Si al guardar queda con stock 0 o vencida: "La recompensa quedó deshabilitada porque no tiene stock o está vencida."
- Botones: Cancelar · Guardar. Mensaje: "Recompensa guardada."

### 3.4 Diálogos (US-36, US-38)

- **Desactivar:** "¿Desactivar **{nombre}**? Los clientes no la van a ver en el catálogo." Si tiene canjes confirmados, se agrega en rojo: "Hay {n} canjes confirmados de esta recompensa. Se van a rechazar automáticamente." Botones: Cancelar · Desactivar. Mensaje: "Recompensa desactivada."
- **Activar:** si está disponible: "Recompensa activada." Si no tiene stock o está vencida: "Se activó, pero quedó deshabilitada porque no tiene stock o está vencida. Reponé el stock o extendé la fecha."
- **Eliminar:** "¿Eliminar **{nombre}**? Va a dejar de aparecer en el catálogo y no se puede deshacer." Con canjes confirmados, el mismo aviso en rojo. Botones: Cancelar · Eliminar. Mensaje: "Recompensa eliminada."

### 3.5 Canjes (gestión, US-45)

- **Título:** "Canjes".
- **Filtros** (se aplican con el botón **Filtrar**, como en Consumos):
  - Cliente (DNI o nombre).
  - Código.
  - Recompensa (lista).
  - Estado: Todos · Confirmado · Utilizado · Cancelado · Rechazado · Vencido.
  - Fecha: Cualquiera · Hoy · Últimos 7 días · Este mes · Día específico · Rango personalizado (calendario con "Limpiar" y "Listo").
  - Orden: Más recientes · Más antiguos.
- **Columnas:** Código · Fecha y hora · Cliente (nombre + documento) · Recompensa · Puntos · Estado (badge) · "Vence en {n} min" si está Confirmado, o fecha y quién lo resolvió si es final · Acciones (Aplicar / Rechazar solo si está Confirmado).
- **Detalle desplegable:** quién lo confirmó (el cliente desde la app, o el empleado desde la caja), motivo del rechazo, puntos descontados y saldo antes → después si está Utilizado.
- Paginado de a 10 ("Mostrando 1–10 de N"). Vacío: "No hay canjes para los filtros seleccionados."

### 3.6 Auditoría (ajuste)

- En el filtro Módulo, **"Recompensas" deja de decir "(Próximamente)"**.
- Agregar filas de ejemplo de: Creó recompensa, Editó recompensa ("Stock: 0 → 20"), Desactivó recompensa, Eliminó recompensa, Deshabilitó recompensa (Sistema, "Motivo: Sin stock"), Habilitó recompensa (Sistema), Registró uso de canje (Cliente afectado, código, recompensa, puntos descontados, saldo resultante), Rechazó canje (con motivo) y Venció canje (Sistema).

---

## 4. Pantallas del Cliente (celular)

### 4.1 Navegación

- La pestaña **Canjes** de la barra inferior deja de decir "Próx.". Adentro tiene dos vistas: **Catálogo** y **Mis canjes**.
- En **Inicio**, la tarjeta "Recompensas · El catálogo y los canjes van a estar disponibles próximamente." pasa a ser "Recompensas · Mirá lo que podés canjear con tus {saldo} pts" con el botón "Ver catálogo".

### 4.2 Catálogo (US-39)

- Arriba: "Tenés **{saldo} pts** para canjear".
- **Filtros (botones):** Todas · Más canjeadas · Próx. a vencer.
  - Todas: por puntos, de menor a mayor.
  - Más canjeadas: según la cantidad de canjes **Utilizados**.
  - Próx. a vencer: las que vencen en 7 días o menos.
- **Tarjeta:** foto (o imagen genérica), nombre, descripción (2 líneas máximo), "{n} pts", etiqueta ("Vence en {n} d", destacada si faltan 5 días o menos; "Agotada"; "Vencida") y botón **Canjear**.
- **Botón Canjear deshabilitado** si:
  - la recompensa está Deshabilitada;
  - el saldo es menor a los puntos → texto debajo: "Te faltan {n} pts";
  - el saldo es negativo → tooltip "Tenés un ajuste pendiente. Comunicate con el restaurante".
- Las Inactivas y Dadas de baja no aparecen. Vacío: "No hay recompensas disponibles por ahora."

### 4.3 Modal Confirmar canje (US-40)

- Foto, nombre, descripción y "{n} pts".
- "Saldo: {saldo} pts → {saldo − n} pts al usarlo".
- Texto: "Vas a canjear {n} puntos por esta recompensa. Los puntos se descuentan cuando lo uses en el local. Tenés 15 minutos para presentar el código en caja."
- Botones: Cancelar · Confirmar.

### 4.4 Canje confirmado

- "¡Canje confirmado!", el **código grande** (`K7MP2X`), nombre de la recompensa y puntos.
- **Cuenta regresiva:** "Vence en 14:59". En el último minuto: "Vence en menos de 1 min".
- Texto: "Presentá este código en caja."
- Botones: "Ver mis canjes" · "Volver al catálogo".

### 4.5 Mis canjes (US-45, US-43)

- **Filtros:**
  - Estado: Todos · Confirmados · Finalizados (Utilizado, Cancelado, Rechazado, Vencido).
  - Fecha: Cualquiera · Hoy · Últimos 7 días · Este mes · Día específico · Rango.
  - Orden: Más recientes · Más antiguos.
- **Cada ítem:** recompensa, fecha, "{n} pts", badge de estado y "Ver detalle ▾".
  - **Confirmado:** código destacado, "Vence en {n} min", "Presentá este código en caja." y el botón **Cancelar canje**.
  - **Utilizado:** "Usado el {fecha} a las {hora}" y "Se descontaron {n} pts".
  - **Rechazado:** "Motivo: {motivo}".
  - **Cancelado / Vencido:** fecha. Nunca se muestra qué empleado lo resolvió.
- **Cuando la cuenta regresiva llega a 0**, el ítem pasa a "Vencido" y se actualiza la lista.
- **Diálogo Cancelar:** "¿Cancelar el canje de **{recompensa}**? Lo vas a poder volver a pedir si tenés puntos." Botones: Volver · Cancelar canje. Mensaje: "Canje cancelado."
- Vacío: "Todavía no tenés canjes."

---

## 5. Pantallas del Cajero (y del Administrador en el mostrador)

### 5.1 Buscar cliente → panel del cliente (US-40, US-42)

En el panel "Ver canjes, recompensas y movimientos…" que ya existe, se reemplazan los textos fijos:

**Bloque "Canjes para usar ahora"** (solo los **Confirmados vigentes** del cliente; no se muestra ningún otro estado):

- Por canje: código, recompensa, puntos, "Vence en {n} min".
- Botones: **Registrar uso** y **Rechazar**.
- Vacío: "No tiene canjes para usar."

**Bloque "Recompensas a las que puede acceder"** (Activas cuyo puntaje alcanza con el saldo):

- Por recompensa: nombre, puntos y el botón **Canjear**.
- Canjear abre el mismo modal de 4.3, con el texto "Confirmá que el cliente acepta el canje." Al confirmar, pregunta: "¿Aplicar el canje ahora?" (No, después / Sí, aplicar). "Sí" sigue con 5.3.
- Vacío: "No tiene puntos suficientes para ninguna recompensa disponible."
- Con saldo negativo: "El cliente tiene un ajuste pendiente: no puede canjear."

### 5.2 Canjes por código (US-41) — sección propia del menú

- **Título:** "Canjes", subtítulo "Por código".
- Texto: "Usalo cuando el cliente solo presenta el código, sin buscarlo por documento."
- **Un único buscador:** "Código de canje" (acepta minúsculas y espacios; se normaliza) + botón **Buscar**.
- **Resultado:**
  - "Cliente": nombre y documento.
  - "Recompensa": nombre, puntos y estado del canje.
  - "Vence en {n} min".
  - Botones **Aplicar** y **Rechazar**, solo si está Confirmado.
- **Mensajes:**

| Caso | Mensaje |
|---|---|
| No existe | "Código no encontrado." |
| Ya no está Confirmado | "El canje ya está en estado "{estado}"." (sin botones) |
| Vencido al buscarlo o al aplicarlo | "El canje venció. El cliente tiene que pedirlo de nuevo." |

### 5.3 Aplicar / Registrar uso (US-42)

- **Diálogo:** "¿Registrar el uso del canje **{código}**? Entregá: **{recompensa}**. Se van a descontar {n} pts." Botones: Cancelar · Confirmar.
- **Resultado:** "Canje {código} utilizado. Entregar: {recompensa}." con la tarjeta "Puntos descontados: −{n} pts · Saldo: {antes} → {después} pts".
- **Errores al aplicar (validación real):**

| Caso | Mensaje |
|---|---|
| Saldo insuficiente | "El cliente no tiene saldo suficiente para este canje. Podés rechazarlo." (el canje sigue Confirmado) |
| Recompensa sin stock o no disponible | "La recompensa ya no está disponible. Podés rechazar el canje." |
| Vencido | "El canje venció. El cliente tiene que pedirlo de nuevo." |

### 5.4 Rechazar (US-43)

- **Modal:** "Rechazar canje {código}".
- **Motivos rápidos** (chips): "Sin insumo" · "El cliente desistió" · "El cliente no está" · "Otro".
- **Campo "Motivo (obligatorio)":** 5 a 500 caracteres. Errores: "El motivo es obligatorio." / "Indicá un motivo de al menos 5 caracteres."
- Botones: Volver · Rechazar. Mensaje: "Canje rechazado."

---

## 6. Vencimiento automático (US-44)

No tiene pantalla propia. En el prototipo se ve en:

- la cuenta regresiva (4.4 y 4.5);
- el estado "Vencido" en Mis canjes y en Canjes del Administrador;
- la fila de Auditoría "Venció canje" (Sistema);
- el mensaje al buscar o aplicar un canje vencido.

**Recompensa vencida:** el Sistema la pasa a Deshabilitada, se ve "Vencida" en el catálogo y se registra en la auditoría.

---

## 7. Checklist antes de terminar

- [ ] No queda ningún estado "Pendiente" ni texto de "reintegro" de puntos o stock.
- [ ] Ningún texto dice 30 minutos: todo es **15 minutos**.
- [ ] El botón visible es **"Eliminar"**, y el estado se llama **"Dada de baja"**.
- [ ] El Cajero ve en el panel del cliente **solo los canjes Confirmados vigentes**.
- [ ] Existen las dos formas de registrar el uso: desde el **buscador de clientes** (5.1) y desde **Canjes por código** (5.2).
- [ ] El Cliente no ve qué empleado resolvió un canje.
- [ ] Stock y vencimiento muestran "Sin límite" / "No vence" cuando están vacíos.
- [ ] Recompensas habilitado en el menú del Administrador y en el filtro de Auditoría.
- [ ] Cada pantalla nueva tiene su nota con la US y el RF.
