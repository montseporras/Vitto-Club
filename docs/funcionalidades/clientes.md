# API de Clientes (customers) — guía para el frontend

Documento para quien integra el frontend con el backend de La Vitto. Describe cómo conectarse, qué
endpoints existen, qué se puede enviar, qué devuelve la API y qué reglas hay que respetar en las pantallas.

> **Estado:** implementado y verificado contra PostgreSQL (alta, búsqueda por documento y por nombre,
> modificación, baja e historial). Cubre las historias de **Modificar cliente** y
> **Dar de baja cliente (RF-018)**.
>
> **Este documento es del Sprint 1 y 2.** Se actualizó el 09/11/2026 con lo que cambió después, pero el
> detalle de cada cambio está en los contratos:
>
> | Cambio | Dónde está definido |
> |---|---|
> | Ya **no existe** `PATCH /customers/:id/activate` (no hay reactivación de clientes) | Contrato S3 §1 y §7 #5 |
> | `GET /customers`: `q`, `level`, `sort` y los campos `balance`, `lifetimePoints` y `level` en cada ítem | Contrato S3 §3.8.1 |
> | `PATCH /customers/:id`: `reason` obligatorio para el Administrador; `409 CUSTOMER_INACTIVE`; el documento no se edita (sin `FORBIDDEN_FIELD`: se borró el 14/11) | Contrato S3 §3.8.2; decisión D-03 (25/10): nadie edita el documento. El backend lo cumple desde el 09/11: `UpdateCustomerDto` ya no acepta el documento |
> | `POST /customers` crea también la cuenta del cliente (contraseña inicial = documento) | Contrato S3 §3.11.3 |
> | La baja devuelve el saldo perdido a la auditoría y **rechaza los canjes Confirmados** del cliente | Contrato S3 §3.8.3 y S4 §3.13.1 |
> | `PATCH /customers/:id` y `…/deactivate`: **solo el Administrador** (D-02, 25/10) | Contrato S4 §4. Cumplido en el backend desde el 09/11 |
> | `GET /customers`: filtro por `documentType` y `documentNumber` (CLI-DOC) | Contrato S4 §3.13.4. Cumplido en el backend desde el 09/11 (`q` junto con `documentNumber` → `400`) |
> | `GET`/`PATCH /customers/me` y `GET /customers/me/puntos` (vista del Cliente) | Contrato S3 §3.10 |
> | Puntos, consumos, movimientos y canjes de un cliente (`/customers/:id/...`) | Contratos S3 §3.2 a §3.6 y S4 §3.7 y §3.12 |

---

## 1. Conexión

| | |
|---|---|
| **URL base** | `http://localhost:3000/api` (el puerto sale de `PORT` en `backend/.env`) |
| **Formato** | JSON. En `POST` y `PATCH` enviar `Content-Type: application/json` |
| **CORS** | Acepta los orígenes de la variable `CORS_ORIGIN` (separados por coma); sin la variable, solo `http://localhost:5173` (Vite). Con credenciales |
| **Autenticación** | **Obligatoria**: `Authorization: Bearer <accessToken>`. Pueden usar este módulo el **Administrador** y el **Cajero**; el Cliente recibe 403. Sin token, 401. Ver `docs/funcionalidades/autenticacion.md` |

**Todas las rutas de este documento cuelgan de `/api`.** Ejemplo: `GET http://localhost:3000/api/customers`.

El frontend usa una sola instancia de Axios (`frontend/src/shared/api/http.ts`) y el proxy de Vite. Ver
[SETUP](../SETUP.md) §3.

> El backend rechaza con **400** cualquier campo del body o parámetro de la URL que no esté documentado
> (`property foo should not exist`). No enviar parámetros extra (por ejemplo, para evitar caché).

---

## 2. Tipos (TypeScript)

```ts
export type DocumentType = 'DNI' | 'PASSPORT';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;   // 'YYYY-MM-DD'
  active: boolean;              // se llama `active`, no `isActive`
  deactivatedAt: string | null; // fecha ISO de la última baja; null si está activo
  createdAt: string;            // fecha ISO
}

export interface CustomerList {
  items: Customer[];
  total: number;                // total de resultados (no solo los de la página)
  page: number;
  limit: number;
}

export interface CustomerStatusChange {
  id: number;
  action: 'DEACTIVATED' | 'ACTIVATED';
  createdAt: string;            // fecha ISO
}

export interface ApiError {
  statusCode: number;
  error: string;                // 'Bad Request', 'Not Found', 'Conflict', ...
  message: string | string[];   // ¡puede ser un string o un arreglo!
  path: string;
  timestamp: string;
  details?: { field: string; message: string }[];
}
```

Ejemplo de cliente devuelto por la API:

```json
{
  "id": 1,
  "firstName": "Prueba",
  "lastName": "Test",
  "documentType": "DNI",
  "documentNumber": "00000001",
  "email": "prueba@example.com",
  "phone": "+54 11 5555-5555",
  "dateOfBirth": null,
  "active": true,
  "deactivatedAt": null,
  "createdAt": "2026-09-22T00:46:42.745Z"
}
```

---

## 3. Endpoints

| Método y ruta | Para qué | Éxito | Errores posibles |
|---|---|---|---|
| `GET /customers` | Listar y buscar (paginado) | 200 `CustomerList` | 400 |
| `GET /customers/by-document` | **Identificar al cliente en la caja** por su documento | 200 `Customer` | 400, 404 |
| `GET /customers/:id` | Traer un cliente por id | 200 `Customer` | 400, 404 |
| `GET /customers/:id/status-history` | Historial de bajas (no tiene pantalla, D-18) | 200 `CustomerStatusChange[]` | 400, 404 |
| `POST /customers` | Dar de alta (con su cuenta) | 201 `Customer` | 400, 409 |
| `PATCH /customers/:id` | Modificar datos | 200 `Customer` | 400, 403, 404, 409 |
| `PATCH /customers/:id/deactivate` | Dar de baja (lógica) | **204 sin body** | 400, 404, 409 |

`PATCH /customers/:id/activate` **se eliminó** en el Sprint 3: no hay reactivación de clientes.

No existe un endpoint para borrar clientes: la baja es siempre lógica y el registro se conserva.

### 3.1 `GET /customers` — listado y búsqueda

Parámetros de la URL (todos opcionales):

| Parámetro | Regla | Por defecto |
|---|---|---|
| `page` | entero ≥ 1 | `1` |
| `limit` | entero de 1 a 100 | `20` |
| `active` | `true` o `false`. Si se omite, devuelve activos **e inactivos** | (todos) |
| `name` | texto de hasta 80 caracteres. Busca en nombre y apellido, sin distinguir mayúsculas. Cada palabra debe aparecer en el nombre o en el apellido: `?name=juan perez` encuentra a Juan Pérez | (sin filtro) |
| `q`, `level`, `sort` | Sprint 3: apellido, nombre o documento; nivel; orden por apellido. `q` junto con `name` → `400` (S3-13). Ver contrato S3 §3.8.1 | — |

Ejemplos:

```
GET /api/customers?active=true
GET /api/customers?active=true&name=juan&page=1&limit=20
```

Los resultados vienen ordenados por `id` ascendente. La búsqueda por nombre **no ignora tildes**
(`lucia` no encuentra a `Lucía`).

### 3.2 `GET /customers/by-document` — identificar en la caja

| Parámetro | Regla |
|---|---|
| `documentType` | `DNI` o `PASSPORT`. Opcional, si se omite se asume `DNI` |
| `documentNumber` | Obligatorio, hasta 30 caracteres. Se normaliza igual que al guardar, así que `40.123.456` y `40123456` encuentran al mismo cliente |

```
GET /api/customers/by-document?documentType=DNI&documentNumber=40.123.456
```

- **200:** devuelve el cliente. **También devuelve clientes inactivos**: hay que revisar `active`.
  Si hay varios clientes con ese documento (como mucho uno activo, ver sección 5), devuelve
  **el activo**; si ninguno está activo, el inactivo más reciente.
- **404:** no existe un cliente con ese documento (la pantalla puede ofrecer dar de alta).

### 3.3 `GET /customers/:id/status-history`

Devuelve un arreglo, con el cambio más reciente primero:

```json
[
  { "id": 2, "action": "ACTIVATED",   "createdAt": "2026-09-22T00:46:42.946Z" },
  { "id": 1, "action": "DEACTIVATED", "createdAt": "2026-09-22T00:46:42.912Z" }
]
```

Un cliente que nunca cambió de estado devuelve `[]`. Al reactivar, `deactivatedAt` del cliente vuelve a
`null`, pero las bajas anteriores quedan en este historial.

### 3.4 `POST /customers` — alta

```json
{
  "firstName": "Lucía",
  "lastName": "Fernández",
  "documentType": "DNI",
  "documentNumber": "40123456",
  "email": "lucia@example.com",
  "phone": "+54 11 5555-5555",
  "dateOfBirth": "1998-05-14"
}
```

`phone` y `dateOfBirth` se pueden omitir. Responde **201** con el cliente creado (con su `id`).

Responde **409** si otro cliente **activo** ya tiene ese documento o ese email. Los clientes dados de
baja no cuentan: si el documento o el email eran de un cliente inactivo, se crea un cliente nuevo.

### 3.5 `PATCH /customers/:id` — modificar

Se envía **solo lo que cambia** (cualquier subconjunto de los campos del alta):

```json
{ "phone": "(011) 4555-5555", "firstName": "Lucía Belén" }
```

- Hay que enviar **al menos un campo**. Un body `{}` devuelve 400.
- Para **borrar** un dato opcional se envía `null`: `{ "phone": null }` o `{ "dateOfBirth": null }`.
- `null` en un campo obligatorio (`firstName`, `lastName`, `documentType`, `documentNumber`, `email`) devuelve 400.
- Responde **200** con el cliente ya actualizado.
- Si el cliente está **inactivo** devuelve **409 `CUSTOMER_INACTIVE`** ("El cliente está dado de baja."). No
  hay reactivación.
- Si el nuevo documento o el nuevo email ya los tiene otro cliente **activo**, devuelve **409**.
- Si el cliente tiene cuenta, cambiar su email cambia también **su email de acceso** (inicia sesión con
  el nuevo). Si ese email ya lo usa otra cuenta (de un empleado o de otro cliente), devuelve **409** y
  no se modifica nada.
  Reenviar el propio email, aunque cambien mayúsculas o espacios, no es un cambio.

### 3.6 `PATCH /customers/:id/deactivate`

Sin body. Responde **204 sin contenido**, así que el frontend debe actualizar su estado local o volver
a pedir el cliente. Dar de baja a un cliente ya inactivo devuelve **409**.

En la misma transacción: deja inactiva la cuenta del cliente y cierra sus sesiones (`accounts`), y
rechaza sus canjes Confirmados vigentes como Sistema, con el motivo "Cliente dado de baja"
(`redemptions`). La auditoría `CUSTOMER_DEACTIVATED` guarda el "Saldo perdido" y, si hubo, "Canjes
rechazados: {n}".

---

## 4. Reglas de los campos

| Campo | ¿Obligatorio? | Regla |
|---|---|---|
| `firstName` | Sí | Texto, hasta 80 caracteres, no vacío |
| `lastName` | Sí | Texto, hasta 80 caracteres, no vacío |
| `documentType` | Sí | `"DNI"` o `"PASSPORT"` |
| `documentNumber` | Sí | Hasta 20 caracteres, no vacío |
| `email` | **Sí** | Formato de email válido, hasta 150 caracteres, sin espacios al principio ni al final |
| `phone` | No | Hasta 30 caracteres. Solo dígitos, espacios, `-`, `.`, paréntesis y un `+` inicial, con **8 a 15 dígitos** |
| `dateOfBirth` | No | Formato `YYYY-MM-DD`. No puede ser una fecha futura |

Teléfonos válidos: `1155555555`, `+54 11 5555-5555`, `(011) 4555-5555`.
Inválidos: `abc`, `12345` (muy corto), `11+55555555` (`+` en el medio).

### Lo que el servidor normaliza
La pantalla debe mostrar **el valor que devuelve la API**, no el que escribió el usuario:

- `documentNumber`: se guarda sin puntos, espacios ni guiones y en mayúsculas (`12.345.678` → `12345678`, `ab-123 456` → `AB123456`).
- `email`: se guarda en minúsculas.
- Todos los textos se guardan sin espacios al principio y al final. Un `phone` en blanco se guarda como `null`.

---

## 5. Reglas de negocio

- **El documento identifica al cliente.** El par `documentType` + `documentNumber` es único entre los clientes **activos**: repetirlo devuelve **409**.
- **El email también es único entre los clientes activos**, sin distinguir mayúsculas (se guarda en
  minúsculas). Repetirlo devuelve **409**. Además se valida contra empleados: crear o editar un
  cliente con el email de un empleado existente también responde **409** (ver
  `docs/seguimiento/historico/accounts-abmc-status.md`, sección "Unicidad global de email").
- **Baja lógica.** Dar de baja no borra nada: el cliente pasa a `active: false`, se registra `deactivatedAt` y el registro conserva todos sus datos.
- **Los clientes inactivos no cuentan para la unicidad.** Un cliente dado de baja perdió sus puntos y
  su cuenta anterior, así que su documento y su email quedan libres: si vuelve a inscribirse, se crea un
  **cliente nuevo**. Por eso puede haber varios clientes con el mismo documento, pero como mucho uno activo.
- **Un cliente inactivo no se puede modificar** (409 `CUSTOMER_INACTIVE`). No hay reactivación: si vuelve,
  se inscribe como cliente nuevo.
- **Listado.** Por defecto incluye activos e inactivos. Para el listado "del programa activo" el frontend debe pedir `?active=true`.

---

## 6. Errores

Todos los errores tienen esta base: `statusCode`, `error`, `message`, `path` y `timestamp`. **`message` puede
ser un string o un arreglo de strings** según el origen, así que el frontend debe manejar ambos casos.

**a) Errores de validación de formato (400) — `message` es un arreglo, sin `details`:**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be an email", "email should not be empty"],
  "path": "/api/customers/1",
  "timestamp": "2026-09-22T00:46:42.849Z"
}
```

**b) Errores de reglas del dominio (400) — `message` es un string y trae `details`:**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Customer phone is invalid: use digits, spaces, \"+\", \"-\", \"(\" and \")\", with 8 to 15 digits",
  "details": [{ "field": "phone", "message": "Customer phone is invalid: ..." }],
  "path": "/api/customers/1",
  "timestamp": "2026-09-22T00:46:42.875Z"
}
```

**c) 404 y 409 — `message` es un string, sin `details`:**

```json
{ "statusCode": 409, "error": "Conflict", "message": "Customer with ID 1 is already inactive", "path": "...", "timestamp": "..." }
```

**d) 500 — error inesperado.** El mensaje es siempre genérico: `"Unexpected error."`.

| Código | Cuándo |
|---|---|
| **400** | Datos inválidos (formato, largo, teléfono, email, fecha futura), body vacío en un PATCH, campo desconocido, `id` no numérico, parámetro de la URL inválido |
| **404** | El cliente no existe (por `id` o por documento) |
| **409** | Documento o email en uso por otro cliente activo (alta o modificación); modificar un cliente inactivo; baja de un inactivo; reactivar un activo |
| **500** | Error inesperado del servidor (por ejemplo, la base de datos no responde) |

Ejemplo de helper para mostrar errores en pantalla:

```ts
export function errorMessages(e: ApiError): string[] {
  return Array.isArray(e.message) ? e.message : [e.message];
}

// Errores por campo (solo vienen en los errores de dominio, ver 6.b)
export function fieldErrors(e: ApiError): Record<string, string> {
  return Object.fromEntries((e.details ?? []).map((d) => [d.field, d.message]));
}
```

---

## 7. Sugerencias para las pantallas

> Las pantallas reales siguen el prototipo v2 y los contratos del Sprint 3 (§3.1.1, §3.8) y del Sprint 4
> (§3.13). Estas sugerencias son las originales del Sprint 1, corregidas.

- **Caja / identificación:** un campo de documento que llame a `GET /customers/by-document`. Si responde
  404, o el cliente está dado de baja, se trata como no encontrado y se ofrece "Registrar cliente"
  (contrato S3 §3.1.1).
- **Listado (Administrador):** buscador con debounce de 300 ms y paginador "Página X de Y" (S3-20).
- **Formulario de edición:** enviar solo los campos modificados. El documento se muestra bloqueado.
- **Baja:** confirmar la acción, llamar al endpoint y, como responde 204, actualizar el cliente en
  pantalla (o volver a pedirlo).
- **Detalle del cliente:** mostrar `createdAt`, `deactivatedAt` y, opcionalmente, el historial de `status-history`.
- **Formularios:** validar en el cliente los largos y el formato del teléfono para dar feedback inmediato, pero mostrar siempre los errores que devuelve la API, que son la fuente de verdad.

---

## 8. Preguntas para cerrar entre backend, frontend y negocio

1. **Listado por defecto:** hoy, sin parámetros, devuelve activos e inactivos. ¿El frontend pide siempre `?active=true` o el backend debería filtrar por defecto?
2. ~~**Cajero o cliente**~~ — decidido: el Cliente edita su teléfono, correo y fecha de nacimiento desde
   Mi perfil (`PATCH /customers/me`, contrato S3 §3.10.4). No edita nombre, apellido ni documento.
3. ~~**Documento de un cliente inactivo**~~ — decidido por el PO (2026-10-08): un cliente dado de baja no ocupa su documento ni su email; si vuelve, se inscribe como un cliente nuevo.
4. ~~**Modificar un inactivo**~~ — decidido: `409 CUSTOMER_INACTIVE` (S3-12).
5. **Formato de teléfono:** se implementó 8 a 15 dígitos (con `+`, espacios, guiones y paréntesis). ¿Coincide con lo que usa el negocio?
6. **Búsqueda por nombre:** hoy no ignora tildes. ¿Hace falta que `lucia` encuentre a `Lucía`?

---

## 9. Limitaciones actuales

- El alta, la edición y la baja se auditan (`CUSTOMER_CREATED`, `CUSTOMER_UPDATED`,
  `CUSTOMER_DEACTIVATED`; contrato S3 §3.9.3).
- **Sin borrado físico:** solo baja lógica.
- **CORS** permite los orígenes de `CORS_ORIGIN` (por defecto, solo `http://localhost:5173`). Para un deploy, se agrega el origen del frontend en esa variable, sin tocar el código.
- **Sin documentación interactiva** (Swagger): este documento es la referencia.
- El `limit` máximo del listado es 100.
