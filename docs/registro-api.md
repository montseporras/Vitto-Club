# API de Registro de clientes — guía para el frontend

Documento para quien arma la pantalla "Registrarme" (SCRUM-160, RF-064). Describe qué se envía, qué
devuelve la API y cómo mostrar cada error.

> **Estado:** implementado y probado de punta a punta (registro real, contraseña hasheada de verdad y
> login posterior). Una sola parte depende de otro cambio: ver la sección 6.

---

## 1. Endpoint

| | |
|---|---|
| **Ruta** | `POST /api/auth/register` |
| **Autenticación** | **No hace falta**: es público (la persona todavía no tiene cuenta) |
| **Éxito** | `201 Created` |
| **Después** | **No inicia sesión.** El frontend llama a `POST /api/auth/login` con el email y la contraseña que la persona acaba de cargar (ver `docs/auth-api.md`) |

Crea **el cliente y su cuenta (rol Cliente) juntos**: si algo falla, no se crea ninguno de los dos.

---

## 2. Qué se envía

```ts
export interface RegisterCustomerRequest {
  firstName: string;                 // obligatorio, hasta 80 caracteres
  lastName: string;                  // obligatorio, hasta 80 caracteres
  documentType: 'DNI' | 'PASSPORT';  // obligatorio
  documentNumber: string;            // obligatorio, hasta 20 caracteres
  email: string;                     // obligatorio, hasta 150 caracteres
  password: string;                  // obligatoria, ver reglas abajo
  phone?: string | null;             // opcional
  dateOfBirth?: string | null;       // opcional, 'YYYY-MM-DD'
}
```

```json
{
  "firstName": "Lucía",
  "lastName": "Fernández",
  "documentType": "DNI",
  "documentNumber": "40.123.456",
  "email": "lucia@example.com",
  "password": "clave-de-lucia"
}
```

- Los datos del cliente siguen **las mismas reglas que el alta por caja** (formato de DNI y pasaporte,
  teléfono, fecha de nacimiento): ver `docs/customers-api.md`, sección 4.
- **Contraseña:** de 8 a 64 caracteres, **máximo 72 bytes** (las letras con tilde y la eñe ocupan 2) y
  **distinta del email**. No se normaliza: los espacios y las mayúsculas cuentan. Son las mismas reglas
  que para las cuentas de empleados (`docs/auth-api.md`).
- La **fotografía** todavía no se puede cargar (no hay dónde guardarla); se suma con "editar perfil".
- Cualquier campo que no esté en la lista (por ejemplo `role`) se rechaza con **400**.

---

## 3. Respuesta `201 Created`

```json
{
  "customerId": 12,
  "email": "lucia@example.com",
  "firstName": "Lucía",
  "lastName": "Fernández"
}
```

Sin tokens ni cookies. El email vuelve normalizado (en minúsculas y sin espacios): es el que hay que usar
para el login.

---

## 4. Errores

Tienen la misma forma que el resto de la API: `statusCode`, `error`, `message`, `path`, `timestamp` y, a
veces, `details` (`[{ field, message }]`) para marcar el campo en el formulario.

| Código | Cuándo | `details` |
|---|---|---|
| **400** | Falta un dato obligatorio, formato inválido, contraseña que no cumple las reglas, campo desconocido | En los errores de reglas (DNI, teléfono, contraseña), con el campo |
| **409** | El documento ya es de un cliente **activo** | `[{ field: "documentNumber", ... }]` |
| **409** | El email ya es de un cliente activo, de un empleado o de otra cuenta | `[{ field: "email", ... }]` |
| **409** | Dos registros simultáneos con los mismos datos (raro) | Sin `details` |
| **500** | Error inesperado | — |

**Mensajes del 409** (en español, para mostrarlos tal cual, decisión del PO):

- *"Ya hay un cliente registrado con ese documento (DNI). Ante cualquier duda, comunicate con el restaurante."*
  (con `PASSPORT` si el documento es un pasaporte)
- *"Ya hay una cuenta registrada con ese email. Ante cualquier duda, comunicate con el restaurante."*
- *"Esos datos ya están registrados. Ante cualquier duda, comunicate con el restaurante."*

Para saber qué campo marcar alcanza con el texto: el del email contiene la palabra `email`, y el del
documento el tipo (`DNI` o `PASSPORT`). El de dos registros simultáneos no nombra ninguno de los dos: va
como error general. También se puede usar `details[0].field`.

---

## 5. Reglas de negocio

- **Documento y email únicos entre los clientes activos.** Un cliente **dado de baja** perdió sus puntos
  y su cuenta, así que puede volver a registrarse: se crea un **cliente nuevo** y el anterior queda
  inactivo, con su historial (decisión del PO, 2026-10-08).
- **Un email, una cuenta.** El email tampoco puede ser el de un empleado.
- **El login es con email.** El documento queda para buscar al cliente en la caja.
- Si después el cajero cambia el email del cliente, el cliente pasa a entrar con el email nuevo.
- Un cliente dado de baja **no puede iniciar sesión** (el login responde 401).

---

## 6. Pendiente

- **Volver a registrarse después de una baja con el mismo email.** En `customers` ya funciona, pero la
  cuenta vieja todavía ocupa el email en la tabla de cuentas (`accounts.email` es único entre todas las
  cuentas). Hasta que llegue ese cambio (lo está haciendo el bloque de autenticación), ese caso responde
  **409**. El test e2e de este caso ya está escrito y saltado (`customer-registration.e2e-spec.ts`).
- **Validar el email** (por ejemplo, con un correo de confirmación): fuera de este sprint.
