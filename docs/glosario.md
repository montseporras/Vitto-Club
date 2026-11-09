# Glosario

Unifica los glosarios que estaban en `autenticacion.md` y `transacciones-y-eventos.md`.

## Negocio

| Término | Significado |
|---|---|
| Vitto Club | Plataforma de fidelización por puntos de La Vitto Comidas y Café |
| Administrador (`ADMIN`) | Rol de empleado con acceso a empleados, usuarios, clientes y configuración |
| Cajero (`CASHIER`) | Rol de empleado que opera la caja y gestiona clientes |
| Cliente (`CUSTOMER`) | Persona inscripta en el programa de puntos |
| Sistema | Actor de los procesos automáticos (vencimientos, rechazos automáticos). Aparece como "Sistema" en la auditoría y en "Realizado por". Nunca un cliente es actor |
| Baja lógica | El registro se conserva con `isActive = false` (o `status = DELETED` en recompensas); no se borra |
| ABMC | Alta, baja, modificación y consulta |
| Consumo (`Consumption`) | Lo que el cliente gasta en el local y el Cajero registra en caja. En pantalla se dice **Consumo, nunca "Compra"**. Código visible `C-000141`, derivado del id |
| Equivalencia | Cuántos puntos da cada monto base (por ejemplo, 10 pts cada $1.000). Los puntos se truncan |
| Bonificación por primer consumo | Puntos extra (porcentaje o fijos) en el primer consumo `REGISTERED` del cliente |
| Lote de puntos (`PointsLot`) | Puntos acreditados juntos, con su propio vencimiento. La Definición del Producto lo llama "Movimiento de puntos", y así quedó (D-36, 25/10). Estados: Vigente, Consumido, Vencido, Anulado |
| Movimiento de puntos (`PointsMovement`) | Cada suma o resta de puntos, con signo y saldo resultante: consumo, anulación, ajuste, vencimiento o canje. Solo inserción |
| FIFO | Al descontar puntos se usa primero el lote que vence antes |
| Saldo / deuda | Saldo = lo que queda en los lotes vigentes − deuda. La deuda nace al anular un consumo cuyos puntos ya se gastaron; el saldo puede quedar negativo |
| Puntos acumulados (`lifetimePoints`) | Consumos (con bonificación) menos anulaciones. Definen el nivel. Canjes, ajustes y vencimientos no los cambian |
| Nivel | Bronce, Plata u Oro según los puntos acumulados (por defecto 300 y 800). Se calcula, no se guarda |
| Ajuste de puntos | Suma o resta manual del Administrador, con motivo. Restar nunca deja el saldo negativo |
| Recompensa (`Reward`) | Lo que un cliente puede pedir a cambio de puntos. Puede tener stock y fecha de vencimiento. Estados: Activa, Deshabilitada, Inactiva, Dada de baja |
| Disponible | Una recompensa Activa, con stock (o sin límite) y sin vencer, según la fecha de hoy en Argentina. Se calcula con la fecha y no solo con el estado |
| Canje (`Redemption`) | El pedido de una recompensa. Nace **Confirmado**, dura 15 minutos y **no descuenta nada** hasta que se registra el uso. Estados: Confirmado, Utilizado, Rechazado, Cancelado, Vencido. No existe "Pendiente" |
| Código del canje | 6 caracteres sin 0, O, 1 ni I (por ejemplo `K7MP2X`), aleatorio y único. Lo presenta el cliente en la caja |
| Registrar uso | Lo que hace el Cajero cuando entrega la recompensa: recién ahí se descuentan los puntos y el stock |
| Snapshot | Copia de un dato en un momento: el consumo guarda la configuración usada y el canje, el nombre y los puntos de la recompensa al confirmar |
| Auditoría | Registro inalterable de quién hizo qué operación sensible. No registra sesiones, autorregistro, acciones del cliente sobre su perfil ni consultas |
| Hora de Argentina | UTC−03:00. Las fechas sin hora y los filtros por día se interpretan así; la pantalla muestra `dd/mm/aaaa hh:mm` |
| RF-010 / RF-014 / RF-018 / RF-064 / RF-065 | Requisitos funcionales referenciados en los docs: vigencia de puntos (12 meses por defecto), versionado de la configuración (y snapshots), baja de cliente, registro y perfil del Cliente. Los RF del Sprint 4 (RF-038 a RF-049) están en el contrato S4 §9. La lista completa de RF **no está en el repositorio** |
| US-xx / SCRUM-xxx | Historias de usuario y tickets de Jira. Desde el Sprint 3 el tablero del sprint es `docs/sprint-N/HISTORIAS_SPRINT_N.md`. Desde el Seguimiento v1.5 (25/10) la numeración es: US-56 registrar auditoría, US-57 consultar auditoría, US-58 autorregistro, US-59 perfil. Los contratos y las historias ya usan esta numeración (09/11) |
| BASE, BASE-4 | Ítems que no son historias del backlog: el modelo de datos y las piezas compartidas de cada sprint. Los hace una sola historia, para que no haya varias migraciones sobre las mismas tablas |
| PO | Product Owner |

## Cuentas y sesión

| Término | Significado |
|---|---|
| Cuenta (`Account`) | Credenciales de acceso: email, hash, rol, dueño (empleado o cliente) |
| Autenticación | Comprobar quién es el usuario (login) |
| Autorización | Decidir qué puede hacer (roles) |
| Sesión | Registro de que una cuenta inició sesión; una fila por sesión |
| Access token | Credencial de vida corta (JWT, 15 min) que acompaña cada pedido |
| Refresh token | Credencial aleatoria, en cookie `HttpOnly`, que sirve para pedir un access token nuevo |
| JWT | Formato de token con contenido legible y firma que impide alterarlo |
| Firma | Cálculo con el contenido y una clave secreta; prueba que el token no fue modificado |
| Hash | Transformación de una sola vía |
| Rotación | Reemplazar el refresh token por uno nuevo cada vez que se usa |
| Revocar | Invalidar una sesión antes de que venza |
| Vencimiento por inactividad | La sesión muere si no se usa por cierto tiempo |
| Vencimiento absoluto | La sesión muere después de cierto tiempo, se use o no |
| Guard | Pieza de Nest que decide si un pedido puede pasar a un endpoint |

## Arquitectura y datos

| Término | Significado |
|---|---|
| Puerto | Clase abstracta que dice qué se necesita, sin decir cómo se hace |
| Adaptador | La implementación concreta de un puerto |
| Monolito modular | Un solo despliegue dividido en módulos independientes por contexto de negocio |
| Transacción | Grupo de operaciones que la base trata como una sola |
| Commit / Rollback | Confirmar / deshacer todo lo hecho en la transacción |
| Atomicidad | Propiedad de "todo o nada" |
| Aislamiento | Los cambios no confirmados no se ven desde afuera |
| Transacción ambiente | Transacción que no se pasa por parámetro: está disponible para todo el código de esa operación |
| `AsyncLocalStorage` / CLS | Mecanismo de Node que guarda datos asociados a una operación asíncrona (CLS = *continuation-local storage*; no es CI) |
| Evento de dominio | Aviso de que algo pasó en un módulo, para que otros reaccionen |
| Publicar / emitir | Mandar el aviso |
| Listener | Código que escucha un aviso y reacciona |
| Dependencia circular | Dos módulos que se necesitan mutuamente |
| MSW | Mock Service Worker: simula la API en el frontend |
| Seed | Script que carga datos iniciales (administrador inicial y, opcional, datos de demo) |
| Cron | Proceso que corre solo en un horario (`@nestjs/schedule`). Hay tres: vencimiento de puntos, recompensas vencidas y canjes vencidos |
| Vencer al leer | Antes de responder, los endpoints de canjes vencen los Confirmados con más de 15 minutos, sin esperar al barrido |
| `FOR UPDATE` / `SKIP LOCKED` | Bloqueo de una fila dentro de la transacción. `SKIP LOCKED` saltea la fila si otro la tiene (lo usan los procesos automáticos) |
