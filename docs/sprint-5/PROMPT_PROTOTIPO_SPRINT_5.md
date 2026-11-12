# Prompt — Prototipo Sprint 5: Misiones, Notificaciones, Estadísticas y Fotos (Vitto Club)

> **Estado (12/11/2026): ya se aplicó.** El prototipo v2 (`docs/prototipo/v2/`) tiene las pantallas del Sprint 5
> y además los cambios hechos a mano el 11/11 y el 12/11 a pedido de Deni (contrato v3, S5-34 a S5-58). **Si
> alguna vez se vuelve a usar este prompt** (por ejemplo, para reexportar desde Claude Design), la **sección 8**
> pisa lo que digan las secciones 1 a 7.
>
> Copiá todo lo que está debajo de la línea y pegalo junto con el archivo HTML del prototipo.

---

## Contexto

Vas a modificar el **archivo HTML único del prototipo de Vitto Club** que te adjunto (plataforma de
fidelización de La Vitto Comidas y Café). **No crees un archivo nuevo ni uses Claude Design:** cambiá este mismo
archivo, con el mismo estilo, componentes, colores, tipografía, menús y forma de navegar que ya tiene.

**Reglas generales**

- No rompas ni cambies nada de lo que ya funciona (Clientes, Consumos, Puntos, Niveles, Auditoría, Mi perfil,
  Recompensas, Canjes, Canjes por código, etc.).
- Las pantallas de **Misiones, Estadísticas y Notificaciones** que ya existen son de la **primera versión** del
  prototipo: reemplazalas por lo que dice este prompt.
- Textos en castellano rioplatense ("Ingresá", "Tenés"). La vista del **Cliente** es para celular; las del
  **Cajero** y el **Administrador**, de escritorio.
- Números con puntos de miles (`1.200 pts`, `$ 20.000`), fechas `dd/mm/aaaa`, horas `hh:mm`, meses "Noviembre
  2026", en hora de Argentina.
- Donde hoy dice "Próximamente" o "Próx." para Misiones, Estadísticas, Notificaciones o la foto, reemplazalo
  por la pantalla real. **Ya no queda nada "Próximamente"** después de este sprint.
- Cada pantalla nueva lleva su nota/tooltip con la historia, **con esta numeración** (la vieja del prototipo
  está mal): US-14, US-15, US-28 a US-34, US-47 a US-55, FOTO-PERFIL, NIV-BEN, CTA-CLI.

**Historias que cubre:**

| US | Título | RF |
|---|---|---|
| US-14 | Configurar imagen y mensajes automáticos | RF-012 |
| US-15 | Configurar promociones especiales | RF-013 |
| US-28 | Crear misión mensual | RF-031 |
| US-29 | Editar / dar de baja misión | RF-032 |
| US-30 | Progreso y cumplimiento automático de misiones | RF-033 / RF-034 |
| US-31 | Reclamar recompensa de misión | RF-035 |
| US-32 | Vencer y reiniciar misiones | RF-036 |
| US-33 | Consultar misiones | RF-037 |
| US-34 | Imagen de la recompensa | RF-038 |
| US-47 | Notificar vencimiento de puntos | RF-050 |
| US-48 | Notificar cumpleaños | RF-051 |
| US-49 | Notificar promociones | RF-052 |
| US-50 | Notificar avance de misiones | RF-053 |
| US-51 | Estadísticas de clientes | RF-054 |
| US-52 | Estadísticas de consumos por período | RF-055 |
| US-53 | Estadísticas de puntos | RF-056 |
| US-54 | Estadísticas de niveles, misiones y recompensas | RF-057 |
| US-55 | Exportar reportes generados | RF-058 |
| FOTO-PERFIL | Foto de perfil del Cliente | RF-065 |
| NIV-BEN | Beneficios de los niveles | RF-029 |
| CTA-CLI | Cuenta de acceso del cliente | RF-08 |

---

## 1. Reglas de negocio que el prototipo tiene que respetar

### Misión mensual (por cliente)

| Estado (UI) | Cuándo |
|---|---|
| **En progreso** | Nace así cuando se le asigna la misión. Avanza con cada consumo que cumple la condición |
| **Completada** | Llegó al objetivo. Si la misión **no tiene recompensa**, se queda así (es final) |
| **Reclamada** | Reclamó la recompensa (botón "Reclamar recompensa"), o se reclamó sola a fin de mes |
| **Vencida** | Terminó el mes sin llegar al objetivo: la pierde |

- **Si la terminó, nunca pierde la recompensa:** a fin de mes, las Completadas sin reclamar se reclaman solas.
- Los puntos de una misión **no cuentan para el nivel**.
- El estado se llama **"En progreso"** (no "En curso"). La misión del catálogo no se "desactiva": se **elimina**.

### Misión (catálogo del Administrador)

- **Tipo de objetivo:** Cantidad de consumos, o Monto acumulado.
- **Objetivo:** un número (consumos) o un monto (pesos).
- **Condición (opcional):** días de la semana y franja horaria (por ejemplo, domingos de 09:00 a 13:00).
- **Recompensa:** puntos, **opcional** ("Sin recompensa").
- **Vigencia:** mes de inicio y mes de fin, o "Se repite todos los meses".
- Si se edita con clientes avanzando este mes, el objetivo y la recompensa nuevos rigen **desde el mes
  siguiente** (se avisa).
- Si se elimina: los que la tenían En progreso la pierden y los que la completaron reciben su recompensa (se
  avisa antes).

### Notificaciones

- Cuatro tipos: Vencimiento de puntos, Cumpleaños, Promociones y Misiones. Cada uno se activa o desactiva y
  tiene su asunto y su mensaje, con variables (`{nombre}`, `{puntos}`, `{fecha}`, `{mision}`, `{promocion}`,
  `{descripcion}`).
- Se envían **por correo**. Cada envío queda en el **historial** con fecha, tipo, cliente, destinatario y estado
  (Enviada, Falló, No enviada).
- El cumpleaños **regala puntos**: la cantidad se configura en Configuración → Notificaciones ("Puntos de regalo por cumpleaños", por defecto 100; 0 = solo el saludo). El mensaje usa `{puntos}`. Los puntos no cuentan para el nivel.

### Promociones

- Título, descripción, días, horario y vigencia. **No cambian los puntos**: se muestran al Cliente y se envían
  por correo.

### Fotos

- JPG, PNG o WebP, hasta 2 MB. Error: "Usá una imagen JPG, PNG o WebP de hasta 2 MB.".
- Recompensas, logo y foto de perfil del Cliente. Sin foto: imagen genérica (recompensas) o iniciales (perfil).

---

## 2. Datos de ejemplo

- Misiones: "Vení 3 veces este mes" (3 consumos, 50 pts, se repite), "Probá el brunch de domingo" (1 consumo,
  domingos 09:00–13:00, 100 pts), "Sumá $ 20.000" (monto, sin recompensa, solo noviembre).
- Una clienta con una misión En progreso (2 / 3), una Completada con recompensa (botón Reclamar), una
  Completada sin recompensa y, en octubre, una Vencida y una Reclamada.
- Niveles con beneficio: Bronce "Acumulación estándar de puntos", Plata "Postre gratis en tu cumpleaños",
  Oro "Café gratis una vez por semana".
- Dos promociones: "Pizza libre de los viernes" (viernes 20:00–23:30) y "Merienda buffet de los domingos"
  (domingos 16:00–19:00).
- Historial de notificaciones con al menos una de cada tipo y estado.

---

## 3. Pantallas del Administrador

### 3.1 Menú

"Misiones" y "Estadísticas y reportes" dejan de estar deshabilitados. En Configuración, "Notificaciones" deja
de estar deshabilitada y se agrega **"Promociones"**.

### 3.2 Misiones (US-28, US-29)

- Título "Misiones mensuales", buscador por nombre y filtro: En curso · Próximas · Finalizadas.
- Tabla: Nombre · Objetivo ("3 consumos", "$ 20.000 en consumos", más "los domingos de 09:00 a 13:00") ·
  Recompensa ("50 pts" / "Sin recompensa") · Vigencia ("Noviembre 2026 – Diciembre 2026" / "Desde noviembre
  2026") · Completadas este mes · Estado · chevron (›).
- **Sin botones en la fila:** un clic abre el modal. Debajo del título: "Hacé clic en una misión para editarla
  o eliminarla.". Botón "+ Crear misión mensual". Paginado de a 10. Vacío: "No hay misiones para los filtros
  seleccionados."

### 3.3 Modal Crear / Editar misión

Secciones **Misión** (Nombre, Descripción con contador n/255), **Objetivo** (Tipo de objetivo, Objetivo,
Días: "Todos los días" o elegir, Horario opcional "Desde / Hasta"), **Recompensa** (Puntos, casilla "Sin
recompensa"), **Vigencia** (Mes de inicio, Mes de fin, casilla "Se repite todos los meses"). Abajo: Eliminar
(solo al editar) · Cancelar · Guardar misión. Toast "Misión guardada.". Al editar con progreso, el aviso
"Los cambios del objetivo y la recompensa se aplican desde {mes}. Este mes sigue igual para los clientes."

### 3.4 Diálogo Eliminar misión

'¿Eliminar la misión "{nombre}"? Los clientes que la tienen en progreso este mes la pierden. Los que ya la
completaron reciben su recompensa.' · Cancelar · Eliminar.

### 3.5 Estadísticas y reportes (US-51 a US-55)

- Arriba: período con calendario (un día o un rango, como Canjes) y "Exportar reporte PDF".
- Cuatro bloques con tarjetas de totales y tablas (barras simples, sin gráficos complejos):
  - **Clientes:** Activos · Nuevos · "Frecuentes (al menos {n} consumos)", y una tabla por mes.
  - **Consumos:** total y monto; por día/semana/mes; por día de la semana; por franja horaria.
  - **Puntos:** Otorgados · Bonificación · Por misiones · Canjeados · Vencidos · Ajustes · Anulados.
  - **Programa:** clientes por nivel; por misión (asignadas, completadas, reclamadas, vencidas); las 10
    recompensas más canjeadas.

### 3.6 Configuración → Notificaciones (US-14, US-47 a US-50)

- Pestaña **Mensajes:** arriba el **logo** (vista previa, "Elegir imagen"); debajo "Puntos de regalo por cumpleaños" (número, por defecto 100); abajo una fila por tipo con el
  interruptor "Activa" y "Editar mensaje". Modal: Asunto · Mensaje · "Podés usar: {nombre}, …" · vista previa ·
  Cancelar · Guardar.
- Pestaña **Historial:** filtros Tipo, Estado, documento del cliente y fechas; columnas Fecha y hora · Tipo ·
  Cliente · Destinatario · Estado.

### 3.7 Configuración → Promociones (US-15, US-49)

Tabla Título · Días y horario · Vigencia · Último envío · Estado (Vigente / Próxima / Terminada). Modal con
Título, Descripción (n/500), Días, Horario, Desde, Hasta (o "Sin fecha de fin"). En cada promoción, botón
**"Enviar por correo"** con la confirmación '¿Enviar "{título}" a {n} clientes por correo?'.

### 3.8 Configuración → Puntos → Niveles (NIV-BEN)

Cada nivel suma el campo **"Beneficio"** (no "Observaciones"), opcional, hasta 255.

### 3.8b Configuración → Puntos → Clientes frecuentes (US-51)

Tarjeta nueva "Clientes frecuentes": "Un cliente es frecuente si tiene al menos {n} consumos en el período."
con el campo "Mínimo de consumos" (1 a 100, por defecto 3) y "Guardar cambios", como las otras tarjetas de
Puntos. En Auditoría: "Modificó cliente frecuente" (módulo Configuración).

### 3.9 Clientes → Ver más (CTA-CLI)

Sección nueva **"Cuenta de acceso"**: Email · Rol "Cliente" · Estado ("Activa" / "Dada de baja") · y, si
corresponde, "Contraseña inicial sin cambiar". Solo lectura.

### 3.10 Recompensas → modal (US-34)

"Foto que verán los clientes" deja de decir "Próximamente": vista previa, "Elegir imagen" y "Quitar". La foto
se ve en la tabla, el catálogo del Cliente, el mostrador y los canjes.

### 3.11 Ficha del cliente

Pestaña nueva **"Misiones"** (las del mes, con su progreso, sin botón de reclamo) y la foto del cliente junto al
nombre.

---

## 4. Pantallas del Cliente (celular)

### 4.1 Misiones (US-33, US-31)

Pestaña "Misiones" habilitada. Título "Misiones del mes" y "Termina el {día}". Una tarjeta por misión: nombre,
descripción, barra de progreso ("2 / 3 consumos" o "$ 12.000 / $ 20.000"), recompensa ("50 pts" o "Sin
recompensa"), estado y, si está Completada con recompensa, **"Reclamar recompensa"** (toast "¡Sumaste 50
pts!"). Selector "Meses anteriores" con las Vencidas y Reclamadas. Vacío: "No hay misiones este mes. ¡Volvé
pronto!".

### 4.2 Inicio

- Tarjeta **"Misiones"**: "{n} en progreso" y "Ver misiones".
- Tarjeta **"Promociones"**: la de hoy o la próxima.
- Debajo del nivel: "Tu beneficio: {texto}" y "Con {nivel siguiente}: {texto}".

### 4.3 Mi perfil (FOTO-PERFIL)

"Cambiar foto" habilitado (elegir, vista previa, "Quitar foto"). La foto se ve en el avatar del encabezado; sin
foto, las iniciales.

### 4.4 Historial de puntos

Nuevos tipos de movimiento: "Ganaste {n} pts por la misión {misión}" y "Te regalamos {n} pts por tu cumpleaños".

---

## 5. Pantallas del Cajero (y del Administrador en el mostrador)

- **Consumo registrado:** si el consumo completó una misión, el recuadro "¡{Nombre} completó la misión
  {misión}!" (como el de subida de nivel).
- **Tarjeta del cliente en Buscar cliente:** la foto y la línea "Misiones: {n} en progreso".

---

## 6. Procesos automáticos

- **Fin de mes (día 1, 00:10):** En progreso → Vencida; Completada con recompensa → Reclamada (la reclama el
  Sistema). En Auditoría: "Venció las misiones del mes" (actor Sistema).
- **Todos los días a las 09:00:** aviso de puntos por vencer (7 días antes) y saludo de cumpleaños con los puntos de regalo (en Auditoría: "Regaló puntos de cumpleaños", actor Sistema).
- **Al completar una misión:** correo "¡Completaste una misión!".

En Auditoría, habilitá el módulo **Misiones** con sus acciones y agregá las de Configuración "Modificó el logo y
los mensajes automáticos" y "Modificó las promociones".

---

## 7. Checklist antes de terminar

- [ ] No queda ningún "Próximamente" ni "Próx.".
- [ ] Las notas usan la numeración nueva (US-28 a US-33, US-47 a US-55, etc.).
- [ ] La misión del cliente usa "En progreso", "Completada", "Reclamada", "Vencida".
- [ ] Una misión sin recompensa queda "Completada" y no muestra "Reclamar".
- [ ] El cumpleaños muestra los puntos configurados (o solo el saludo si son 0).
- [ ] Las fotos validan tipo y tamaño con el mensaje del contrato.
- [ ] Lo que ya funcionaba sigue igual.
- [ ] Se aplicó la sección 8.

---

## 8. Cambios del 11/11 y el 12/11 (pisan las secciones anteriores)

Contrato v3, §8.3 (S5-34 a S5-58). El detalle de cada pantalla está en el contrato.

**Misiones** (§3.1)
- Filtro **Orden**: Más recientes (por defecto) · Más antiguas.
- Un clic en la fila abre el **detalle**: estado, descripción, Objetivo, Recompensa, Vigencia, Completadas este
  mes y "Clientes que la completaron" (Cliente · Documento · Completada · Estado, con "Falta reclamar", "Sin
  recompensa" o "Por el cliente / el sistema · {fecha}"). Botones Cerrar · Editar misión.
- Crear y editar en **dos pasos**: 1) Objetivo (con "Siguiente"); 2) Recompensa y vigencia (con "Atrás" y
  "Guardar misión").
- El **?** del tipo de objetivo muestra la explicación **al pasar el mouse** (no es un botón que despliega texto).
- Botón **"Quitar horario"** cuando hay alguna hora cargada.

**Recompensas:** filtro **Orden** (Más recientes · Más antiguas).

**Configuración → Notificaciones** (§3.6, §3.7, §3.8)
- **Sin logo.** Mensajes automáticos: solo Vencimiento de puntos, Cumpleaños y Misiones (sin Promociones).
- Tarjeta **"Promociones"** con "+ Enviar promoción": modal **vacío** con Asunto, Mensaje ({nombre}), **Cuándo**
  (Ahora / Programar con fecha y hora), **Destinatarios** (todos los clientes activos o un nivel, con "Le llega a
  {n} clientes activos.") y vista previa. Lista "Envíos programados" con "Cancelar envío". **No se guarda la
  promoción.**
- **Historial:** filtro Fechas de un solo campo con calendario (como Consumos) y botón **"Reenviar"** en las que
  fallaron.
- **No hay** Configuración → Promociones ni tarjeta de promociones en el Inicio del Cliente.

**Configuración → Puntos:** tarjetas más compactas.

**Panel del Administrador:** sin botón "Volver"; todos los modales con cruz.

**Cliente → Mis canjes:** "Día específico" y "Rango" pasan a "Elegir fechas" con el calendario de Consumos.

**Estadísticas y reportes** (§3.9.7, S5-51 a S5-55). Todo entra en la pantalla sin bajar.
- Arriba, compacto: título con la etiqueta "Período: {Mes año}", selectores **Mes** y **Año** y "Exportar reporte
  PDF".
- **Pestañas** Clientes · Consumos · Puntos · Programa a lo ancho, separadas por una línea fina, con ícono y un
  total cada una (activos, consumos, "+{acreditados}", misiones asignadas); se marcan al pasar el mouse.
- Paleta de la marca: `#a9532b`, `#4a2414`, `#8b3f22`, `#1b7f8c` (`#a3d2da`), `#d4ae3a`, `#e07a5f`,
  `#ffa47e` (`#f5c2a8`), `#8a7468`. La letra no cambia; todos los números con la misma letra. Gráficos con CSS.
- **Clientes:** sin gráficos. Tarjetas Clientes activos (Base vigente) · Clientes nuevos (Adquisición) ·
  Frecuentes (Fidelidad, con "≥ {n} consumos en el mes (mínimo configurable)"), y "Conversión de clientes nuevos
  · {Mes año}" con los 6 meses para elegir, "{%} llegaron a {n} consumos o más" y la aclaración en gris al pie.
- **Consumos:** tarjetas y los dos gráficos de columnas **lado a lado** (por día de la semana y por franja).
- **Puntos:** cuatro tarjetas con "▲/▼ {x,x} % vs. {mes}."; "De dónde salen los puntos" (Consumos y Puntos
  extra en barras, "No suma nivel") y "De los {n} acreditados…" (Saldo neto, Canjeados, Vencidos, Anulados).
- **Programa:** niveles y misiones arriba (con "Subieron de nivel", "Tasa de efectividad" y "Corte"),
  recompensas más canjeadas abajo a lo ancho.
- "Exportar reporte PDF" abre un **modal de secciones** (Clientes, Consumos, Puntos, Programa) con "Seleccionar
  todo" / "Deseleccionar todo".

**Todas las pantallas del Administrador** (S5-56 a S5-58)
- Mismo recuadro, título (20 px, negrita, `#5a2a14`), letra y tabla que **Auditoría**; el recuadro llega hasta
  abajo de la pantalla, con el mismo espacio abajo que arriba.
- Recompensas, Canjes, Misiones, Consumos y Auditoría: **las filas por página que entran en la pantalla**, con
  "Siguiente" siempre a la vista.
- La "Nota del prototipo" va **en el menú lateral**, plegada (con "Simular fin de mes" en Misiones), no abajo de
  la pantalla.

**Auditoría:** módulo Misiones habilitado; "Regaló puntos de cumpleaños" y "Modificó cliente frecuente"; **sin**
"Modificó las promociones". La acción de los mensajes se llama **"Modificó logo y mensajes"** (no "Modificó el
logo y los mensajes automáticos").

**Otros textos de las secciones 1 a 7 que ya no valen**
- US-14 se llama **"Configurar mensajes automáticos"** (el logo queda fijo).
- Los mensajes automáticos son **tres** (Vencimiento de puntos, Cumpleaños y Misiones): Promociones no tiene
  plantilla ni interruptor, y no existen las variables `{promocion}` ni `{descripcion}`. No hay promociones de
  ejemplo guardadas ni logo entre las fotos.
- Misiones, debajo del título: **"Hacé clic en una misión para ver su detalle y quiénes la completaron."**; el
  paginado es el que entra en la pantalla (no "de a 10").
- Cliente → Misiones, "Meses anteriores": las Vencidas, las Reclamadas y las Completadas sin recompensa.
- Estadísticas → Puntos, mes en curso: la variación se compara contra los **mismos días** del mes anterior
  (S5-52); en el prototipo es un dato de ejemplo.
