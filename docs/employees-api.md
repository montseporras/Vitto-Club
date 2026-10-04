# API de Empleados (employees) — guía para el frontend

Documento para quien integra el frontend con el backend de La Vitto. Describe los endpoints del módulo
de empleados, qué se puede enviar, qué devuelve la API y qué reglas aplica.

> **Estado:** implementado el ABMC completo: **US-01 Registrar**, **US-02 Editar**, **US-03 Consultar** y
> **US-04 Dar de baja** empleado.

---

## 1. Conexión

| | |
|---|---|
| **URL base** | `http://localhost:3000/api` (el puerto sale de `PORT` en `backend/.env`) |
| **Formato** | JSON. En `POST` y `PATCH` enviar `Content-Type: application/json` |
| **CORS** | Solo acepta el origen `http://localhost:5173` (Vite) |
| **Autenticación** | **No hay** todavía |

La ruta es **`/api/empleados`** (en español) para respetar el contrato que ya usa el frontend
(`features/empleados/api/empleados.api.ts` y los handlers de MSW).

> El backend rechaza con **400** cualquier campo del body o parámetro de la URL que no esté documentado
> (`property foo should not exist`).

---

## 2. Tipos (TypeScript)

```ts
export type EmployeeRole = 'ADMIN' | 'CASHIER';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null; // null si se registró sin teléfono
  email: string;        // siempre en minúsculas
  role: EmployeeRole;
  isActive: boolean;
}
```

---

## 3. Registrar empleado (US-01)

`POST /api/empleados`

### Body

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `firstName` | string | Sí | No vacío (se recortan espacios), máximo 80 caracteres |
| `lastName` | string | Sí | No vacío (se recortan espacios), máximo 80 caracteres |
| `email` | string | Sí | Formato de email, máximo 150 caracteres. Se guarda en minúsculas y sin espacios |
| `role` | `'ADMIN' \| 'CASHIER'` | Sí | Solo esos dos valores |
| `phone` | string | No | Máximo 30 caracteres; dígitos, espacios, `+` (solo al inicio), `-`, `.`, `(` y `)`, con 8 a 15 dígitos. Vacío o ausente = sin teléfono |

```json
{
  "firstName": "Bruno",
  "lastName": "Pérez",
  "phone": "3510000002",
  "email": "bruno.perez@vitto.club",
  "role": "CASHIER"
}
```

### Respuesta `201 Created`

```json
{
  "id": 4,
  "firstName": "Bruno",
  "lastName": "Pérez",
  "phone": "3510000002",
  "email": "bruno.perez@vitto.club",
  "role": "CASHIER",
  "isActive": true
}
```

Todo empleado nuevo queda **activo** (`isActive: true`).

### Errores

| Código | Cuándo |
|---|---|
| `400` | Falta un campo obligatorio, formato inválido (email, rol, teléfono), texto demasiado largo o campo no permitido |
| `409` | Ya existe un empleado con ese email (sin distinguir mayúsculas), **incluso si está dado de baja** |
| `500` | Error inesperado (por ejemplo, base de datos caída). No expone detalles internos |

Formato del error:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Employee phone is invalid: use digits, spaces, \"+\", \"-\", \"(\" and \")\", with 8 to 15 digits",
  "path": "/api/empleados",
  "timestamp": "2026-09-27T12:00:00.000Z",
  "details": [{ "field": "phone", "message": "Employee phone is invalid: ..." }]
}
```

- Los errores de validación del body (ValidationPipe) llegan con `message` como **lista de textos** y sin `details`.
- Los errores de reglas de dominio llegan con `message` como texto y `details` indicando el campo.

---

## 4. Editar empleado (US-02)

`PATCH /api/empleados/:id`

Se envía el formulario **completo**: los datos enviados reemplazan a los actuales.

### Body

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `firstName` | string | Sí | Igual que en el alta |
| `lastName` | string | Sí | Igual que en el alta |
| `role` | `'ADMIN' \| 'CASHIER'` | Sí | Solo esos dos valores |
| `phone` | string \| null | No | Igual que en el alta. **Ausente, `null` o vacío = el empleado queda sin teléfono** |

**El email no se puede editar.** Si se envía `email` (o cualquier otro campo no listado, como `isActive`),
la API responde **400** (`property email should not exist`).

```json
{
  "firstName": "Bruno",
  "lastName": "Pérez",
  "phone": "3510000009",
  "role": "ADMIN"
}
```

### Respuesta `200 OK`

El empleado actualizado, con la misma forma que en el alta. `id`, `email` e `isActive` no cambian.

```json
{
  "id": 2,
  "firstName": "Bruno",
  "lastName": "Pérez",
  "phone": "3510000009",
  "email": "bruno.perez@vitto.club",
  "role": "ADMIN",
  "isActive": true
}
```

### Errores

| Código | Cuándo |
|---|---|
| `400` | `id` no numérico, falta un campo obligatorio, dato inválido o se envió un campo no permitido (por ejemplo `email`) |
| `404` | No existe un empleado con ese `id` |
| `409` | El empleado está dado de baja: no se puede editar. No se modifica nada |
| `500` | Error inesperado. No expone detalles internos |

Si algún dato es inválido, **no se guarda ningún cambio** (tampoco los campos válidos).

---

## 5. Consultar empleados (US-03)

### Listado

`GET /api/empleados`

Devuelve **siempre un array** de `Employee` (sin paginación), ordenado por apellido ascendente (a igual apellido, por nombre y después por `id`). Si no hay resultados,
devuelve `[]` con `200`.

| Parámetro | Valores | Efecto |
|---|---|---|
| _(ninguno)_ | | **Todos los empleados, activos e inactivos** |
| `active` | `true` \| `false` | Solo activos o solo inactivos |
| `name` | texto (máx. 80) | Busca en nombre y apellido sin distinguir mayúsculas. Con varias palabras, cada una debe aparecer en el nombre o en el apellido: `name=ana gomez` encuentra a "Ana Gómez" |

Los parámetros se pueden combinar: `GET /api/empleados?name=ana&active=true`. Un `name` vacío o con
solo espacios no filtra.

```json
[
  {
    "id": 1,
    "firstName": "Ana",
    "lastName": "Gómez",
    "phone": "3510000001",
    "email": "ana.gomez@vitto.club",
    "role": "ADMIN",
    "isActive": true
  }
]
```

| Código | Cuándo |
|---|---|
| `400` | `active` distinto de `true`/`false`, `name` demasiado largo o parámetro desconocido (por ejemplo `page`) |

### Un empleado

`GET /api/empleados/:id`

Devuelve el `Employee` (activo o inactivo).

| Código | Cuándo |
|---|---|
| `200` | El empleado existe |
| `400` | `id` no numérico |
| `404` | No existe un empleado con ese `id` |

---

## 6. Dar de baja empleado (US-04)

`DELETE /api/empleados/:id`

Es una **baja lógica**: el registro **no se borra**. El empleado pasa a `isActive: false` y se guarda la
fecha y hora de la baja (`deactivated_at` en la base; no se expone en la respuesta). El resto de los datos
(id, email, nombre, apellido, teléfono y rol) no cambia. No lleva body.

### Respuesta `200 OK`

El empleado dado de baja:

```json
{
  "id": 3,
  "firstName": "Carla",
  "lastName": "Martínez",
  "phone": "3510000003",
  "email": "carla.martinez@vitto.club",
  "role": "CASHIER",
  "isActive": false
}
```

### Errores

| Código | Cuándo |
|---|---|
| `400` | `id` no numérico |
| `404` | No existe un empleado con ese `id` |
| `409` | El empleado ya estaba dado de baja. No se modifica nada (se conserva la fecha de la baja original) |
| `500` | Error inesperado. No expone detalles internos |

### Qué pasa después de la baja

- Sigue apareciendo en `GET /api/empleados` (y en `?active=false`) y en `GET /api/empleados/:id`.
- No se puede editar: `PATCH` responde `409`.
- Su email no se puede usar para registrar otro empleado: `POST` responde `409`.
- Todavía no existe la reactivación.

---

## 7. Limitaciones conocidas

- **Teléfono opcional sin migración:** la columna `employees.phone` es `NOT NULL` en el schema. Mientras no
  se migre a opcional, un empleado sin teléfono se guarda con `''` en la base y la API lo devuelve como
  `null`. El frontend no necesita hacer nada distinto.
- **Unicidad del email a nivel aplicación:** el schema no tiene `@unique` en `email`. El backend verifica
  el duplicado antes de guardar, pero dos altas simultáneas con el mismo email podrían pasar ambas. Se
  resuelve agregando `@unique` con una migración, cuando el equipo lo decida.
- **La búsqueda por nombre no ignora acentos:** `name=gomez` no encuentra "Gómez" (sí `gómez` o `GÓMEZ`).
  Resolverlo requiere la extensión `unaccent` de PostgreSQL y una migración.
- **Bajas simultáneas:** si llegan dos `DELETE` al mismo tiempo para el mismo empleado, ambos pueden pasar
  la verificación de estado y el segundo sobrescribe la fecha de baja (mismo comportamiento que customers).
- **Sin protección del último administrador:** hoy se puede dar de baja a cualquier empleado, incluso al
  último `ADMIN` activo.
- **Sin autenticación ni roles:** hoy cualquiera puede registrar, editar, consultar y dar de baja empleados.
