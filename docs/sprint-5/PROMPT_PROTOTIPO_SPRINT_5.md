# Prompt — Prototipo Sprint 5: Misiones, Notificaciones, Estadísticas y Fotos (Vitto Club)

> **Cuándo se usa.** Después del Planning del Sprint 5, **con las PD del contrato ya decididas** (sobre todo
> PD-7 misiones, PD-8 promociones, PD-9 estadísticas y PD-12 foto de perfil). Si alguna cambió respecto de la
> propuesta, corregí este prompt antes de usarlo.
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
- El cumpleaños es **solo un saludo**: sacá "Te regalamos puntos extra".

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
  - **Clientes:** Activos · Nuevos · Frecuentes (3 o más consumos), y una tabla por mes.
  - **Consumos:** total y monto; por día/semana/mes; por día de la semana; por franja horaria.
  - **Puntos:** Otorgados · Bonificación · Por misiones · Canjeados · Vencidos · Ajustes · Anulados.
  - **Programa:** clientes por nivel; por misión (asignadas, completadas, reclamadas, vencidas); las 10
    recompensas más canjeadas.

### 3.6 Configuración → Notificaciones (US-14, US-47 a US-50)

- Pestaña **Mensajes:** arriba el **logo** (vista previa, "Elegir imagen"); abajo una fila por tipo con el
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

Nuevo tipo de movimiento: "Ganaste {n} pts por la misión {misión}".

---

## 5. Pantallas del Cajero (y del Administrador en el mostrador)

- **Consumo registrado:** si el consumo completó una misión, el recuadro "¡{Nombre} completó la misión
  {misión}!" (como el de subida de nivel).
- **Tarjeta del cliente en Buscar cliente:** la foto y la línea "Misiones: {n} en progreso".

---

## 6. Procesos automáticos

- **Fin de mes (día 1, 00:10):** En progreso → Vencida; Completada con recompensa → Reclamada (la reclama el
  Sistema). En Auditoría: "Venció las misiones del mes" (actor Sistema).
- **Todos los días a las 09:00:** aviso de puntos por vencer (7 días antes) y saludo de cumpleaños.
- **Al completar una misión:** correo "¡Completaste una misión!".

En Auditoría, habilitá el módulo **Misiones** con sus acciones y agregá las de Configuración "Modificó el logo y
los mensajes automáticos" y "Modificó las promociones".

---

## 7. Checklist antes de terminar

- [ ] No queda ningún "Próximamente" ni "Próx.".
- [ ] Las notas usan la numeración nueva (US-28 a US-33, US-47 a US-55, etc.).
- [ ] La misión del cliente usa "En progreso", "Completada", "Reclamada", "Vencida".
- [ ] Una misión sin recompensa queda "Completada" y no muestra "Reclamar".
- [ ] El cumpleaños no promete puntos.
- [ ] Las fotos validan tipo y tamaño con el mensaje del contrato.
- [ ] Lo que ya funcionaba sigue igual.
