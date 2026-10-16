# Glosario

Unifica los glosarios que estaban en `autenticacion.md` y `transacciones-y-eventos.md`.

## Negocio

| Término | Significado |
|---|---|
| Vitto Club | Plataforma de fidelización por puntos de La Vitto Comidas y Café |
| Administrador (`ADMIN`) | Rol de empleado con acceso a empleados, usuarios, clientes y configuración |
| Cajero (`CASHIER`) | Rol de empleado que opera la caja y gestiona clientes |
| Cliente (`CUSTOMER`) | Persona inscripta en el programa de puntos |
| Baja lógica | El registro se conserva con `isActive = false`; no se borra |
| ABMC | Alta, baja, modificación y consulta |
| RF-010 / RF-014 / RF-018 / RF-064 | Requisitos funcionales referenciados en los docs: vigencia de puntos (12 meses por defecto), versionado de la configuración, baja de cliente y registro. La lista completa de RF **no está en el repositorio** |
| US-xx / SCRUM-xxx | Historias de usuario y tickets de Jira |
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
