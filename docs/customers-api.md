# API de Clientes (customers) — guía para el frontend

Documento para quien integra el frontend con el backend de La Vitto. Describe cómo conectarse, qué
endpoints existen, qué se puede enviar, qué devuelve la API y qué reglas hay que respetar en las pantallas.

> **Estado:** implementado y verificado contra PostgreSQL (alta, búsqueda por documento y por nombre,
> modificación, baja, reactivación e historial). Cubre las historias de **Modificar cliente** y
> **Dar de baja cliente (RF-018)**.

---

## 1. Conexión

| | |
|---|---|
| **URL base** | `http://localhost:3000/api` (el puerto sale de `PORT` en `backend/.env`) |
| **Formato** | JSON. En `POST` y `PATCH` enviar `Content-Type: application/json` |
| **CORS** | Solo acepta el origen `http://localhost:5173` (Vite), con credenciales |
| **Autenticación** | **No hay.** Hoy cualquier request se acepta (ver sección 9) |

**Todas las rutas de este documento cuelgan de `/api`.** Ejemplo: `GET http://localhost:3000/api/customers`.

El frontend todavía no tiene proxy de Vite ni cliente HTTP. Hay que elegir una de estas dos opciones:

**Opción A — proxy de Vite (recomendada, evita CORS).** En `frontend/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
```

El frontend llama a rutas relativas: `fetch('/api/customers')`.

**Opción B — variable de entorno.** `VITE_API_URL=http://localhost:3000/api` y
`fetch(`${import.meta.env.VITE_API_URL}/customers`)`. Funciona porque el origen `5173` está permitido.

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
| `GET /customers/:id/status-history` | Historial de bajas y reactivaciones | 200 `CustomerStatusChange[]` | 400, 404 |
| `POST /customers` | Dar de alta | 201 `Customer` | 400, 409 |
| `PATCH /customers/:id` | Modificar datos | 200 `Customer` | 400, 404, 409 |
| `PATCH /customers/:id/deactivate` | Dar de baja (lógica) | **204 sin body** | 400, 404, 409 |
| `PATCH /customers/:id/activate` | Reactivar | **204 sin body** | 400, 404, 409 |

No existe un endpoint para borrar clientes: la baja es siempre lógica y el registro se conserva.

### 3.1 `GET /customers` — listado y búsqueda

Parámetros de la URL (todos opcionales):

| Parámetro | Regla | Por defecto |
|---|---|---|
| `page` | entero ≥ 1 | `1` |
| `limit` | entero de 1 a 100 | `20` |
| `active` | `true` o `false`. Si se omite, devuelve activos **e inactivos** | (todos) |
| `name` | texto de hasta 80 caracteres. Busca en nombre y apellido, sin distinguir mayúsculas. Cada palabra debe aparecer en el nombre o en el apellido: `?name=juan perez` encuentra a Juan Pérez | (sin filtro) |

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

### 3.5 `PATCH /customers/:id` — modificar

Se envía **solo lo que cambia** (cualquier subconjunto de los campos del alta):

```json
{ "phone": "(011) 4555-5555", "firstName": "Lucía Belén" }
```

- Hay que enviar **al menos un campo**. Un body `{}` devuelve 400.
- Para **borrar** un dato opcional se envía `null`: `{ "phone": null }` o `{ "dateOfBirth": null }`.
- `null` en un campo obligatorio (`firstName`, `lastName`, `documentType`, `documentNumber`, `email`) devuelve 400.
- Responde **200** con el cliente ya actualizado.
- Si el cliente está **inactivo** devuelve **409**: primero hay que reactivarlo.

### 3.6 `PATCH /customers/:id/deactivate` y `/activate`

Sin body. Responden **204 sin contenido**, así que el frontend debe actualizar su estado local o volver
a pedir el cliente. Dar de baja a un cliente ya inactivo (o reactivar a uno ya activo) devuelve **409**.

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

- **El documento identifica al cliente.** El par `documentType` + `documentNumber` es único: repetirlo devuelve **409**.
- **El email NO es único.** Dos clientes pueden compartir email.
- **Baja lógica.** Dar de baja no borra nada: el cliente pasa a `active: false`, se registra `deactivatedAt` y el registro conserva todos sus datos.
- **Un cliente inactivo sigue ocupando su documento.** Para volver a registrarlo hay que reactivarlo, no crear uno nuevo. El mensaje de error del 409 lo sugiere.
- **Un cliente inactivo no se puede modificar.** Hay que reactivarlo primero (409 si se intenta).
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
| **409** | Documento repetido; modificar un cliente inactivo; baja de un inactivo; reactivar un activo |
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

- **Caja / identificación:** un campo de DNI que llame a `GET /customers/by-document`. Si responde 404, ofrecer el alta. Si responde 200 con `active: false`, avisar que el cliente está dado de baja y ofrecer reactivarlo.
- **Listado:** pedir `?active=true` por defecto y un filtro para ver los inactivos. Buscador de texto con `name` (conviene esperar unos ms antes de pedir mientras se escribe).
- **Formulario de edición:** enviar solo los campos modificados. Deshabilitar la edición si `active` es `false` y mostrar el botón "Reactivar".
- **Baja y reactivación:** confirmar la acción, llamar al endpoint y, como responde 204, actualizar el cliente en pantalla (o volver a pedirlo).
- **Detalle del cliente:** mostrar `createdAt`, `deactivatedAt` y, opcionalmente, el historial de `status-history`.
- **Formularios:** validar en el cliente los largos y el formato del teléfono para dar feedback inmediato, pero mostrar siempre los errores que devuelve la API, que son la fuente de verdad.

---

## 8. Preguntas para cerrar entre backend, frontend y negocio

1. **Listado por defecto:** hoy, sin parámetros, devuelve activos e inactivos. ¿El frontend pide siempre `?active=true` o el backend debería filtrar por defecto?
2. **Cajero o cliente:** la historia de modificar dice "cajero o cliente". ¿El cliente edita sus propios datos? Si es así, hace falta autenticación y limitarlo a su propio registro.
3. **Documento de un cliente inactivo:** hoy impide crear otro cliente con ese documento (hay que reactivar). ¿Es lo que quieren?
4. **Modificar un inactivo:** hoy se bloquea (409). ¿Es el comportamiento esperado?
5. **Formato de teléfono:** se implementó 8 a 15 dígitos (con `+`, espacios, guiones y paréntesis). ¿Coincide con lo que usa el negocio?
6. **Búsqueda por nombre:** hoy no ignora tildes. ¿Hace falta que `lucia` encuentre a `Lucía`?

---

## 9. Limitaciones actuales

- **Sin autenticación ni roles:** no se identifica quién hace cada operación.
- **Sin borrado físico:** solo baja lógica.
- **CORS** solo permite `http://localhost:5173`. Para otro origen (por ejemplo, un deploy) hay que cambiarlo en el backend.
- **Sin documentación interactiva** (Swagger): este documento es la referencia.
- El `limit` máximo del listado es 100.
