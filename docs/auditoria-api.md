# Integración frontend: auditoría

Este documento describe cómo consultar el listado de auditoría desde el frontend.
El endpoint es de solo lectura y requiere una sesión autenticada con rol `ADMIN`.

## Conexión local

1. Seguir los pasos de [levantar el proyecto](./levantar-el-proyecto.md) para arrancar
   PostgreSQL, backend y frontend.
2. En `backend/.env`, verificar `APP_ENV=develop` y que `DATABASE_URL` apunte a la base
   local de desarrollo.
3. Ejecutar una vez, desde `backend/`, `npm run db:audit:migrate:develop`. Esta migración
   explícita crea la tabla de auditoría; no forma parte de `prisma migrate deploy`.
4. En `frontend/.env.local`, poner `VITE_API_MOCKS=false` y arrancar/reiniciar Vite.

El frontend ya usa `VITE_API_URL` con valor por defecto `/api`, proxy de Vite a
`http://localhost:3000`, y un cliente HTTP con `withCredentials: true` y manejo de la
sesión. Por eso, para desarrollo local, no hace falta definir `VITE_API_URL` ni llamar
directamente al puerto del backend. El backend permite CORS para `http://localhost:5173`;
si el frontend se sirve desde otro origen, debe actualizarse la lista CORS en
`backend/src/main.ts`.

## Endpoint

```http
GET /api/auditoria
```

El cliente HTTP existente del frontend adjunta el access token en el header `Authorization`
para las llamadas protegidas. El token se obtiene del login; la llamada de renovación usa
la cookie httpOnly mediante `withCredentials`. La consulta está reservada a `ADMIN`: sin
autenticación responde `401`; con otro rol, `403`.

### Query parameters

Todos son opcionales salvo que se quiera limitar o paginar los resultados.

| Parámetro | Tipo / valores | Descripción |
|---|---|---|
| `performedBy` | string | Nombre del empleado/administrador que realizó la operación; la comparación no distingue mayúsculas. |
| `category` | `SESSION`, `CUSTOMERS`, `EMPLOYEES`, `CONFIGURATION` | Categoría de la acción. |
| `documentType` | `DNI`, `PASSPORT` | Tipo del documento del cliente afectado. |
| `documentNumber` | string | Número del documento. Se envía como texto para admitir documentos alfanuméricos. |
| `date` | `YYYY-MM-DD` | Día exacto, interpretado como día UTC completo. No combinar con `fromDate`/`toDate`. |
| `fromDate` | `YYYY-MM-DD` | Primer día del rango, inclusivo. |
| `toDate` | `YYYY-MM-DD` | Último día del rango, inclusivo. |
| `page` | entero >= 1 | Página; predeterminado `1`. |
| `limit` | entero de 1 a 100 | Tamaño de página; predeterminado `20`. |

Un rango con `fromDate` posterior a `toDate`, o combinar `date` con un rango, responde
`400 Bad Request`.

### Ejemplo con el cliente HTTP del frontend

Usar el cliente compartido conserva el manejo actual de autenticación, renovación de sesión
y cookies:

```ts
import { http } from '@/shared/api/http'

const response = await http.get('/auditoria', {
  params: {
    category: 'CUSTOMERS',
    documentType: 'DNI',
    documentNumber: '40123456',
    fromDate: '2026-10-01',
    toDate: '2026-10-09',
    page: 1,
    limit: 20,
  },
})
```

No enviar simultáneamente `date` y `fromDate`/`toDate`. Para una búsqueda sin filtros se
pueden omitir todos los parámetros; el backend devuelve la primera página de 20 registros.

### Respuesta paginada

```json
{
  "items": [
    {
      "id": 42,
      "createdAt": "2026-10-09T17:30:00.000Z",
      "performedBy": "Ana Gómez",
      "actorAccountId": 3,
      "category": "CUSTOMERS",
      "action": "Modificación de cliente",
      "documentType": "DNI",
      "documentNumber": "40123456",
      "details": {
        "customerId": 8,
        "fields": ["phone"]
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

`details` es JSON flexible y puede tener distintos campos según la operación. El frontend
debe tratarlo como datos específicos de cada acción, no asumir una forma uniforme. Si no
aplica documento o detalle, sus valores pueden ser `null`.

El endpoint no ofrece operaciones `POST`, `PUT`, `PATCH` ni `DELETE` para registros de
auditoría.
